import { describe, expect, it, vi } from 'vitest'
import { contaAzulCodeSchema, exchangeContaAzulCode, handleContaAzulAuth } from './conta-azul-auth.server'
import { authorizationUrl, validOAuthState } from './conta-azul-oauth'

const input = { code: 'test-authorization-code', redirect_uri: 'https://sos3d.com.br/callback' }
const dependencies = () => ({ clientId: 'test-id', clientSecret: 'test-secret', fetcher: vi.fn<typeof fetch>().mockResolvedValue(Response.json({ access_token: 'test-access', refresh_token: 'test-refresh', expires_in: 3600 })), save: vi.fn().mockResolvedValue(undefined), now: () => Date.parse('2026-11-14T00:00:00Z') })

describe('Conta Azul authorization', () => {
  it('uses the official authorization endpoint and callback instead of the malformed URL', () => {
    const url = authorizationUrl('test-id', 'random-state')
    expect(url.startsWith('https://login.contaazul.com/#/oauth/authorize?')).toBe(true)
    const params = new URLSearchParams(url.split('?')[1])
    expect(params.get('redirect_uri')).toBe('https://sos3d.com.br/callback')
    expect(params.get('scope')).toBe('openid profile aws.cognito.signin.user.admin')
    expect(params.get('state')).toBe('random-state')
  })
  it('requires a matching, unexpired state bound to the administrator', () => {
    const state = 'a'.repeat(64)
    const cookie = JSON.stringify({ state, userId: 'admin', expires: 2000 })
    expect(validOAuthState(state, cookie, 'admin', 1000)).toBe(true)
    expect(validOAuthState('123', cookie, 'admin', 1000)).toBe(false)
    expect(validOAuthState(state, cookie, 'other', 1000)).toBe(false)
    expect(validOAuthState(state, cookie, 'admin', 2000)).toBe(false)
    expect(validOAuthState(state, undefined, 'admin', 1000)).toBe(false)
  })
  it('exchanges with Basic Auth, form body and the official token endpoint, storing both tokens', async () => {
    const deps = dependencies()
    const result = await exchangeContaAzulCode(input, deps)
    const [url, options] = deps.fetcher.mock.calls[0] ?? []
    expect(url).toBe('https://api-v2.contaazul.com/oauth/token')
    expect(options?.method).toBe('POST')
    expect(options?.headers).toEqual({ Authorization: `Basic ${btoa('test-id:test-secret')}`, 'Content-Type': 'application/x-www-form-urlencoded' })
    expect(typeof options?.body).toBe('string')
    expect(options?.redirect).toBe('manual')
    const form = new URLSearchParams(options?.body as string)
    expect(form.get('code')).toBe(input.code)
    expect(form.get('grant_type')).toBe('authorization_code')
    expect(form.get('redirect_uri')).toBe(input.redirect_uri)
    expect(deps.save).toHaveBeenCalledWith({ id: '00000000-0000-4000-8000-000000000001', access_token: 'test-access', refresh_token: 'test-refresh', expires_at: '2026-11-14T01:00:00.000Z', updated_at: '2026-11-14T00:00:00.000Z' })
    expect(result).toEqual({ connected: true, expires_at: '2026-11-14T01:00:00.000Z' })
  })
  it('never persists failed provider responses or exposes their secret body', async () => {
    const deps = dependencies()
    deps.fetcher.mockResolvedValue(Response.json({ access_token: 'do-not-expose' }, { status: 400 }))
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(exchangeContaAzulCode(input, deps)).rejects.toThrow('HTTP 400')
    expect(deps.save).not.toHaveBeenCalled()
    expect(JSON.stringify(log.mock.calls)).not.toContain('do-not-expose')
    log.mockRestore()
  })
  it('rejects missing refresh tokens without persisting', async () => {
    const deps = dependencies()
    deps.fetcher.mockResolvedValue(Response.json({ access_token: 'test-access', expires_in: 3600 }))
    await expect(exchangeContaAzulCode(input, deps)).rejects.toThrow('validade esperados')
    expect(deps.save).not.toHaveBeenCalled()
  })
  it('does not follow redirects or forward credentials to another destination', async () => {
    const deps = dependencies()
    deps.fetcher.mockResolvedValue(new Response(null, { status: 302, headers: { Location: 'https://example.org/token' } }))
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(exchangeContaAzulCode(input, deps)).rejects.toThrow('HTTP 302')
    expect(deps.fetcher).toHaveBeenCalledTimes(1)
    expect(deps.save).not.toHaveBeenCalled()
    log.mockRestore()
  })
  it('logs only an allowlisted transport category, never the error message or credentials', async () => {
    const deps = dependencies()
    deps.fetcher.mockRejectedValue(new TypeError('private-code-and-credentials'))
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(exchangeContaAzulCode(input, deps)).rejects.toThrow('Não foi possível comunicar')
    expect(log.mock.calls).toEqual([['Conta Azul OAuth transport failed [TypeError]']])
    expect(deps.save).not.toHaveBeenCalled()
    log.mockRestore()
  })
  it('reports persistence failure without exposing tokens', async () => {
    const deps = dependencies()
    deps.save.mockRejectedValue(new Error('test-access'))
    await expect(exchangeContaAzulCode(input, deps)).rejects.toThrow('Não foi possível salvar')
  })
  it('rejects arbitrary redirect destinations', () => {
    expect(contaAzulCodeSchema.safeParse({ ...input, redirect_uri: 'https://example.org/callback' }).success).toBe(false)
    expect(contaAzulCodeSchema.safeParse({ ...input, redirect_uri: 'https://sos3d.com.br.attacker.org/callback' }).success).toBe(false)
  })
  it('requires authentication before reading any credentials', async () => {
    const response = await handleContaAzulAuth(new Request('https://sos3d.com.br/api/public/conta-azul-auth', { method: 'POST', body: JSON.stringify(input) }))
    expect(response.status).toBe(401)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
  })
})