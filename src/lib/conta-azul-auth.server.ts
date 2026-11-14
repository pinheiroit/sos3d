import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import type { Database } from '@/integrations/supabase/types'
import { assertAdmin, adminClient } from './admin-guard.server'
import { contaAzulRedirectUri, hashOAuthState, validStateFormat } from './conta-azul-oauth'

export const contaAzulCodeSchema = z.object({
  code: z.string().trim().min(1).max(4096),
  redirect_uri: z.string().url().refine(value => {
    const url = new URL(value)
    return url.protocol === 'https:' && url.hostname === 'sos3d.com.br' && !url.username && !url.password && !url.port && !url.hash
  }, 'Use a URL HTTPS oficial cadastrada na Conta Azul.'),
})

export class ContaAzulAuthError extends Error {
  constructor(public status: number, message: string) { super(message) }
}

type StoredTokens = { id: string; access_token: string; refresh_token: string; expires_at: string; updated_at: string }
const accountId = '00000000-0000-4000-8000-000000000001'
const tokenSchema = z.object({ access_token: z.string().min(1), refresh_token: z.string().min(1), expires_in: z.number().int().positive().max(31536000) })

/** No credentials or provider response bodies may escape this helper. */
export async function exchangeContaAzulCode(input: z.infer<typeof contaAzulCodeSchema>, dependencies: {
  clientId: string; clientSecret: string; fetcher: typeof fetch;
  save: (row: StoredTokens) => Promise<void>; now: () => number;
}) {
  const parsed = contaAzulCodeSchema.parse(input)
  let response: Response
  try {
    response = await dependencies.fetcher('https://api-v2.contaazul.com/oauth/token', {
      method: 'POST',
      headers: { Authorization: `Basic ${btoa(`${dependencies.clientId}:${dependencies.clientSecret}`)}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'authorization_code', code: parsed.code, redirect_uri: parsed.redirect_uri }).toString(),
      signal: AbortSignal.timeout(20000),
      // Workers support manual/follow; manual also prevents forwarding Basic credentials.
      redirect: 'manual',
    })
  } catch (error) {
    // Allowlisted categories only: messages/stacks may contain credentials or codes.
    const category = error instanceof Error && ['TimeoutError', 'AbortError', 'TypeError'].includes(error.name) ? error.name : 'NetworkError'
    console.error(`Conta Azul OAuth transport failed [${category}]`)
    throw new ContaAzulAuthError(502, 'Não foi possível comunicar com a Conta Azul. Solicite um novo código antes de tentar novamente.')
  }
  if (!response.ok) {
    // OAuth errors can echo codes or credentials; never log or return raw bodies.
    console.error(`Conta Azul OAuth failed [${response.status}]`)
    throw new ContaAzulAuthError(502, `Conta Azul recusou a autorização (HTTP ${response.status}). Confira as credenciais, a URL de redirecionamento e solicite um novo código.`)
  }
  let payload: unknown
  try { payload = await response.json() } catch { throw new ContaAzulAuthError(502, 'Resposta inválida da Conta Azul.') }
  const tokens = tokenSchema.safeParse(payload)
  if (!tokens.success) throw new ContaAzulAuthError(502, 'A Conta Azul não retornou os tokens e a validade esperados.')
  const now = dependencies.now()
  const expiresAt = new Date(now + tokens.data.expires_in * 1000).toISOString()
  try {
    await dependencies.save({ id: accountId, access_token: tokens.data.access_token, refresh_token: tokens.data.refresh_token, expires_at: expiresAt, updated_at: new Date(now).toISOString() })
  } catch { throw new ContaAzulAuthError(500, 'Não foi possível salvar a autorização. Solicite um novo código para tentar novamente.') }
  return { connected: true, expires_at: expiresAt }
}

export async function handleContaAzulAuth(request: Request): Promise<Response> {
  const json = (body: object, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
  const bearer = request.headers.get('Authorization')
  if (!bearer?.startsWith('Bearer ')) return json({ error: 'Autenticação obrigatória.' }, 401)
  const origin = request.headers.get('Origin')
  if (origin && origin !== new URL(request.url).origin) return json({ error: 'Origem não permitida.' }, 403)
  const url = process.env['SUPABASE_URL']
  const key = process.env['SUPABASE_PUBLISHABLE_KEY']
  if (!url || !key) return json({ error: 'Serviço de autenticação indisponível.' }, 503)
  try {
    const userDb = createClient<Database>(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: bearer } },
    })
    const { data, error } = await userDb.auth.getUser(bearer.slice(7))
    if (error || !data.user) return json({ error: 'Sessão inválida.' }, 401)
    try { await assertAdmin(userDb, data.user.id) } catch { return json({ error: 'Acesso restrito a administradores.' }, 403) }
    const clientId = process.env['CONTA_AZUL_CLIENT_ID']
    const clientSecret = process.env['CONTA_AZUL_CLIENT_SECRET']
    if (!clientId || !clientSecret) return json({ error: 'Configure as credenciais da Conta Azul.' }, 503)
    let body: unknown
    try { body = await request.json() } catch { return json({ error: 'Envie um corpo JSON válido.' }, 400) }
    const input = contaAzulCodeSchema.safeParse(body)
    if (!input.success) return json({ error: 'Informe code e redirect_uri HTTPS do domínio sos3d.com.br, idêntica à cadastrada na Conta Azul.' }, 400)
    const state = typeof body === 'object' && body !== null && 'state' in body && typeof body.state === 'string' ? body.state : ''
    const invalidState = () => json({ error: 'Autorização expirada ou inválida. Inicie a conexão novamente em Integrações.' }, 400)
    if (input.data.redirect_uri !== contaAzulRedirectUri || !validStateFormat(state)) return invalidState()
    const db = await adminClient()
    // Single use: the state row is consumed before the code exchange, bound to this administrator.
    const { data: consumed, error: stateError } = await db.from('conta_azul_oauth_states').delete().eq('state_hash', await hashOAuthState(state)).eq('user_id', data.user.id).gt('expires_at', new Date().toISOString()).select('state_hash')
    if (stateError) return json({ error: 'Não foi possível validar a autorização.' }, 500)
    if (!consumed?.length) return invalidState()
    const result = await exchangeContaAzulCode(input.data, {
      clientId, clientSecret, fetcher: fetch, now: Date.now,
      save: async row => {
        const { error: saveError } = await db.from('conta_azul_tokens').upsert(row, { onConflict: 'id' })
        if (saveError) throw new Error('Token persistence failed')
      },
    })
    return json(result)
  } catch (error) {
    if (error instanceof ContaAzulAuthError) return json({ error: error.message }, error.status)
    return json({ error: 'Não foi possível concluir a autorização.' }, 500)
  }
}