import { describe, expect, it } from 'vitest'
import { eligibleIntegrationRows, runIntegrationBatch } from './conta-azul-batch'
import type { ComparisonRow } from './conta-azul-comparison'

const row = (id: string, kind: ComparisonRow['kind'] = 'products', status: ComparisonRow['status'] = 'pendente', action = true): ComparisonRow => ({ id, kind, status, action, name: id, local: '', remote: '', detail: '' })

describe('bulk integration', () => {
  it('selects all pending and failed eligible rows across categories, not integrated or blocked records', () => {
    expect(eligibleIntegrationRows([row('p'), row('c', 'customers'), row('s', 'sales', 'erro'), row('os', 'services', 'bloqueado', false), row('done', 'sales', 'integrado'), row('diff', 'products', 'divergente'), row('inactive', 'products', 'pendente', false)]).map(r => r.id)).toEqual(['p', 'c', 's'])
  })
  it('sends sequentially, customers and products before sales, without duplicates', async () => {
    const sent: string[] = []
    let active = 0
    await runIntegrationBatch([row('s', 'sales'), row('p'), row('c', 'customers'), row('p')], async r => {
      active++
      expect(active).toBe(1)
      await Promise.resolve()
      sent.push(r.id)
      active--
      return { ok: true }
    }, () => {})
    expect(sent).toEqual(['c', 'p', 's'])
  })
  it('continues after errors and reports each result', async () => {
    const reported: boolean[] = []
    const results = await runIntegrationBatch([row('a'), row('b'), row('c')], async r => {
      if (r.id === 'a') throw new Error('transport')
      return r.id === 'b' ? { ok: false, error: 'Recusado' } : { ok: true }
    }, r => reported.push(r.ok))
    expect(reported).toEqual([false, false, true])
    expect(results[1]?.error).toBe('Recusado')
  })
  it('stops before the next item without undoing completed sends', async () => {
    let stop = false
    const results = await runIntegrationBatch([row('a'), row('b')], async () => ({ ok: true }), () => { stop = true }, () => stop)
    expect(results.map(r => r.row.id)).toEqual(['a'])
  })
})