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
  const { adminClient } = await import('./admin-guard.server')
  const { authorizationUrl, hashOAuthState, contaAzulStateTtlMs } = await import('./conta-azul-oauth')
  const state = crypto.randomUUID() + crypto.randomUUID()
  const db = await adminClient()
  await db.from('conta_azul_oauth_states').delete().or(`user_id.eq.${context.userId},expires_at.lt.${new Date().toISOString()}`)
  const { error } = await db.from('conta_azul_oauth_states').insert({ state_hash: await hashOAuthState(state), user_id: context.userId, expires_at: new Date(Date.now() + contaAzulStateTtlMs).toISOString() })
  if (error) throw new Error('Não foi possível iniciar a conexão.')
  return { url: authorizationUrl(clientId, state) }
})