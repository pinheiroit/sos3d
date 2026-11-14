import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, CircleAlert, LoaderCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSession } from '@/lib/session'
import { contaAzulRedirectUri } from '@/lib/conta-azul-oauth'

export const Route = createFileRoute('/callback')({
  head: () => ({ meta: [{ title: 'Autorização Conta Azul — SOS.3D' }, { name: 'description', content: 'Confirmação da autorização da Conta Azul para a SOS.3D.' }, { property: 'og:title', content: 'Autorização Conta Azul — SOS.3D' }, { property: 'og:description', content: 'Resultado da conexão com a Conta Azul.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }, { name: 'robots', content: 'noindex,nofollow' }, { name: 'referrer', content: 'no-referrer' }] }),
  component: Callback,
})

function Callback() {
  const { session, ready } = useSession()
  const started = useRef(false)
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)
  useEffect(() => {
    if (!ready || started.current) return
    started.current = true
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code'), state = params.get('state')
    window.history.replaceState(window.history.state, '', '/callback')
    if (params.has('error')) { setResult({ ok: false, message: 'Autorização não concedida na Conta Azul.' }); return }
    if (!code || !state) { setResult({ ok: false, message: 'Retorno inválido. Inicie a conexão novamente.' }); return }
    if (!session) { setResult({ ok: false, message: 'Sua sessão expirou. Entre novamente e reinicie a conexão.' }); return }
    fetch('/api/public/conta-azul-auth', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ code, state, redirect_uri: contaAzulRedirectUri }) })
      .then(async response => { const body = await response.json(); setResult({ ok: response.ok && body.connected === true, message: response.ok && body.connected === true ? 'Conta Azul conectada com sucesso.' : body.error ?? 'Não foi possível concluir a conexão.' }) })
      .catch(() => setResult({ ok: false, message: 'Não foi possível concluir a conexão. Tente conectar novamente.' }))
  }, [ready, session])
  return <section className="container-page py-16 max-w-3xl space-y-6"><h1 className="text-3xl font-bold">Conexão com a Conta Azul</h1>{!result ? <div className="flex items-center gap-3"><LoaderCircle className="size-6 animate-spin text-tech" /><p>Concluindo autorização…</p></div> : <div role="status" className="flex items-start gap-3">{result.ok ? <CheckCircle2 className="size-7 text-tech shrink-0" /> : <CircleAlert className="size-7 text-destructive shrink-0" />}<p>{result.message}</p></div>}{result && <Button asChild><Link to="/integracoes">Voltar às integrações</Link></Button>}</section>
}