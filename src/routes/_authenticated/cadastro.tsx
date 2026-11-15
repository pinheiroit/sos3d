import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useMutation, useSuspenseQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { myFiscalProfile, saveMyFiscalProfile } from '@/lib/customer-profile.functions'
import { missingFiscalFields } from '@/lib/customer-fiscal'

const profileOptions = { queryKey: ['my-fiscal-profile'], queryFn: () => myFiscalProfile() }
export const Route = createFileRoute('/_authenticated/cadastro')({
  loader: ({ context }) => context.queryClient.ensureQueryData(profileOptions),
  head: () => ({ meta: [
    { title: 'Meu cadastro fiscal | SOS.3D' },
    { name: 'description', content: 'Atualize seus dados de contato e endereço para emissão de nota fiscal na SOS.3D.' },
    { property: 'og:title', content: 'Meu cadastro fiscal | SOS.3D' },
    { property: 'og:description', content: 'Dados fiscais e endereço do cliente SOS.3D.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' },
    { name: 'robots', content: 'noindex' },
  ] }),
  component: CustomerProfile,
})
function CustomerProfile() {
  const { data } = useSuspenseQuery(profileOptions)
  const [form, setForm] = useState({ name: data?.name ?? '', phone: data?.phone ?? '', document: data?.document ?? '', street: data?.street ?? '', number: data?.number ?? '', neighborhood: data?.neighborhood ?? '', city: data?.city ?? '', state: data?.state ?? '', zip: data?.zip ?? '', complement: data?.complement ?? '' })
  const save = useMutation({ mutationFn: () => saveMyFiscalProfile({ data: form }), onSuccess: () => toast.success('Cadastro fiscal atualizado'), onError: (e: Error) => toast.error(e.message) })
  return <main className="container-page max-w-3xl py-12">
    <h1 className="text-3xl font-bold">Meu cadastro</h1>
    <form className="mt-8 grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); const missing = missingFiscalFields(form); if (missing.length) { toast.error(`Preencha os dados fiscais: ${missing.join(', ')}`); return; } save.mutate(); }}>
      {([['name','Nome completo'],['phone','Telefone'],['document','CPF / CNPJ'],['zip','CEP'],['street','Endereço'],['number','Número'],['neighborhood','Bairro'],['city','Cidade'],['state','Estado'],['complement','Complemento']] as const).map(([key,label]) => <div key={key}>
        <Label htmlFor={`fiscal-${key}`}>{label}{key !== 'complement' ? ' *' : ''}</Label>
        <Input id={`fiscal-${key}`} className="mt-2" required={key !== 'complement'} value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} />
      </div>)}
      <div className="flex flex-wrap gap-3 sm:col-span-2"><Button type="submit" variant="cta" disabled={save.isPending}>Salvar cadastro</Button><Button asChild variant="outline"><Link to="/checkout">Voltar ao pedido</Link></Button></div>
    </form>
  </main>
}