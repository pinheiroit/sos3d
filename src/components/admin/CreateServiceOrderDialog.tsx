import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { listCustomers } from "@/lib/admin.functions";
import { adminCreateServiceOrder } from "@/lib/service.functions";
import { osNumber } from "@/lib/service";

export function CreateServiceOrderDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const customers = useQuery({ queryKey: ["telesales-customers"], queryFn: () => listCustomers() });
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState("");
  const [form, setForm] = useState({ name: "", email: "", phone: "", document: "", brand: "", model: "", serial: "", problem: "", dueDays: 15 });
  const customer = customers.data?.find((c) => c.key === selected);
  const matches = (customers.data ?? []).filter((c) => `${c.name} ${c.email} ${c.document}`.toLocaleLowerCase().includes(search.toLocaleLowerCase())).slice(0, 10);
  const save = useMutation({
    mutationFn: () => adminCreateServiceOrder({ data: {
      userId: customer?.userId ?? null, customerId: customer?.customerId ?? null,
      customer: { name: form.name, email: form.email, phone: form.phone, document: form.document },
      equipment: { brand: form.brand, model: form.model, serial: form.serial },
      problem: form.problem, dueDays: form.dueDays,
    } }),
    onSuccess: (r) => { toast.success(`${osNumber(r.number)} criada`); onCreated(r.id); },
    onError: (e: Error) => toast.error(e.message),
  });
  return <Dialog open onOpenChange={(v) => !v && onClose()}>
    <DialogContent className="flex max-h-[90dvh] w-[calc(100%-1rem)] flex-col overflow-hidden p-0 sm:max-w-2xl">
      <DialogHeader className="shrink-0 border-b border-border p-4 pr-10 text-left"><DialogTitle>Nova ordem de serviço</DialogTitle><DialogDescription>Cliente e equipamento recebido</DialogDescription></DialogHeader>
      <form className="flex min-h-0 flex-col overflow-hidden" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
        <div className="min-h-0 space-y-4 overflow-y-auto p-4">
          <div className="space-y-2"><Label htmlFor="os-customer-search">Buscar cliente cadastrado</Label><Input id="os-customer-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nome, e-mail ou CPF/CNPJ" />
            {search && <div className="max-h-40 overflow-y-auto rounded-md border border-border">{matches.map((c) => <Button key={c.key} type="button" variant="ghost" className="h-auto w-full justify-start whitespace-normal py-2 text-left" onClick={() => { setSelected(c.key); setForm({ ...form, name: c.name, email: c.email, phone: c.phone, document: c.document }); setSearch(""); }}>{c.name} · {c.email || c.document}</Button>)}{!matches.length && <p className="p-3 text-sm text-muted-foreground">Nenhum cliente encontrado.</p>}</div>}
          </div>
          {customer && <div className="flex items-center justify-between gap-2 text-sm"><span className="min-w-0 break-words">Cliente selecionado: {customer.name}</span><Button type="button" variant="ghost" size="sm" onClick={() => setSelected("")}>Trocar</Button></div>}
          <div className="grid min-w-0 gap-3 sm:grid-cols-2">
            {([['name','Nome do cliente'],['document','CPF/CNPJ'],['email','E-mail'],['phone','Telefone'],['brand','Marca'],['model','Modelo'],['serial','Número de série']] as const).map(([key,label]) => <div key={key} className="min-w-0 space-y-1.5"><Label htmlFor={`os-${key}`}>{label}</Label><Input id={`os-${key}`} required={['name','brand','model','serial'].includes(key)} minLength={key === 'serial' || key === 'name' ? 2 : 1} disabled={Boolean(customer) && ['name','email','phone','document'].includes(key)} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} /></div>)}
            <div className="space-y-1.5"><Label htmlFor="os-deadline">Prazo em dias</Label><Input id="os-deadline" type="number" min={1} max={180} required value={form.dueDays} onChange={(e) => setForm({ ...form, dueDays: Number(e.target.value) })} /></div>
          </div>
          <div className="space-y-1.5"><Label htmlFor="os-problem">Defeito relatado</Label><Textarea id="os-problem" required minLength={3} maxLength={4000} rows={4} value={form.problem} onChange={(e) => setForm({ ...form, problem: e.target.value })} /></div>
        </div>
        <div className="grid shrink-0 grid-cols-2 gap-2 border-t border-border p-4"><Button type="button" variant="outline" onClick={onClose}>Cancelar</Button><Button type="submit" variant="tech" disabled={save.isPending}>{save.isPending ? "Criando…" : "Criar O.S."}</Button></div>
      </form>
    </DialogContent>
  </Dialog>;
}