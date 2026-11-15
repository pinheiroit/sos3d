import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/integrations/supabase/types'
import { api, ensureCustomer, ensureProduct, syncOrderToContaAzul, ContaAzulApiError } from './conta-azul-api.server'
import { missingFiscalFields, type FiscalCustomer } from './customer-fiscal'
import { currentFiscalCustomer } from './customer-fiscal.server'
import { customerKey } from './conta-azul-sales'
import { canSendSale, findCustomer, findProduct, productDifferences, type ComparisonRow, type IntegrationKind } from './conta-azul-comparison'

type Db = SupabaseClient<Database>
type Product = { id: string; nome: string; codigo_sku?: string; estoque?: number; valor_venda?: number }
type Person = { id: string; nome: string; documento?: string; email?: string; telefone?: string }
type Sale = { id: string; numero: number; total: number; cliente?: { nome?: string }; situacao?: { descricao?: string } }
type Service = { id: string; descricao: string; preco: number; codigo?: string }
const money = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

async function localRows<T>(fetchPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>) {
  const rows: T[] = []
  for (let from = 0; ; from += 500) {
    const result = await fetchPage(from, from + 499)
    if (result.error) throw new Error('Não foi possível consultar os cadastros da loja.')
    rows.push(...(result.data ?? []))
    if ((result.data?.length ?? 0) < 500) return rows
  }
}
async function remoteRows<T>(db: Db, path: string, itemKey: string, totalKey: string) {
  const rows: T[] = []
  for (let page = 1; page <= 100; page++) {
    const result = await api<Record<string, unknown>>(db, `${path}?pagina=${page}&tamanho_pagina=100`)
    const values = result[itemKey]
    if (!Array.isArray(values)) throw new ContaAzulApiError('Resposta de comparação inválida da Conta Azul.')
    rows.push(...values as T[])
    if (values.length < 100 || (typeof result[totalKey] === 'number' && rows.length >= Number(result[totalKey]))) return rows
  }
  throw new ContaAzulApiError('A Conta Azul ultrapassou o limite de comparação desta consulta. Nenhum envio foi realizado.')
}

