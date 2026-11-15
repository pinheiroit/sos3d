import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import { assertFiscalCustomer } from './customer-fiscal'

export const myFiscalProfile = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const { currentFiscalCustomer } = await import('./customer-fiscal.server')
    return currentFiscalCustomer(supabaseAdmin, context.userId)
  })

export const saveMyFiscalProfile = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    name: z.string().trim().min(2).max(120), phone: z.string().trim().max(40),
    document: z.string().trim().max(40), zip: z.string().trim().max(20),
    street: z.string().trim().max(180), number: z.string().trim().max(20),
    neighborhood: z.string().trim().max(100), city: z.string().trim().max(120),
    state: z.string().trim().max(60), complement: z.string().trim().max(120).default(''),
  }).parse(input))
  .handler(async ({ context, data }) => {
    assertFiscalCustomer(data)
    const { supabaseAdmin: db } = await import('@/integrations/supabase/client.server')
    const { data: profile, error } = await db.from('profiles').select('email').eq('id', context.userId).single()
    if (error || !profile?.email) throw new Error('Cadastro da conta não encontrado.')
    const { data: row, error: readError } = await db.from('customers').select('id').eq('user_id', context.userId).limit(1).maybeSingle()
    if (readError) throw new Error('Não foi possível consultar o cadastro.')
    // Only a row owned by the session can be changed; never accept a customer ID from the browser.
    const values = { ...data, email: profile.email, user_id: context.userId, updated_at: new Date().toISOString() }
    const saved = row ? await db.from('customers').update(values).eq('id', row.id).eq('user_id', context.userId) : await db.from('customers').insert(values)
    if (saved.error) throw new Error('Não foi possível salvar o cadastro.')
    return { ok: true }
  })