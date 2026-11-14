import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import type { Database } from '@/integrations/supabase/types'
import { buildSalePayload, customerEmail, customerKey, digits, initialStock, formatDocument, rioBrancoDate, type SaleSituation } from './conta-azul-sales'

type Db = SupabaseClient<Database>
const API = 'https://api-v2.contaazul.com'
const tokenSchema = z.object({ access_token: z.string().min(1), refresh_token: z.string().min(1).optional(), expires_in: z.number().int().positive().max(31536000) })

export class ContaAzulApiError extends Error {}

/** Returns a valid access token, rotating it with the refresh token when close to expiry. Never logs token values. */
async function accessToken(db: Db) {
  const { data: row, error } = await db.from('conta_azul_tokens').select('id,access_token,refresh_token,expires_at').maybeSingle()
  if (error || !row) throw new ContaAzulApiError('Conta Azul não conectada. Conecte em Integrações.')
  if (new Date(row.expires_at).getTime() - Date.now() > 120_000) return row.access_token
  const clientId = process.env['CONTA_AZUL_CLIENT_ID'], clientSecret = process.env['CONTA_AZUL_CLIENT_SECRET']
  if (!clientId || !clientSecret) throw new ContaAzulApiError('Credenciais da Conta Azul não configuradas.')
  let response: Response
  try {
    response = await fetch(`${API}/oauth/token`, {
      method: 'POST', redirect: 'manual', signal: AbortSignal.timeout(20000),
      headers: { Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: row.refresh_token }).toString(),
    })
  } catch { throw new ContaAzulApiError('Não foi possível renovar o acesso à Conta Azul. Tente novamente.') }
  if (!response.ok) {
    console.error(`Conta Azul refresh failed [${response.status}]`)
    throw new ContaAzulApiError('A autorização da Conta Azul expirou. Conecte novamente em Integrações.')
  }
  const tokens = tokenSchema.safeParse(await response.json().catch(() => null))
  if (!tokens.success) throw new ContaAzulApiError('Resposta inválida ao renovar o acesso à Conta Azul.')
  const { error: saveError } = await db.from('conta_azul_tokens').update({
    access_token: tokens.data.access_token, refresh_token: tokens.data.refresh_token ?? row.refresh_token,
    expires_at: new Date(Date.now() + tokens.data.expires_in * 1000).toISOString(), updated_at: new Date().toISOString(),
  }).eq('id', row.id)
  if (saveError) throw new ContaAzulApiError('Não foi possível salvar o acesso renovado da Conta Azul.')
  return tokens.data.access_token
}

/** Extracts a short human message from a Conta Azul error body (validation messages only, no headers or tokens). */
function providerMessage(body: unknown): string {
  if (!body || typeof body !== 'object') return ''
  const b = body as Record<string, unknown>
  const pick = (v: unknown): string => typeof v === 'string' ? v : Array.isArray(v) ? v.map(pick).filter(Boolean).join('; ') : v && typeof v === 'object' ? pick((v as Record<string, unknown>)['mensagem'] ?? (v as Record<string, unknown>)['message'] ?? (v as Record<string, unknown>)['descricao']) : ''
  return (pick(b['mensagem']) || pick(b['message']) || pick(b['erros']) || pick(b['errors']) || pick(b['error_description']) || pick(b['error'])).slice(0, 300)
}

export async function api<T>(db: Db, path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const token = await accessToken(db)
  let response: Response
  try {
    response = await fetch(`${API}${path}`, {
      method: init?.method ?? 'GET', redirect: 'manual', signal: AbortSignal.timeout(25000),
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', ...(init?.body ? { 'Content-Type': 'application/json' } : {}) },
      body: init?.body ? JSON.stringify(init.body) : null,
    })
  } catch { throw new ContaAzulApiError('Não foi possível comunicar com a Conta Azul. Tente novamente.') }
  const text = await response.text()
  let body: unknown = null
  try { body = text ? JSON.parse(text) : null } catch { body = null }
  if (!response.ok) {
    console.error(`Conta Azul API ${init?.method ?? 'GET'} ${path.split('?')[0]} failed [${response.status}]`)
    const msg = providerMessage(body)
    throw new ContaAzulApiError(`Conta Azul recusou (HTTP ${response.status})${msg ? `: ${msg}` : ''}`)
  }
  return body as T
}

async function link(db: Db, kind: 'customer' | 'product', key: string) {
  const { data } = await db.from('conta_azul_links').select('external_id').eq('kind', kind).eq('local_key', key).maybeSingle()
  return data?.external_id ?? null
}
async function saveLink(db: Db, kind: 'customer' | 'product', key: string, externalId: string) {
  const { error } = await db.from('conta_azul_links').upsert({ kind, local_key: key, external_id: externalId, updated_at: new Date().toISOString() })
  if (error) throw new ContaAzulApiError('Cadastro enviado, mas o vínculo não pôde ser salvo. Atualize a comparação antes de tentar novamente.')
}

type Order = Pick<Database['public']['Tables']['orders']['Row'], 'id' | 'customer_name' | 'customer_document' | 'customer_email' | 'customer_phone'>