export async function integrationPanel(db: Db) {
  // Serialize provider reads: a refresh token must not be rotated concurrently.
  const productsCA = await remoteRows<Product>(db, '/v1/produto/busca', 'itens', 'itens_totais')
  const customersCA = await remoteRows<Person>(db, '/v1/pessoas', 'items', 'totalItems')
  const salesCA = await remoteRows<Sale>(db, '/v1/venda/busca', 'itens', 'total_itens')
  const servicesCA: Service[] = []
  for (let page = 1; page <= 100; page++) {
    const result = await api<{ itens?: Service[]; paginacao?: { total_paginas?: number } } | { itens?: Service[]; paginacao?: { total_paginas?: number } }[]>(db, `/v1/servicos?pagina=${page}&tamanho_pagina=100`)
    const envelopes = Array.isArray(result) ? result : [result]
    const items = envelopes.flatMap(r => r.itens ?? [])
    servicesCA.push(...items)
    if (items.length < 100 || envelopes.some(r => r.paginacao?.total_paginas !== undefined && page >= r.paginacao.total_paginas)) break
    if (page === 100) throw new ContaAzulApiError('Limite da consulta de serviços excedido.')
  }
  const { serviceIntegrationOrders } = await import('./service.functions')
  const [products, customers, profiles, orders, links, syncs, services] = await Promise.all([
    localRows((a,b) => db.from('products').select('id,name,slug,price,stock,active').order('id').range(a,b)),
    localRows((a,b) => db.from('customers').select('*').order('id').range(a,b)),
    localRows((a,b) => db.from('profiles').select('id,full_name,email,phone').order('id').range(a,b)),
    localRows((a,b) => db.from('orders').select('id,reference,status,total,customer_name,customer_document,customer_email,customer_phone,shipping_address,user_id,created_at').order('created_at', { ascending: false }).order('id').range(a,b)),
    localRows((a,b) => db.from('conta_azul_links').select('kind,local_key,external_id').order('kind').order('local_key').range(a,b)),
    localRows((a,b) => db.from('conta_azul_order_sync').select('order_id,status,external_id,external_number,error').order('order_id').range(a,b)),
    serviceIntegrationOrders(db),
  ])
  const rows: ComparisonRow[] = []
  const used = { products: new Set<string>(), customers: new Set<string>(), sales: new Set<string>() }
  const linked = (kind: string, key: string) => links.find(l => l.kind === kind && l.local_key === key)?.external_id
  for (const p of products) {
    const r = findProduct(p, productsCA, linked('product', p.id))
    if (r) used.products.add(r.id)
    const diffs = r ? productDifferences(p, r) : []
    rows.push({ id: p.id, kind: 'products', name: p.name, local: `${money(p.price)} · ${p.stock} un.`, remote: r ? `${money(r.valor_venda ?? 0)} · ${r.estoque ?? '—'} un.` : 'Não localizado', status: r ? diffs.length ? 'divergente' : 'integrado' : 'pendente', detail: diffs.length ? `${diffs.join(', ')} diferentes. Ajuste na Conta Azul; a API de produtos não oferece atualização.` : r ? 'Cadastro localizado na Conta Azul' : p.active ? 'Cadastro ainda não vinculado' : 'Produto inativo na loja', action: !r && p.active })
  }
  const people = customers.map(c => ({ ...c, id: `customer:${c.id}`, name: c.name, email: c.email, document: c.document, phone: c.phone }))
  for (const p of profiles) {
    if (customers.some(c => c.user_id === p.id || (c.email && p.email && c.email.toLowerCase() === p.email.toLowerCase()))) continue
    const order = orders.find(o => o.user_id === p.id)
    people.push({ ...(order?.shipping_address as FiscalCustomer ?? {}), user_id: p.id, id: `user:${p.id}`, neighborhood: (order?.shipping_address as FiscalCustomer)?.neighborhood ?? '', zip: (order?.shipping_address as FiscalCustomer)?.zip ?? '', street: (order?.shipping_address as FiscalCustomer)?.street ?? '', number: (order?.shipping_address as FiscalCustomer)?.number ?? '', complement: (order?.shipping_address as FiscalCustomer)?.complement ?? '', city: (order?.shipping_address as FiscalCustomer)?.city ?? '', state: (order?.shipping_address as FiscalCustomer)?.state ?? '', notes: '', created_at: '', updated_at: '', name: p.full_name || order?.customer_name || p.email || 'Cliente', email: p.email ?? '', document: order?.customer_document ?? '', phone: p.phone ?? '' })
  }
  for (const p of people) {
    const key = customerKey({ id: p.id, customer_document: p.document, customer_email: p.email })
    const r = findCustomer(p, customersCA, linked('customer', key))
    if (r) used.customers.add(r.id)
    const missing = missingFiscalFields(p)
    rows.push({ id: p.id, kind: 'customers', name: p.name, local: p.document || p.email || 'Sem CPF/CNPJ ou e-mail próprio', remote: r ? r.nome : 'Não localizado', status: missing.length ? 'bloqueado' : r ? 'integrado' : 'pendente', detail: missing.length ? `Atualize o cadastro do cliente: ${missing.join(', ')}` : r ? 'Identificado pelo vínculo, CPF/CNPJ ou e-mail próprio' : 'Cadastro disponível para envio', action: !r && !missing.length })
  }
  for (const o of orders) {
    const profile = o.user_id ? profiles.find(p => p.id === o.user_id) : undefined
    const fiscal = customers.find(c => (o.user_id && c.user_id === o.user_id) ||
      (c.document && c.document.replace(/\D/g, '') === o.customer_document?.replace(/\D/g, '')) ||
      (c.email && (profile?.email || o.customer_email) && !c.email.toLowerCase().endsWith('@sos3d.com.br') && c.email.toLowerCase() === (profile?.email || o.customer_email).toLowerCase()))
    const missing = missingFiscalFields(fiscal ?? { ...(o.shipping_address as FiscalCustomer ?? {}), phone: o.customer_phone, document: o.customer_document })
    const s = syncs.find(s => s.order_id === o.id)
    const r = salesCA.find(r => r.id === s?.external_id)
    if (r) used.sales.add(r.id)
    const diff = r && Math.abs(r.total - Number(o.total)) >= 0.01
    rows.push({ id: o.id, kind: 'sales', name: `${o.reference} · ${o.customer_name}`, local: `${money(Number(o.total))} · ${o.status}`, remote: r ? `Venda nº ${r.numero} · ${money(r.total)}` : s?.status === 'enviado' ? `Venda nº ${s.external_number ?? '—'} não localizada` : 'Não localizado', status: missing.length && s?.status !== 'enviado' ? 'bloqueado' : o.status === 'cancelado' ? 'bloqueado' : s?.status === 'erro' ? 'erro' : s?.status === 'enviando' ? 'bloqueado' : s?.status === 'enviado' ? !r || diff ? 'divergente' : 'integrado' : 'pendente', detail: missing.length && s?.status !== 'enviado' ? `Atualize o cadastro do cliente: ${missing.join(', ')}` : s?.error || (diff ? 'Total diferente; confira a venda na Conta Azul' : s?.status === 'enviando' ? 'Envio em processamento; não reenviar' : s?.status === 'enviado' && !r ? 'Venda ausente na consulta. Reenvio bloqueado para evitar duplicidade.' : o.status === 'cancelado' ? 'Pedido cancelado' : 'Envio manual com confirmação da situação'), action: !missing.length && canSendSale(o.status, s?.status) })
  }
  for (const s of services) rows.push({ id: s.id, kind: 'services', name: `O.S. ${s.number}`, local: s.status, remote: 'Sem vínculo de O.S.', status: 'bloqueado', detail: 'Envio de O.S. ainda não implementado. Não é enviado como produto ou venda automaticamente.', action: false })
  for (const s of servicesCA) rows.push({ id: `remote:${s.id}`, kind: 'services', name: s.descricao || s.codigo || 'Serviço Conta Azul', local: 'Sem catálogo de serviços correspondente', remote: money(s.preco), status: 'somente_conta_azul', detail: 'Cadastro de serviço na Conta Azul; não representa uma O.S. da assistência', action: false })
  for (const [kind, list] of [['products', productsCA], ['customers', customersCA], ['sales', salesCA]] as const) {
    for (const r of list) if (!used[kind].has(r.id)) rows.push({ id: `remote:${r.id}`, kind, name: 'nome' in r ? r.nome : `Venda nº ${r.numero}`, local: 'Não localizado na loja', remote: 'Somente na Conta Azul', status: 'somente_conta_azul', detail: 'Importação para a loja não habilitada', action: false })
  }
  return { rows, checkedAt: new Date().toISOString() }
}

