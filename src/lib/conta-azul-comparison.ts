import { customerEmail, digits } from './conta-azul-sales'

export type IntegrationKind = 'products' | 'customers' | 'sales' | 'services'
export type IntegrationStatus = 'integrado' | 'pendente' | 'divergente' | 'erro' | 'bloqueado' | 'somente_conta_azul'
export type ComparisonRow = { id: string; kind: IntegrationKind; name: string; local: string; remote: string; status: IntegrationStatus; detail: string; action: boolean }
export const integrationLabels: Record<IntegrationKind, string> = { products: 'Produtos', customers: 'Clientes', sales: 'Vendas', services: 'Serviços / O.S.' }
export const statusLabels: Record<IntegrationStatus, string> = { integrado: 'Integrado', pendente: 'Pendente', divergente: 'Divergente', erro: 'Erro', bloqueado: 'Bloqueado', somente_conta_azul: 'Só na Conta Azul' }
export const normalize = (s: string) => s.trim().toLocaleLowerCase('pt-BR')
export function findProduct<T extends { id: string; nome: string; codigo_sku?: string }>(local: { name: string; slug: string }, remote: T[], linkedId?: string) {
  if (linkedId) return remote.find(r => r.id === linkedId)
  const sku = remote.filter(r => r.codigo_sku === local.slug.slice(0, 60))
  if (sku.length === 1) return sku[0]
  const names = remote.filter(r => normalize(r.nome) === normalize(local.name))
  return names.length === 1 ? names[0] : undefined
}
export function findCustomer<T extends { id: string; documento?: string; email?: string }>(local: { document: string; email: string }, remote: T[], linkedId?: string) {
  if (linkedId) return remote.find(r => r.id === linkedId)
  const doc = digits(local.document)
  if (doc.length === 11 || doc.length === 14) {
    const matches = remote.filter(r => digits(r.documento) === doc)
    if (matches.length === 1) return matches[0]
  }
  const email = customerEmail(local.email)
  const matches = email ? remote.filter(r => customerEmail(r.email) === email) : []
  return matches.length === 1 ? matches[0] : undefined
}
export function productDifferences(local: { name: string; price: number; stock: number }, remote: { nome: string; valor_venda?: number; estoque?: number }) {
  const differences: string[] = []
  if (normalize(local.name) !== normalize(remote.nome)) differences.push('Nome')
  if (remote.valor_venda !== undefined && Math.abs(local.price - remote.valor_venda) >= 0.01) differences.push('Preço')
  if (remote.estoque !== undefined && local.stock !== remote.estoque) differences.push('Estoque')
  return differences
}
export function canSendSale(status: string, syncStatus?: string) {
  return status !== 'cancelado' && syncStatus !== 'enviado' && syncStatus !== 'enviando'
}