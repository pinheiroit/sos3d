import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { toast } from 'sonner'
import { CloudUpload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { contaAzulOrderSyncs, sendOrderToContaAzul } from '@/lib/conta-azul.functions'

export function ContaAzulOrderButton({ orderId, reference, cancelled }: { orderId: string; reference: string; cancelled: boolean }) {
  const list = useServerFn(contaAzulOrderSyncs)
  const send = useServerFn(sendOrderToContaAzul)
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const { data } = useQuery({ queryKey: ['conta-azul-order-syncs'], queryFn: () => list(), staleTime: 30_000 })
  const sync = data?.find(s => s.order_id === orderId)
  const mutation = useMutation({
    mutationFn: (situacao: 'EM_ANDAMENTO' | 'APROVADO') => send({ data: { orderId, situacao } }),
    onSuccess: result => {
      if (result.ok) { toast.success(`Pedido ${reference} enviado à Conta Azul${result.number ? ` (venda nº ${result.number})` : ''}.`); setOpen(false) }
      else toast.error(result.error)
      queryClient.invalidateQueries({ queryKey: ['conta-azul-order-syncs'] })
    },
    onError: () => toast.error('Não foi possível enviar à Conta Azul.'),
  })
  if (sync?.status === 'enviado') return <Badge variant="outline" title={sync.situacao === 'APROVADO' ? 'Venda aprovada' : 'Venda em andamento'}>Conta Azul nº {sync.external_number ?? '—'}</Badge>
  if (cancelled) return null
  return <>
    <Button size="sm" variant="outline" onClick={() => setOpen(true)} disabled={sync?.status === 'enviando'} title={sync?.status === 'erro' ? sync.error ?? '' : undefined}>
      <CloudUpload className="size-4" />{sync?.status === 'erro' ? 'Reenviar à Conta Azul' : sync?.status === 'enviando' ? 'Enviando…' : 'Enviar à Conta Azul'}
    </Button>
    <Dialog open={open} onOpenChange={value => !mutation.isPending && setOpen(value)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enviar pedido {reference} à Conta Azul</DialogTitle>
          <DialogDescription>O cliente e os produtos são localizados na Conta Azul ou cadastrados automaticamente. Cada pedido só pode ser enviado uma vez.</DialogDescription>
        </DialogHeader>
        {sync?.status === 'erro' && <p role="alert" className="text-sm text-destructive">Última tentativa: {sync.error}</p>}
        <div className="grid gap-3">
          <Button variant="outline" disabled={mutation.isPending} onClick={() => mutation.mutate('EM_ANDAMENTO')}>Enviar como venda em andamento (teste, sem financeiro)</Button>
          <Button disabled={mutation.isPending} onClick={() => mutation.mutate('APROVADO')}>Enviar como venda aprovada (gera contas a receber)</Button>
        </div>
        {mutation.isPending && <p className="text-sm text-muted-foreground">Enviando… aguarde.</p>}
      </DialogContent>
    </Dialog>
  </>
}
