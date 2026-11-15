import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/integrations/supabase/types'
import type { FiscalCustomer } from './customer-fiscal'
type Db = SupabaseClient<Database>
export async function currentFiscalCustomer(db: Db, userId: string | null, email?: string | null, document?: string | null) {
  let query = db.from('customers').select('*')
  if (userId) query = query.eq('user_id', userId)
  else if (document) query = query.eq('document', document)
  else if (email && !email.toLowerCase().endsWith('@sos3d.com.br')) query = query.ilike('email', email)
  else return null
  const result = await query.limit(1).maybeSingle()
  if (result.error) throw new Error('Não foi possível consultar o cadastro fiscal.')
  if (result.data) return result.data
  if (!userId) {
    if (email && !email.toLowerCase().endsWith('@sos3d.com.br')) {
      const { data, error } = await db.from('customers').select('*').ilike('email', email).limit(1).maybeSingle()
      if (error) throw new Error('Não foi possível consultar o cadastro fiscal.')
      return data
    }
    return null
  }
  const [{ data: profile, error: profileError }, { data: order, error: orderError }] = await Promise.all([
    db.from('profiles').select('full_name,email,phone').eq('id', userId).maybeSingle(),
    db.from('orders').select('customer_name,customer_document,customer_phone,shipping_address').eq('user_id', userId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
  ])
  if (profileError || orderError) throw new Error('Não foi possível consultar o cadastro fiscal.')
  // Match legacy records by the account's verified profile email, never caller-supplied identity.
  if (profile?.email) {
    const { data: linked, error } = await db.from('customers').select('*').ilike('email', profile.email).limit(1).maybeSingle()
    if (error) throw new Error('Não foi possível consultar o cadastro fiscal.')
    if (linked) return linked
  }
  const address = (order?.shipping_address ?? {}) as FiscalCustomer
  return { ...address, name: profile?.full_name || order?.customer_name || '', email: profile?.email || '', phone: order?.customer_phone || profile?.phone || '', document: order?.customer_document || '' }
}