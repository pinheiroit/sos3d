import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import { canOperateConsignment } from './consignment'

const id = z.string().uuid()
const qty = z.number().int().positive().max(1000000)
const money = z.number().nonnegative().max(100000000).multipleOf(0.01)
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const note = z.string().trim().max(4000)
const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('partner'), key: z.string().regex(/^(user|customer):[a-f0-9-]{36}$/), userId: id.nullable(), customerId: id.nullable(), enabled: z.boolean(), blocked: z.boolean(), limitValue: money, limitQty: z.number().int().min(0).max(1000000), paymentDays: z.number().int().min(0).max(365), closingPeriod: z.enum(['semanal','quinzenal','mensal','esgotamento']), terms: z.record(z.string(), z.string().max(4000)), prices: z.record(z.string(), z.object({ supply: money, suggested: money })) }),
  z.object({ action: z.literal('shipment'), partnerId: id, notes: note, items: z.array(z.object({ productId: id, qty, price: money.positive(), suggestedPrice: money, lot: z.string().max(100), serial: z.string().max(100) })).min(1).max(200) }),
  z.object({ action: z.literal('shipment_status'), id, status: z.enum(['separacao','em_transito','recebida','encerrada','cancelada']) }),
  z.object({ action: z.literal('sale'), itemId: id, qty, soldOn: date, mode: z.enum(['individual','consolidada']), notes: note }),
  z.object({ action: z.literal('settle'), partnerId: id, saleIds: z.array(id).min(1).max(1000), mode: z.enum(['parcial','periodico','integral']), periodStart: date.nullable(), periodEnd: date.nullable(), dueDate: date }),
  z.object({ action: z.literal('payment'), id, amount: money.positive(), paidOn: date, method: z.enum(['pix','boleto','transferencia','dinheiro','outro']), notes: note }),
  z.object({ action: z.literal('cancel_settlement'), id, reason: note.min(5) }),
  z.object({ action: z.literal('return'), itemId: id, qty, condition: z.enum(['integro','embalagem_danificada','avariado','incorreto']), reason: note.min(5) }),
  z.object({ action: z.literal('return_status'), id, status: z.enum(['autorizada','em_transito','recebida','rejeitada']) }),
  z.object({ action: z.literal('inventory'), itemId: id, physicalQty: z.number().int().min(0).max(1000000), reason: note.min(5) }),
  z.object({ action: z.literal('inventory_resolve'), id, decision: z.enum(['sem_ajuste','perda_sem_cobranca','perda_com_cobranca']), reason: note.min(5) }),
])
export type ConsignmentInput = z.infer<typeof schema>

async function access(context: { supabase: Parameters<typeof import('./admin-guard.server').getRoles>[0]; userId: string }) {
  const { getRoles, adminClient } = await import('./admin-guard.server')
  const roles = await getRoles(context.supabase, context.userId)
  if (!canOperateConsignment([...(roles.isAdmin ? ['admin'] : []), ...(roles.isSeller ? ['seller'] : [])])) throw new Error('Acesso restrito à equipe.')
  return { db: await adminClient(), roles }
}

export const consignmentBoard = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { db, roles } = await access(context)
  const [partners, shipments, items, sales, settlements, payments, returns, inventories, events, products] = await Promise.all([
    db.from('consignment_partners').select('*').order('created_at', { ascending: false }),
    db.from('consignment_shipments').select('*').order('created_at', { ascending: false }),
    db.from('consignment_items').select('*'), db.from('consignment_sales').select('*').order('created_at', { ascending: false }),
    db.from('consignment_settlements').select('*').order('created_at', { ascending: false }),
    db.from('consignment_payments').select('*').order('created_at', { ascending: false }),
    db.from('consignment_returns').select('*').order('created_at', { ascending: false }),
    db.from('consignment_inventories').select('*').order('created_at', { ascending: false }),
    db.from('consignment_events').select('*').order('created_at', { ascending: false }).limit(500),
    db.from('products').select('id,name,brand,category,stock,price,active').eq('active', true).order('name'),
  ])
  for (const result of [partners, shipments, items, sales, settlements, payments, returns, inventories, events, products]) if (result.error) throw new Error(result.error.message)
  return { partners: partners.data ?? [], shipments: shipments.data ?? [], items: items.data ?? [], sales: sales.data ?? [], settlements: settlements.data ?? [], payments: payments.data ?? [], returns: returns.data ?? [], inventories: inventories.data ?? [], events: events.data ?? [], products: products.data ?? [], isAdmin: roles.isAdmin }
})

export const manageConsignment = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator((input: unknown) => schema.parse(input)).handler(async ({ context, data }) => {
  const { db } = await access(context)
  if (data.action === 'partner' && data.key !== (data.userId ? `user:${data.userId}` : `customer:${data.customerId}`)) throw new Error('Vínculo de cliente inválido.')
  if (data.action === 'settle' && new Set(data.saleIds).size !== data.saleIds.length) throw new Error('Vendas repetidas no fechamento.')
  const { data: result, error } = await db.rpc('manage_consignment', { _action: data.action, _data: data, _actor: context.userId })
  if (error) throw new Error(error.message)
  return result
})
export const consignmentContract = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator((input: unknown) => z.object({ key: z.string().regex(/^(user|customer):[a-f0-9-]{36}$/), path: z.string().max(300).optional(), filename: z.string().max(160).optional() }).parse(input)).handler(async ({ context, data }) => {
  const { db, roles } = await access(context)
  if (!roles.isAdmin) throw new Error('Apenas administradores acessam contratos.')
  const prefix = `${data.key.replace(':', '/')}/`
  if (data.path) {
    if (!data.path.startsWith(prefix) || data.path.includes('..')) throw new Error('Documento inválido.')
    const result = await db.storage.from('consignment-files').createSignedUrl(data.path, 300)
    if (result.error) throw new Error(result.error.message)
    return { url: result.data.signedUrl, path: data.path }
  }
  const filename = data.filename?.replace(/[^a-zA-Z0-9._-]/g, '_')
  if (!filename || !/\.(pdf|png|jpg|jpeg)$/i.test(filename)) throw new Error('Envie PDF, PNG ou JPG.')
  const path = `${prefix}${crypto.randomUUID()}-${filename}`
  const result = await db.storage.from('consignment-files').createSignedUploadUrl(path)
  if (result.error) throw new Error(result.error.message)
  return { url: result.data.signedUrl, path }
})
