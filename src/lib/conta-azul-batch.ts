import type { ComparisonRow } from './conta-azul-comparison'

export const integrationRowKey = (row: ComparisonRow) => `${row.kind}:${row.id}`
export const eligibleIntegrationRows = (rows: ComparisonRow[]) => rows.filter(row => row.action && (row.status === 'pendente' || row.status === 'erro'))
export type IntegrationBatchResult = { row: ComparisonRow; ok: boolean; error?: string }

export async function runIntegrationBatch(
  rows: ComparisonRow[],
  send: (row: ComparisonRow) => Promise<{ ok: boolean; error?: string }>,
  onResult: (result: IntegrationBatchResult) => void,
  shouldStop: () => boolean = () => false,
) {
  const priority = { customers: 0, products: 1, sales: 2, services: 3 }
  const unique = [...new Map(eligibleIntegrationRows(rows).map(row => [integrationRowKey(row), row])).values()]
  const results: IntegrationBatchResult[] = []
  for (const row of unique.sort((a, b) => priority[a.kind] - priority[b.kind])) {
    if (shouldStop()) break
    let result: IntegrationBatchResult
    try { result = { row, ...await send(row) } }
    catch { result = { row, ok: false, error: 'Não foi possível enviar este registro. Confira a comparação antes de tentar novamente.' } }
    results.push(result)
    onResult(result)
  }
  return results
}