import { describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/integrations/supabase/types'
import { ensureCustomer } from './conta-azul-api.server'

describe('integration fiscal gate', () => {
  it('blocks an incomplete stored customer before checking links or contacting Conta Azul', async () => {
    const queried: string[] = []
    const db = { from: (table: string) => {
      queried.push(table)
      const chain = { select: () => chain, eq: () => chain, limit: () => chain, maybeSingle: async () => ({ data: { phone: '68999484082', document: '55891067000155', street: 'Travessa do Canal', number: '60', neighborhood: '', city: 'Rio Branco', state: 'AC', zip: '69920199' }, error: null }) }
      return chain
    } } as unknown as SupabaseClient<Database>
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    try {
      await expect(ensureCustomer(db, { id: 'test', customer_name: 'Teste', customer_document: '55891067000155', customer_email: 'teste@example.com', customer_phone: '68999484082' })).rejects.toThrow('Bairro')
      expect(queried).toEqual(['customers'])
      expect(fetchSpy).not.toHaveBeenCalled()
    } finally { fetchSpy.mockRestore() }
  })
})