export async function ensureCustomer(db: Db, order: Order) {
  const key = customerKey(order)
  const known = await link(db, 'customer', key)
  if (known) return known
  const doc = digits(order.customer_document)
  type People = { items?: { id: string }[] }
  let found: string | undefined
  if (doc.length === 11 || doc.length === 14) found = (await api<People>(db, `/v1/pessoas?documentos=${doc}&tamanho_pagina=10`)).items?.[0]?.id
  const email = customerEmail(order.customer_email)
  if (!found && email) found = (await api<People>(db, `/v1/pessoas?emails=${encodeURIComponent(email)}&tamanho_pagina=10`)).items?.[0]?.id
  if (!found) {
    const company = doc.length === 14
    const created = await api<{ id: string }>(db, '/v1/pessoas', { method: 'POST', body: {
      nome: order.customer_name.trim() || 'Cliente do site', tipo_pessoa: company ? 'Jurídica' : 'Física',
      ...(doc.length === 11 ? { cpf: formatDocument(doc) } : company ? { cnpj: formatDocument(doc) } : {}),
      ...(email ? { email } : {}),
      ...(digits(order.customer_phone) ? { telefone_celular: digits(order.customer_phone) } : {}),
      perfis: [{ tipo_perfil: 'Cliente' }], ativo: true,
    } })
    found = created.id
  }
  if (!found) throw new ContaAzulApiError('A Conta Azul não retornou o cliente.')
  await saveLink(db, 'customer', key, found)
  return found
}

export async function ensureProduct(db: Db, item: { product_id: string | null; product_slug: string; product_name: string; unit_price: number; orderQty: number }) {
  const key = item.product_id ?? `slug:${item.product_slug}`
  const known = await link(db, 'product', key)
  if (known) return known
  const sku = item.product_slug.slice(0, 60)
  const list = await api<{ itens?: { id: string; nome: string; codigo_sku?: string }[] }>(db, `/v1/produto/busca?busca=${encodeURIComponent(item.product_name.slice(0, 100))}&tamanho_pagina=20`)
  const norm = (s: string) => s.trim().toLowerCase()
  let found = list.itens?.find(p => p.codigo_sku === sku || norm(p.nome) === norm(item.product_name))?.id
  if (!found) {
    const { data: local } = item.product_id ? await db.from('products').select('stock').eq('id', item.product_id).maybeSingle() : { data: null }
    const created = await api<{ id: string }>(db, '/v1/produto', { method: 'POST', body: {
      nome: item.product_name.slice(0, 120), codigo_sku: sku, formato: 'SIMPLES',
      estoque: { valor_venda: Number(item.unit_price), estoque_disponivel: initialStock(local?.stock ?? 0, item.orderQty) },
      dimensao: { altura: 0, largura: 0, profundidade: 0 },
    } })
    found = created.id
  }
  if (!found) throw new ContaAzulApiError('A Conta Azul não retornou o produto.')
  await saveLink(db, 'product', key, found)
  return found
}

/** Sends one site order as a Conta Azul sale. Claims the order first so it is never sent twice. */
export async function syncOrderToContaAzul(db: Db, orderId: string, situacao: SaleSituation) {
  const { data: order } = await db.from('orders').select('*').eq('id', orderId).maybeSingle()
  if (!order) throw new ContaAzulApiError('Pedido não encontrado.')
  if (order.status === 'cancelado') throw new ContaAzulApiError('Pedidos cancelados não são enviados.')
  const { data: existing } = await db.from('conta_azul_order_sync').select('*').eq('order_id', orderId).maybeSingle()
  if (existing?.status === 'enviado') return existing
  const now = new Date().toISOString()
  if (existing) {
    const { data: claimed } = await db.from('conta_azul_order_sync').update({ status: 'enviando', error: null, updated_at: now }).eq('order_id', orderId).eq('status', 'erro').select('order_id')
    if (!claimed?.length) throw new ContaAzulApiError('Este pedido já está sendo enviado.')
  } else {
    const { error } = await db.from('conta_azul_order_sync').insert({ order_id: orderId, status: 'enviando', updated_at: now })
    if (error) throw new ContaAzulApiError('Este pedido já está sendo enviado.')
  }
  try {
    const { data: items } = await db.from('order_items').select('*').eq('order_id', orderId)
    if (!items?.length) throw new ContaAzulApiError('Pedido sem itens.')
    const customerId = await ensureCustomer(db, order)
    const lines = []
    for (const i of items) lines.push({ productExternalId: await ensureProduct(db, { ...i, unit_price: Number(i.unit_price), orderQty: items.filter(x => x.product_id === i.product_id && x.product_slug === i.product_slug).reduce((n, x) => n + x.qty, 0) }), name: i.product_name, qty: i.qty, unitPrice: Number(i.unit_price) })
    const numero = await api<number | null>(db, '/v1/venda/proximo-numero')
    if (!numero) throw new ContaAzulApiError('A Conta Azul não informou o próximo número de venda.')
    const payload = buildSalePayload({ order: { ...order, shipping: Number(order.shipping), discount: Number(order.discount), total: Number(order.total) }, items: lines, customerId, numero, situacao, date: rioBrancoDate(order.created_at) })
    const sale = await api<{ id?: string; numero?: number }>(db, '/v1/venda', { method: 'POST', body: payload })
    const row = { order_id: orderId, status: 'enviado', external_id: sale?.id ?? null, external_number: sale?.numero ?? numero, situacao, error: null, updated_at: new Date().toISOString() }
    await db.from('conta_azul_order_sync').update(row).eq('order_id', orderId)
    return row
  } catch (e) {
    const message = e instanceof ContaAzulApiError ? e.message : 'Falha inesperada ao enviar à Conta Azul.'
    await db.from('conta_azul_order_sync').update({ status: 'erro', error: message, updated_at: new Date().toISOString() }).eq('order_id', orderId)
    throw new ContaAzulApiError(message)
  }
}
