import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { ArrowUpRight, RefreshCw, Search, LoaderCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { eligibleIntegrationRows, integrationRowKey, runIntegrationBatch, type IntegrationBatchResult } from '@/lib/conta-azul-batch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { contaAzulComparison, forceContaAzulIntegration } from '@/lib/conta-azul.functions'
import { integrationLabels, statusLabels, type IntegrationKind, type IntegrationStatus, type ComparisonRow } from '@/lib/conta-azul-comparison'

export function IntegrationComparison() {
  const compare = useServerFn(contaAzulComparison)
  const send = useServerFn(forceContaAzulIntegration)
  const client = useQueryClient()
  const [kind, setKind] = useState<IntegrationKind>('products')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [selected, setSelected] = useState<ComparisonRow | null>(null)
  const [situation, setSituation] = useState<'EM_ANDAMENTO' | 'APROVADO'>('EM_ANDAMENTO')
  const [message, setMessage] = useState('')
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [batch, setBatch] = useState<ComparisonRow[] | null>(null)
  const [batchBusy, setBatchBusy] = useState(false)
  const [results, setResults] = useState<IntegrationBatchResult[]>([])
  const [stopping, setStopping] = useState(false)
  const stop = useRef(false)
  const query = useQuery({ queryKey: ['conta-azul-comparison'], queryFn: () => compare(), staleTime: 60_000, retry: false, refetchOnWindowFocus: false })
  const mutation = useMutation({ mutationFn: async () => {
    if (!selected) throw new Error('Selecione um registro.')
    const result = await send({ data: { kind: selected.kind, id: selected.id, situation } })
    if (!result.ok) throw new Error(result.error)
  }, onSuccess: async () => {
    setSelected(null); setMessage('Registro integrado. Comparação atualizada.')
    await Promise.all([client.invalidateQueries({ queryKey: ['conta-azul-comparison'] }), client.invalidateQueries({ queryKey: ['conta-azul-order-syncs'] })])
  } })
  const rows = query.data?.rows ?? []
  const visible = rows.filter(r => r.kind === kind && (filter === 'all' || r.status === filter) && `${r.name} ${r.local} ${r.remote}`.toLowerCase().includes(search.toLowerCase()))
  const eligible = eligibleIntegrationRows(rows)
  const chosen = eligible.filter(r => checked.has(integrationRowKey(r)))
  const visibleEligible = eligibleIntegrationRows(visible)
  const visibleChecked = visibleEligible.filter(r => checked.has(integrationRowKey(r))).length
  const locked = batchBusy || mutation.isPending || query.isFetching
  const toggleRows = (items: ComparisonRow[], value: boolean) => setChecked(previous => {
    const next = new Set(previous)
    for (const row of items) { if (value) next.add(integrationRowKey(row)); else next.delete(integrationRowKey(row)) }
    return next
  })
  const startBatch = async () => {
    if (!batch || batchBusy) return
    const items = batch
    const saleSituation = situation
    setBatchBusy(true); setStopping(false); stop.current = false; setResults([]); setMessage('')
    try {
      const completed = await runIntegrationBatch(items, row => send({ data: { kind: row.kind, id: row.id, situation: saleSituation } }), result => {
        setResults(previous => [...previous, result])
        if (result.ok) setChecked(previous => { const next = new Set(previous); next.delete(integrationRowKey(result.row)); return next })
      }, () => stop.current)
      const successes = completed.filter(r => r.ok).length
      setMessage(`${successes} integrado(s), ${completed.length - successes} com erro, ${items.length - completed.length} não processado(s).`)
      await Promise.all([client.invalidateQueries({ queryKey: ['conta-azul-comparison'] }), client.invalidateQueries({ queryKey: ['conta-azul-order-syncs'] })])
    } finally { setBatchBusy(false) }
  }
  return <div className="space-y-6 pt-8">
    <div className="flex flex-wrap justify-between items-start gap-4"><div><h2 className="text-xl font-semibold">Conferência de integração</h2>{query.data && <p className="text-sm text-muted-foreground mt-1">Última conferência: {new Date(query.data.checkedAt).toLocaleString('pt-BR')}</p>}</div><Button variant="outline" onClick={() => query.refetch()} disabled={locked}><RefreshCw className={query.isFetching ? 'size-4 animate-spin' : 'size-4'} />Atualizar comparação</Button></div>
    <div className="grid grid-cols-2 lg:grid-cols-4 border-y border-border divide-x divide-border">{(['pendente', 'divergente', 'integrado', 'erro'] as IntegrationStatus[]).map(s => <div key={s} className="py-5 px-4"><div className="text-2xl font-bold tabular-nums">{rows.filter(r => r.status === s).length}</div><div className="text-sm text-muted-foreground">{statusLabels[s]}</div></div>)}</div>
    <Tabs value={kind} onValueChange={v => { setKind(v as IntegrationKind); setFilter('all'); setSearch('') }}><TabsList className="flex w-full h-auto flex-wrap justify-start">{(Object.keys(integrationLabels) as IntegrationKind[]).map(k => <TabsTrigger key={k} value={k} className="flex-1 min-w-28">{integrationLabels[k]} ({rows.filter(r => r.kind === k).length})</TabsTrigger>)}</TabsList></Tabs>
    <div className="flex flex-col sm:flex-row gap-3"><div className="relative flex-1"><Search className="absolute left-3 top-3 size-4 text-muted-foreground" /><Input aria-label="Pesquisar registros" placeholder="Pesquisar nome, pedido ou documento" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div><Select value={filter} onValueChange={setFilter}><SelectTrigger className="w-full sm:w-56" aria-label="Filtrar situação"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todas as situações</SelectItem>{Object.entries(statusLabels).map(([v,l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select></div>
    {query.isPending ? <div className="flex items-center gap-3 py-12 text-muted-foreground"><LoaderCircle className="size-5 animate-spin" />Conferindo Conta Azul…</div> : query.isError ? <p role="alert" className="text-destructive">{query.error.message}</p> : <>
      {message && <p role="status" className="text-tech">{message}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" disabled={locked || !eligible.length} onClick={() => setChecked(new Set(eligible.map(integrationRowKey)))}>Selecionar todas as pendências ({eligible.length})</Button>
        <Button variant="ghost" disabled={locked || !checked.size} onClick={() => setChecked(new Set())}>Limpar seleção</Button>
        <span className="text-sm text-muted-foreground">{chosen.length} selecionado(s) · todas as abas</span>
        <Button disabled={locked || !chosen.length} onClick={() => { setBatch(chosen); setResults([]); setSituation('EM_ANDAMENTO') }}><ArrowUpRight className="size-4" />Integrar selecionados ({chosen.length})</Button>
      </div>
      <div className="overflow-x-auto"><table className="w-full text-sm min-w-[760px]"><thead><tr className="border-b border-border text-left text-muted-foreground"><th className="py-3 pr-3"><Checkbox aria-label="Selecionar pendências visíveis" disabled={locked || !visibleEligible.length} checked={visibleChecked === 0 ? false : visibleChecked === visibleEligible.length ? true : 'indeterminate'} onCheckedChange={value => toggleRows(visibleEligible, value === true)} /></th><th className="py-3 pr-4">Registro</th><th className="py-3 px-3">SOS.3D</th><th className="py-3 px-3">Conta Azul</th><th className="py-3 px-3">Situação</th><th className="py-3 pl-3 text-right">Ação</th></tr></thead><tbody>{visible.map(r => <tr key={`${r.kind}:${r.id}`} className="border-b border-border align-top"><td className="py-4 pr-3"><Checkbox aria-label={`Selecionar ${r.name}`} disabled={locked || !eligibleIntegrationRows([r]).length} checked={checked.has(integrationRowKey(r))} onCheckedChange={value => toggleRows([r], value === true)} /></td><td className="py-4 pr-4 max-w-72"><p className="font-medium break-words">{r.name}</p><p className="text-xs text-muted-foreground mt-1 max-w-72 break-words">{r.detail}</p></td><td className="py-4 px-3 max-w-52 break-words">{r.local}</td><td className="py-4 px-3 max-w-52 break-words">{r.remote}</td><td className={`py-4 px-3 whitespace-nowrap ${r.status === 'erro' || r.status === 'divergente' ? 'text-destructive' : r.status === 'integrado' ? 'text-tech' : 'text-muted-foreground'}`}>{statusLabels[r.status]}</td><td className="py-4 pl-3 text-right">{r.action ? <Button size="sm" variant="outline" disabled={locked} onClick={() => { setSelected(r); setSituation('EM_ANDAMENTO'); mutation.reset() }}><ArrowUpRight className="size-4" />Forçar integração</Button> : <span className="text-muted-foreground">—</span>}</td></tr>)}</tbody></table></div>
      {!visible.length && <p className="py-10 text-center text-muted-foreground">Nenhum registro nesta situação.</p>}<p className="text-sm text-muted-foreground">{visible.length} registros</p>
    </>}
    <Dialog open={Boolean(selected)} onOpenChange={open => { if (!open && !mutation.isPending) setSelected(null) }}><DialogContent><DialogHeader><DialogTitle>Forçar integração</DialogTitle><DialogDescription>{selected?.name}</DialogDescription></DialogHeader>{selected?.kind === 'sales' ? <Select value={situation} onValueChange={v => setSituation(v === 'APROVADO' ? 'APROVADO' : 'EM_ANDAMENTO')}><SelectTrigger aria-label="Situação da venda"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="EM_ANDAMENTO">Em andamento — sem financeiro</SelectItem><SelectItem value="APROVADO">Aprovada — gera contas a receber</SelectItem></SelectContent></Select> : <p className="text-sm text-muted-foreground">Enviar o cadastro para a Conta Azul, reutilizando o vínculo existente quando localizado.</p>}{selected?.kind === 'sales' && situation === 'APROVADO' && <p className="text-sm text-destructive">Esta confirmação gera contas a receber na Conta Azul.</p>}{mutation.isError && <p role="alert" className="text-destructive text-sm">{mutation.error.message}</p>}<DialogFooter><Button variant="outline" onClick={() => setSelected(null)} disabled={mutation.isPending}>Cancelar</Button><Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>{mutation.isPending ? <LoaderCircle className="size-4 animate-spin" /> : <ArrowUpRight className="size-4" />}Confirmar integração</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={Boolean(batch)} onOpenChange={open => { if (!open && !batchBusy) setBatch(null) }}><DialogContent className="max-h-[90dvh] flex flex-col overflow-hidden"><DialogHeader><DialogTitle>Integrar selecionados</DialogTitle><DialogDescription>{batch?.length ?? 0} registros · {Object.entries(integrationLabels).map(([key, label]) => `${label}: ${batch?.filter(r => r.kind === key).length ?? 0}`).join(' · ')}</DialogDescription></DialogHeader>
      {batch?.some(r => r.kind === 'sales') && <><Select disabled={batchBusy || results.length > 0} value={situation} onValueChange={v => setSituation(v === 'APROVADO' ? 'APROVADO' : 'EM_ANDAMENTO')}><SelectTrigger aria-label="Situação das vendas do lote"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="EM_ANDAMENTO">Em andamento — sem financeiro</SelectItem><SelectItem value="APROVADO">Aprovadas — geram contas a receber</SelectItem></SelectContent></Select>{situation === 'APROVADO' && <p className="text-sm text-destructive">Todas as vendas selecionadas gerarão contas a receber na Conta Azul.</p>}</>}
      <p className="text-sm text-muted-foreground">Itens já integrados, divergentes e bloqueados não serão enviados. Mantenha esta página aberta até concluir.</p>
      <div className="min-h-0 overflow-y-auto space-y-3" aria-live="polite">
        {(batchBusy || results.length > 0) && <><p className="text-sm font-medium">{batchBusy ? stopping ? 'Parando após o item atual…' : 'Integrando…' : 'Processamento encerrado'} {results.length} / {batch?.length}</p><progress aria-label="Progresso da integração" className="w-full accent-primary" max={batch?.length || 1} value={results.length} /><p className="text-sm">{results.filter(r => r.ok).length} integrado(s) · {results.filter(r => !r.ok).length} com erro</p></>}
        {(batch ?? []).map(r => { const result = results.find(item => integrationRowKey(item.row) === integrationRowKey(r)); return <div key={integrationRowKey(r)} className="border-b border-border py-2 text-sm"><p className="font-medium break-words">{r.name}</p><p className={result?.ok ? 'text-tech' : result ? 'text-destructive' : 'text-muted-foreground'}>{result ? result.ok ? 'Integrado' : result.error || 'Falha no envio' : 'Aguardando'}</p></div> })}
      </div>
      <DialogFooter>{batchBusy ? <Button variant="outline" disabled={stopping} onClick={() => { stop.current = true; setStopping(true) }}>Parar após item atual</Button> : <><Button variant="outline" onClick={() => setBatch(null)}>{results.length ? 'Fechar' : 'Cancelar'}</Button>{!results.length && <Button onClick={startBatch}><ArrowUpRight className="size-4" />Confirmar integração em lote</Button>}</>}</DialogFooter>
    </DialogContent></Dialog>
  </div>
}