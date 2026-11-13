export const shipmentStatuses: Record<string, string> = { preparacao: 'Preparação', separacao: 'Separação', em_transito: 'Em trânsito', recebida: 'Recebida', encerrada: 'Encerrada', cancelada: 'Cancelada' }
export const returnStatuses: Record<string, string> = { solicitada: 'Solicitada', autorizada: 'Autorizada', em_transito: 'Em trânsito', recebida: 'Recebida', rejeitada: 'Rejeitada' }
export const returnConditions: Record<string, string> = { integro: 'Íntegro — estoque central', embalagem_danificada: 'Embalagem danificada — conferência', avariado: 'Avariado — quarentena', incorreto: 'Produto incorreto — conferência' }
export const availableQty = (item: { qty: number; sold_qty: number; returned_qty: number; lost_qty: number }) => item.qty - item.sold_qty - item.returned_qty - item.lost_qty
export function financialStatus(total: number, paid: number, due: string, cancelled: boolean, today: string) {
  if (cancelled) return 'Cancelada'
  if (paid >= total) return 'Quitada'
  if (due < today) return 'Vencida'
  return paid > 0 ? 'Parcialmente paga' : 'Pendente'
}
export const lineTotal = (qty: number, price: number) => Math.round(qty * Math.round(price * 100)) / 100
export function canOperateConsignment(roles: string[]) { return roles.includes('admin') || roles.includes('seller') }
export function canAdminConsignment(roles: string[]) { return roles.includes('admin') }

export function supplyPrice(negotiated?: { supply: number }) {
  return negotiated?.supply ?? 0
}
export function shipmentBalance(items: { qty: number; sold_qty: number; returned_qty: number; lost_qty: number }[]) {
  return items.reduce((sum, item) => sum + availableQty(item), 0)
}
export function settlementTotal(sales: { id: string; qty: number; supply_price: number | string; settlement_id: string | null }[], selected: string[]) {
  return sales.filter(s => !s.settlement_id && selected.includes(s.id)).reduce((sum, s) => sum + lineTotal(s.qty, Number(s.supply_price)), 0)
}

export function unreservedQty(item: { id: string; qty: number; sold_qty: number; returned_qty: number; lost_qty: number }, returns: { item_id: string; qty: number; status: string }[]) {
  return Math.max(0, availableQty(item) - returns.filter(r => r.item_id === item.id && ['solicitada','autorizada','em_transito'].includes(r.status)).reduce((sum,r) => sum + r.qty, 0))
}
export function validQuantity(qty: number, available: number) {
  return Number.isInteger(qty) && qty > 0 && qty <= available
}
export function paymentAllowed(amount: number, balance: number) {
  return Number.isFinite(amount) && amount > 0 && Math.round(amount * 100) <= Math.round(balance * 100)
}
export function dueDateFor(date: string, days: number) {
  const d = new Date(`${date}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0,10)
}