export async function forceIntegration(db: Db, kind: IntegrationKind, id: string, situation: 'EM_ANDAMENTO' | 'APROVADO') {
  if (kind === 'products') {
    const { data: p, error } = await db.from('products').select('id,name,slug,price,active').eq('id', id).single()
    if (error || !p || !p.active) throw new ContaAzulApiError('Produto não encontrado ou inativo.')
    await ensureProduct(db, { product_id: p.id, product_slug: p.slug, product_name: p.name, unit_price: p.price, orderQty: 0 })
  } else if (kind === 'customers') {
    const [source, key] = id.split(':')
    if (source === 'customer') {
      const { data: p } = await db.from('customers').select('*').eq('id', key ?? '').single()
      if (!p) throw new ContaAzulApiError('Cliente não encontrado.')
      await ensureCustomer(db, { id, customer_name: p.name, customer_document: p.document, customer_email: p.email, customer_phone: p.phone, shipping_address: p, user_id: p.user_id })
    } else if (source === 'user') {
      const { data: p } = await db.from('profiles').select('full_name,email,phone').eq('id', key ?? '').single()
      const { data: o } = await db.from('orders').select('customer_document').eq('user_id', key ?? '').order('created_at', { ascending: false }).limit(1).maybeSingle()
      if (!p) throw new ContaAzulApiError('Cliente não encontrado.')
      await ensureCustomer(db, { id, customer_name: p.full_name ?? 'Cliente', customer_document: o?.customer_document ?? '', customer_email: p.email ?? '', customer_phone: p.phone ?? '', user_id: key ?? null })
    } else throw new ContaAzulApiError('Cliente inválido.')
  } else if (kind === 'sales') await syncOrderToContaAzul(db, id, situation)
  else throw new ContaAzulApiError('Integração de O.S. ainda não disponível.')
  return { ok: true as const }
}