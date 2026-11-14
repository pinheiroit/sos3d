import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { ArrowUpRight, RefreshCw, Search, LoaderCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  return <div className="space-y-6 pt-8">
    <div className="flex flex-wrap justify-between items-start gap-4"><div><h2 className="text-xl font-semibold">Conferência de integração</h2>{query.data && <p className="text-sm text-muted-foreground mt-1">Última conferência: {new Date(query.data.checkedAt).toLocaleString('pt-BR')}</p>}</div><Button variant="outline" onClick={() => query.refetch()} disabled={query.isFetching || mutation.isPending}><RefreshCw className={query.isFetching ? 'size-4 animate-spin' : 'size-4'} />Atualizar comparação</Button></div>
    <div className="grid grid-cols-2 lg:grid-cols-4 border-y border-border divide-x divide-border">{(['pendente', 'divergente', 'integrado', 'erro'] as IntegrationStatus[]).map(s => <div key={s} className="py-5 px-4"><div className="text-2xl font-bold tabular-nums">{rows.filter(r => r.status === s).length}</div><div className="text-sm text-muted-foreground">{statusLabels[s]}</div></div>)}</div>
    <Tabs value={kind} onValueChange={v => { setKind(v as IntegrationKind); setFilter('all'); setSearch('') }}><TabsList className="flex w-full h-auto flex-wrap justify-start">{(Object.keys(integrationLabels) as IntegrationKind[]).map(k => <TabsTrigger key={k} value={k} className="flex-1 min-w-28">{integrationLabels[k]} ({rows.filter(r => r.kind === k).length})</TabsTrigger>)}</TabsList></Tabs>
    <div className="flex flex-col sm:flex-row gap-3"><div className="relative flex-1"><Search className="absolute left-3 top-3 size-4 text-muted-foreground" /><Input aria-label="Pesquisar registros" placeholder="Pesquisar nome, pedido ou documento" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div><Select value={filter} onValueChange={setFilter}><SelectTrigger className="w-full sm:w-56" aria-label="Filtrar situação"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todas as situações</SelectItem>{Object.entries(statusLabels).map(([v,l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select></div>
    {query.isPending ? <div className="flex items-center gap-3 py-12 text-muted-foreground"><LoaderCircle className="size-5 animate-spin" />Conferindo Conta Azul…</div> : query.isError ? <p role="alert" className="text-destructive">{query.error.message}</p> : <>
      {message && <p role="status" className="text-tech">{message}</p>}
      <div className="overflow-x-auto"><table className="w-full text-sm min-w-[760px]"><thead><tr className="border-b border-border text-left text-muted-foreground"><th className="py-3 pr-4">Registro</th><th className="py-3 px-3">SOS.3D</th><th className="py-3 px-3">Conta Azul</th><th className="py-3 px-3">Situação</th><th className="py-3 pl-3 text-right">Ação</th></tr></thead><tbody>{visible.map(r => <tr key={`${r.kind}:${r.id}`} className="border-b border-border align-top"><td className="py-4 pr-4 max-w-72"><p className="font-medium break-words">{r.name}</p><p className="text-xs text-muted-foreground mt-1 max-w-72 break-words">{r.detail}</p></td><td className="py-4 px-3 max-w-52 break-words">{r.local}</td><td className="py-4 px-3 max-w-52 break-words">{r.remote}</td><td className={`py-4 px-3 whitespace-nowrap ${r.status === 'erro' || r.status === 'divergente' ? 'text-destructive' : r.status === 'integrado' ? 'text-tech' : 'text-muted-foreground'}`}>{statusLabels[r.status]}</td><td className="py-4 pl-3 text-right">{r.action ? <Button size="sm" variant="outline" disabled={mutation.isPending || query.isFetching} onClick={() => { setSelected(r); setSituation('EM_ANDAMENTO'); mutation.reset() }}><ArrowUpRight className="size-4" />Forçar integração</Button> : <span className="text-muted-foreground">—</span>}</td></tr>)}</tbody></table></div>
      {!visible.length && <p className="py-10 text-center text-muted-foreground">Nenhum registro nesta situação.</p>}<p className="text-sm text-muted-foreground">{visible.length} registros</p>
    </>}
    <Dialog open={Boolean(selected)} onOpenChange={open => { if (!open && !mutation.isPending) setSelected(null) }}><DialogContent><DialogHeader><DialogTitle>Forçar integração</DialogTitle><DialogDescription>{selected?.name}</DialogDescription></DialogHeader>{selected?.kind === 'sales' ? <Select value={situation} onValueChange={v => setSituation(v === 'APROVADO' ? 'APROVADO' : 'EM_ANDAMENTO')}><SelectTrigger aria-label="Situação da venda"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="EM_ANDAMENTO">Em andamento — sem financeiro</SelectItem><SelectItem value="APROVADO">Aprovada — gera contas a receber</SelectItem></SelectContent></Select> : <p className="text-sm text-muted-foreground">Enviar o cadastro para a Conta Azul, reutilizando o vínculo existente quando localizado.</p>}{selected?.kind === 'sales' && situation === 'APROVADO' && <p className="text-sm text-destructive">Esta confirmação gera contas a receber na Conta Azul.</p>}{mutation.isError && <p role="alert" className="text-destructive text-sm">{mutation.error.message}</p>}<DialogFooter><Button variant="outline" onClick={() => setSelected(null)} disabled={mutation.isPending}>Cancelar</Button><Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>{mutation.isPending ? <LoaderCircle className="size-4 animate-spin" /> : <ArrowUpRight className="size-4" />}Confirmar integração</Button></DialogFooter></DialogContent></Dialog>
  </div>
}