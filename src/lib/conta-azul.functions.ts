import { createServerFn } from '@tanstack/react-start'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'

export const contaAzulConnection = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { assertAdmin, adminClient } = await import('./admin-guard.server')
  await assertAdmin(context.supabase, context.userId)
  const db = await adminClient()
  const { data, error } = await db.from('conta_azul_tokens').select('expires_at,updated_at').maybeSingle()
  if (error) throw new Error('Não foi possível consultar a conexão.')
  return { connected: Boolean(data), expiresAt: data?.expires_at ?? null, updatedAt: data?.updated_at ?? null }
})

export const beginContaAzulConnection = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { assertAdmin } = await import('./admin-guard.server')
  await assertAdmin(context.supabase, context.userId)
  const clientId = process.env['CONTA_AZUL_CLIENT_ID']
  if (!clientId || !process.env['CONTA_AZUL_CLIENT_SECRET']) throw new Error('Configure as credenciais da Conta Azul.')
  const { setCookie, getRequest } = await import('@tanstack/react-start/server')
  const { authorizationUrl, contaAzulStateCookie } = await import('./conta-azul-oauth')
  const state = crypto.randomUUID() + crypto.randomUUID()
  setCookie(contaAzulStateCookie, JSON.stringify({ state, userId: context.userId, expires: Date.now() + 600000 }), { httpOnly: true, secure: new URL(getRequest().url).protocol === 'https:', sameSite: 'lax', path: '/', maxAge: 600 })
  return { url: authorizationUrl(clientId, state) }
})