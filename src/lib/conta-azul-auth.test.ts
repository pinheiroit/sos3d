import { describe, expect, it, vi } from 'vitest'
import { contaAzulCodeSchema, exchangeContaAzulCode, handleContaAzulAuth } from './conta-azul-auth.server'

const input = { code: 'test-authorization-code', redirect_uri: 'https://sos3d.com.br/conta-azul/callback' }
const dependencies = () => ({ clientId: 'test-id', clientSecret: 'test-secret', fetcher: vi.fn<typeof fetch>().mockResolvedValue(Response.json({ access_token: 'test-access', refresh_token: 'test-refresh', expires_in: 3600 })), save: vi.fn().mockResolvedValue(undefined), now: () => Date.parse('2026-11-14T00:00:00Z') })

describe('Conta Azul authorization', () => {
  it('exchanges with Basic Auth, form body and the official token endpoint, storing both tokens', async () => {
    const deps = dependencies()
    const result = await exchangeContaAzulCode(input, deps)
    const [url, options] = deps.fetcher.mock.calls[0] ?? []
    expect(url).toBe('https://api-v2.contaazul.com/oauth/token')
    expect(options?.method).toBe('POST')
    expect(options?.headers).toEqual({ Authorization: `Basic ${btoa('test-id:test-secret')}`, 'Content-Type': 'application/x-www-form-urlencoded' })
    expect((options?.body as URLSearchParams).get('code')).toBe(input.code)
    expect((options?.body as URLSearchParams).get('grant_type')).toBe('authorization_code')
    expect((options?.body as URLSearchParams).get('redirect_uri')).toBe(input.redirect_uri)
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