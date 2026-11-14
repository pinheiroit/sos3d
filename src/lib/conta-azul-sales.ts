/** Pure mapping rules from a site order to the Conta Azul "Criar venda" payload. */
export type SaleSituation = 'EM_ANDAMENTO' | 'APROVADO'

export const digits = (value: string | null | undefined) => (value ?? '').replace(/\D/g, '')

export function formatDocument(value: string | null | undefined) {
  const d = digits(value)
  if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
  return ''
}

export function paymentType(method: string) {
  if (method === 'pix') return 'PIX_PAGAMENTO_INSTANTANEO'
  if (method === 'cartao') return 'CARTAO_CREDITO'
  if (method === 'boleto') return 'BOLETO_BANCARIO'
  return 'OUTRO'
}

export const round2 = (n: number) => Math.round(n * 100) / 100

/** Store-owned addresses (e.g. televendas@sos3d.com.br) are shared by many customers and never identify one. */
export function customerEmail(email: string | null | undefined) {
  const e = (email ?? '').trim().toLowerCase()
  return e && !e.endsWith('@sos3d.com.br') ? e : ''
}

export function customerKey(order: { id: string; customer_name?: string | null; customer_document: string | null; customer_email: string | null }) {
  const d = digits(order.customer_document)
  if (d.length === 11 || d.length === 14) return `doc:${d}`
  const email = customerEmail(order.customer_email)
  if (email) return `email:${email}`
  return `order:${order.id}`
}

/** Initial Conta Azul stock for a product created from a site order: site stock was already reduced by this order. */
export function initialStock(siteStock: number, orderQty: number) {
  return Math.max(0, Math.trunc(siteStock)) + Math.max(0, Math.trunc(orderQty))
}

export function buildSalePayload(input: {
  order: { reference: string; payment_method: string; shipping: number; discount: number; total: number; notes: string | null }
  items: { productExternalId: string; name: string; qty: number; unitPrice: number }[]
  customerId: string; numero: number; situacao: SaleSituation; date: string
}) {
  const { order } = input
  const itemsTotal = round2(input.items.reduce((sum, i) => sum + i.qty * i.unitPrice, 0))
  const shipping = round2(Number(order.shipping) || 0)
  const discount = round2(Number(order.discount) || 0)
  const total = round2(itemsTotal + shipping - discount)
  return {
    id_cliente: input.customerId,
    numero: input.numero,
    situacao: input.situacao,
    data_venda: input.date,
    observacoes: `Pedido ${order.reference} (site SOS.3D)${order.notes ? ` — ${order.notes}` : ''}`.slice(0, 1000),
    itens: input.items.map(i => ({ id: i.productExternalId, descricao: i.name, quantidade: i.qty, valor: round2(i.unitPrice) })),
    composicao_de_valor: { frete: shipping, ...(discount > 0 ? { desconto: { tipo: 'VALOR', valor: discount } } : {}) },
    condicao_pagamento: {
      tipo_pagamento: paymentType(order.payment_method),
      opcao_condicao_pagamento: 'À vista',
      parcelas: [{ data_vencimento: input.date, valor: total, descricao: `Pedido ${order.reference}` }],
    },
  }
}

/** Today's date in Rio Branco (UTC-5), as Conta Azul expects YYYY-MM-DD. */
export function rioBrancoDate(iso: string | number | Date) {
  return new Date(new Date(iso).getTime() - 5 * 3600 * 1000).toISOString().slice(0, 10)
}
