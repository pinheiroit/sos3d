import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { Plug, LoaderCircle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSession } from '@/lib/session'
import { beginContaAzulConnection, contaAzulConnection } from '@/lib/conta-azul.functions'

export const Route = createFileRoute('/integracoes')({
  head: () => ({ meta: [{ title: 'Integrações — SOS.3D' }, { name: 'description', content: 'Configurações de conexão da SOS.3D com a Conta Azul.' }, { property: 'og:title', content: 'Integrações — SOS.3D' }, { property: 'og:description', content: 'Gerencie a conexão financeira com a Conta Azul.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }, { name: 'robots', content: 'noindex,nofollow' }] }),
  component: Integrations,
})

function Integrations() {
  const { session, ready } = useSession()
  const statusFn = useServerFn(contaAzulConnection)
  const begin = useServerFn(beginContaAzulConnection)
  const [status, setStatus] = useState<{ connected: boolean; updatedAt: string | null } | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (!session) return
    let active = true
    statusFn().then(value => { if (active) setStatus(value) }).catch(() => { if (active) setError('Acesso restrito a administradores ou conexão indisponível.') })
    return () => { active = false }
  }, [session, statusFn])
  async function connect() {
    setBusy(true); setError('')
    try { const result = await begin(); window.location.assign(result.url) }
    catch { setError('Não foi possível iniciar a conexão. Confira seu acesso e as credenciais da Conta Azul.'); setBusy(false) }
  }
  return <section className="container-page py-12 max-w-4xl"><h1 className="text-3xl font-bold mb-8">Integrações</h1>{!ready ? <LoaderCircle className="size-6 animate-spin" aria-label="Carregando" /> : !session ? <div className="space-y-4"><p>Entre com sua conta de administrador.</p><Button asChild><Link to="/auth">Entrar</Link></Button></div> : <div className="border-y border-border py-8 space-y-5"><div className="flex items-center gap-3"><Plug className="size-7 text-tech" /><h2 className="text-xl font-semibold">Conta Azul</h2></div>{status && <p className="flex items-center gap-2 text-muted-foreground">{status.connected && <CheckCircle2 className="size-5 text-tech" />}{status.connected ? 'Conta autorizada' : 'Não conectada'}</p>}{status?.updatedAt && <p className="text-sm text-muted-foreground">Última autorização: {new Date(status.updatedAt).toLocaleString('pt-BR')}</p>}{error && <p role="alert" className="text-destructive">{error}</p>}<Button onClick={connect} disabled={busy || !status}><Plug className="size-4" />{busy ? 'Conectando…' : 'Conectar Conta Azul'}</Button></div>}</section>
}