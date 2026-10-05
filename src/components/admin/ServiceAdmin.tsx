import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, Download, History, PackageCheck, Plus, Search, Trash2, Wrench } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { formatBRL } from "@/lib/catalog";
import {
  BUDGET_STATUS,
  CLOSED_ORDER_STATUS,
  CLOSING_REASON,
  FAILURE_TYPES,
  ORDER_STATUS,
  PART_ORIGIN,
  REQUEST_STATUS,
  VALIDATION_RESULT,
  WARRANTY_STATUS,
  budgetTotal,
  fmtDate,
  fmtDateTime,
  osNumber,
  paNumber,
  statusTone,
} from "@/lib/service";
import {
  adminConfirmReception,
  adminCreatePrivateTerm,
  adminListEquipment,
  adminServiceBoard,
  adminUpdateOrder,
  adminUpdateRequest,
  getServiceDetail,
} from "@/lib/service.functions";
import { printFinal, printReceipt, printTerm } from "@/lib/service-pdf";
import { EventTimeline, FileDrop, FileGrid, OrderProgress, type ServiceEvent, type ServiceFile } from "@/components/service/ServiceShared";
import { EquipmentHistoryDialog, TransferDialog } from "@/components/service/MemberService";

type Any = any; // eslint-disable-line @typescript-eslint/no-explicit-any
type Mini = { id: string; brand: string; model: string; serial: string } | null;
type Board = {
  requests: { id: string; number: number; status: string; problem: string; error_code: string; created_at: string; user_id: string; equipment: Mini }[];
  orders: {
    id: string;
    number: number;
    status: string;
    warranty_status: string;
    budget_status: string;
    received_at: string;
    due_at: string | null;
    closed_at: string | null;
    updated_at: string;
    user_id: string | null;
    request_id: string | null;
    equipment: Mini;
  }[];
  customers: Record<string, { name: string; email: string; phone: string; document: string }>;
};

const BOARD = ["service-board"];
const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export function ServiceAdmin() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: BOARD, queryFn: () => adminServiceBoard() as unknown as Promise<Board> });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("abertas");
  const [dateFrom, setDateFrom] = useState("");
  const [open, setOpen] = useState<{ kind: "request" | "order"; id: string } | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: BOARD });

  const d = q.data;
  const now = Date.now();
  const isOverdue = (o: Board["orders"][number]) => !o.closed_at && !CLOSED_ORDER_STATUS.includes(o.status) && o.due_at && new Date(o.due_at).getTime() < now;

  const counts = useMemo(() => {
    const os = (d?.orders ?? []).filter((o) => !o.closed_at);
    const c = (s: string) => os.filter((o) => o.status === s).length;
    return [
      { label: "Recebidos", value: c("recebido") + c("em_triagem"), status: "recebido" },
      { label: "Em diagnóstico", value: c("em_diagnostico"), status: "em_diagnostico" },
      { label: "Aguardando cliente", value: c("aguardando_cliente"), status: "aguardando_cliente" },
      { label: "Aguardando fabricante", value: c("aguardando_fabricante") + c("analise_garantia"), status: "aguardando_fabricante" },
      { label: "Aguardando peças", value: c("aguardando_peca"), status: "aguardando_peca" },
      { label: "Em manutenção", value: c("em_manutencao"), status: "em_manutencao" },
      { label: "Em testes", value: c("em_testes"), status: "em_testes" },
      { label: "Prontos p/ retirada", value: c("pronto_retirada"), status: "pronto_retirada" },
      { label: "O.S. atrasadas", value: os.filter(isOverdue).length, status: "atrasadas", alert: true },
    ];
  }, [d]); // eslint-disable-line react-hooks/exhaustive-deps

  const match = (userId: string | null, eq: Mini, extra: string[]) => {
    if (!search.trim()) return true;
    const c = userId ? d?.customers[userId] : undefined;
    const hay = norm([c?.name, c?.email, c?.phone, c?.document, c?.document?.replace(/\D/g, ""), c?.phone?.replace(/\D/g, ""), eq?.brand, eq?.model, eq?.serial, ...extra].filter(Boolean).join(" "));
    return norm(search).split(/\s+/).every((t) => hay.includes(t));
  };
  const afterDate = (v: string) => !dateFrom || v.slice(0, 10) >= dateFrom;

  const requests = (d?.requests ?? []).filter(
    (r) =>
      r.status !== "convertida" &&
      (statusFilter === "todas" || (statusFilter === "abertas" ? r.status !== "cancelado" : r.status === statusFilter)) &&
      afterDate(r.created_at) &&
      match(r.user_id, r.equipment, [paNumber(r.number), String(r.number), r.problem, r.error_code]),
  );
  const orders = (d?.orders ?? []).filter(
    (o) =>
      (statusFilter === "todas" ||
        (statusFilter === "abertas" ? !o.closed_at : statusFilter === "atrasadas" ? isOverdue(o) : o.status === statusFilter || (statusFilter === "aguardando_fabricante" && o.status === "analise_garantia"))) &&
      afterDate(o.received_at) &&
      match(o.user_id, o.equipment, [osNumber(o.number), String(o.number), ORDER_STATUS[o.status]]),
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-9">
        {counts.map((c) => (
          <button
            key={c.label}
            type="button"
            onClick={() => setStatusFilter(statusFilter === c.status ? "abertas" : c.status)}
            className={cn(
              "rounded-xl border bg-card p-3 text-left transition-colors hover:border-tech/60",
              statusFilter === c.status ? "border-tech ring-1 ring-tech" : "border-border",
              c.alert && c.value > 0 && "border-destructive/60",
            )}
          >
            <p className={cn("text-2xl font-bold", c.alert && c.value > 0 && "text-destructive")}>{c.value}</p>
            <p className="text-[11px] leading-tight text-muted-foreground">{c.label}</p>
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nº O.S., nº P.A., cliente, CPF/CNPJ, telefone, série, equipamento, modelo…"
          />
        </div>
        <select aria-label="Status" className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="abertas">Em aberto</option>
          <option value="todas">Todos</option>
          <option value="atrasadas">Atrasadas</option>
          <optgroup label="O.S.">
            {Object.entries(ORDER_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </optgroup>
          <optgroup label="P.A.">
            {Object.entries(REQUEST_STATUS).filter(([k]) => k !== "convertida").map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </optgroup>
        </select>
        <Input aria-label="A partir de" type="date" className="md:w-44" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
      </div>

      <Tabs defaultValue="os">
        <TabsList>
          <TabsTrigger value="os">Ordens de serviço ({orders.length})</TabsTrigger>
          <TabsTrigger value="pa">Pré-atendimentos ({requests.length})</TabsTrigger>
          <TabsTrigger value="eq">Equipamentos</TabsTrigger>
        </TabsList>

        <TabsContent value="os" className="mt-4">
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            {q.isLoading && <p className="p-6 text-sm text-muted-foreground">Carregando…</p>}
            {!q.isLoading && orders.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">Nenhuma O.S. com esses filtros.</p>}
            {orders.map((o) => {
              const c = o.user_id ? d?.customers[o.user_id] : undefined;
              return (
                <button key={o.id} type="button" onClick={() => setOpen({ kind: "order", id: o.id })} className="grid w-full gap-2 border-b border-border p-4 text-left last:border-b-0 hover:bg-secondary/40 md:grid-cols-[110px_1fr_1fr_190px_110px] md:items-center">
                  <span className="font-bold">{osNumber(o.number)}</span>
                  <span className="min-w-0"><span className="block truncate font-medium">{o.equipment?.brand} {o.equipment?.model}</span><span className="text-xs text-muted-foreground">Série {o.equipment?.serial}</span></span>
                  <span className="min-w-0 truncate text-sm">{c?.name || c?.email || "—"}<span className="block text-xs text-muted-foreground">{c?.phone}</span></span>
                  <span className="flex flex-wrap gap-1">
                    <Badge variant={statusTone(o.status)}>{ORDER_STATUS[o.status]}</Badge>
                    {isOverdue(o) && <Badge variant="destructive" className="gap-1"><AlertTriangle className="size-3" /> Atrasada</Badge>}
                  </span>
                  <span className="text-xs text-muted-foreground">{fmtDate(o.received_at)}</span>
                </button>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="pa" className="mt-4">
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            {!q.isLoading && requests.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">Nenhum pré-atendimento com esses filtros.</p>}
            {requests.map((r) => {
              const c = d?.customers[r.user_id];
              return (
                <button key={r.id} type="button" onClick={() => setOpen({ kind: "request", id: r.id })} className="grid w-full gap-2 border-b border-border p-4 text-left last:border-b-0 hover:bg-secondary/40 md:grid-cols-[110px_1fr_1fr_220px_110px] md:items-center">
                  <span className="font-bold">{paNumber(r.number)}</span>
                  <span className="min-w-0"><span className="block truncate font-medium">{r.equipment?.brand} {r.equipment?.model}</span><span className="block truncate text-xs text-muted-foreground">{r.problem}</span></span>
                  <span className="min-w-0 truncate text-sm">{c?.name || c?.email || "—"}<span className="block text-xs text-muted-foreground">{c?.phone}</span></span>
                  <span><Badge variant={statusTone(r.status)}>{REQUEST_STATUS[r.status]}</Badge></span>
                  <span className="text-xs text-muted-foreground">{fmtDate(r.created_at)}</span>
                </button>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="eq" className="mt-4">
          <EquipmentAdmin search={search} />
        </TabsContent>
      </Tabs>

      {open?.kind === "request" && <RequestDialog id={open.id} onClose={() => setOpen(null)} onChanged={refresh} onConverted={(id) => setOpen({ kind: "order", id })} />}
      {open?.kind === "order" && <OrderDialog id={open.id} onClose={() => setOpen(null)} onChanged={refresh} />}
    </div>
  );
}

type Detail = { kind: string; row: Any; request: Any | null; events: ServiceEvent[]; files: ServiceFile[]; owner: Any };

function useDetail(kind: "request" | "order", id: string) {
  return useQuery({
    queryKey: ["service-detail", kind, id],
    queryFn: () => getServiceDetail({ data: { kind, id } } as never) as Promise<Detail>,
  });
}

function F({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function Sel({ value, onChange, options, label }: { value: string; onChange: (v: string) => void; options: Record<string, string>; label: string }) {
  return (
    <select aria-label={label} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={value} onChange={(e) => onChange(e.target.value)}>
      {Object.entries(options).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
    </select>
  );
}

function RequestDialog({ id, onClose, onChanged, onConverted }: { id: string; onClose: () => void; onChanged: () => void; onConverted: (id: string) => void }) {
  const qc = useQueryClient();
  const q = useDetail("request", id);
  const r = q.data?.row;
  const [status, setStatus] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [receiving, setReceiving] = useState(false);
  const [rec, setRec] = useState({ accessories: "", visual_condition: "", damages: "", missing_parts: "", modifications: "", has_invoice: false, notes: "" });
  const [dueDays, setDueDays] = useState(15);
  const reload = () => { qc.invalidateQueries({ queryKey: ["service-detail", "request", id] }); onChanged(); };

  const upd = useMutation({
    mutationFn: () => adminUpdateRequest({ data: { id, status: status ?? r!.status, message } } as never),
    onSuccess: () => { toast.success("Pré-atendimento atualizado"); setMessage(""); reload(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const convert = useMutation({
    mutationFn: () => adminConfirmReception({ data: { requestId: id, reception: rec, dueDays } } as never) as Promise<{ id: string; number: number }>,
    onSuccess: (os) => { toast.success(`${osNumber(os.number)} gerada`); onChanged(); onConverted(os.id); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-4xl">
        {!r ? <p className="p-6 text-sm text-muted-foreground">Carregando…</p> : (
          <div className="space-y-6">
            <DialogHeader>
              <DialogTitle className="text-xl">{paNumber(r.number)} — {r.equipment?.brand} {r.equipment?.model}</DialogTitle>
              <DialogDescription>Série {r.equipment?.serial} · aberto em {fmtDateTime(r.created_at)}</DialogDescription>
            </DialogHeader>
            <CustomerBox owner={q.data!.owner} />

            <section className="grid gap-3 text-sm md:grid-cols-2">
              <Info label="Tipo de falha" value={FAILURE_TYPES.find((t) => t.value === r.failure_type)?.label} />
              <Info label="Código de erro" value={r.error_code} />
              <Info label="Descrição do problema" value={r.problem} className="md:col-span-2" />
              <Info label="Quando começou" value={r.started_when} />
              <Info label="Frequência" value={r.frequency} />
              <Info label="Procedimentos já realizados" value={r.steps_tried} className="md:col-span-2" />
              <Info label="Nota fiscal" value={r.equipment?.invoice_number ? `${r.equipment.invoice_number} — ${fmtDate(r.equipment.invoice_date)}` : "Não informada"} />
              <Info label="Compra" value={`${fmtDate(r.equipment?.purchase_date)}${r.equipment?.order_reference ? ` · Pedido ${r.equipment.order_reference}` : ""}`} />
            </section>

            <section>
              <p className="mb-2 font-semibold">Anexos do cliente</p>
              <FileGrid files={q.data!.files} staff />
            </section>

            {r.status === "convertida" ? (
              <div className="flex items-center justify-between rounded-lg border border-tech/40 bg-tech/5 p-4">
                <span className="text-sm">Este P.A. já foi convertido em O.S.</span>
                <Button size="sm" variant="tech" onClick={() => onConverted(r.service_order_id)}>Abrir O.S. <ArrowRight /></Button>
              </div>
            ) : (
              <>
                <section className="rounded-xl border border-border p-4">
                  <p className="mb-3 font-semibold">Status e orientação ao cliente</p>
                  <div className="grid gap-3 md:grid-cols-[260px_1fr]">
                    <Sel label="Status" value={status ?? r.status} onChange={setStatus} options={Object.fromEntries(Object.entries(REQUEST_STATUS).filter(([k]) => k !== "convertida"))} />
                    <Textarea rows={2} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Mensagem visível ao cliente (ex.: envie um vídeo com áudio do ruído)" />
                  </div>
                  <Button className="mt-3" variant="tech" size="sm" disabled={upd.isPending} onClick={() => upd.mutate()}>Salvar</Button>
                </section>

                {r.status !== "cancelado" && (
                  <section className="rounded-xl border border-accent/60 bg-accent/5 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold">Recebimento físico do equipamento</p>
                        <p className="text-xs text-muted-foreground">Confira o equipamento e confirme para gerar a O.S. sequencial e o comprovante.</p>
                      </div>
                      {!receiving && <Button variant="cta" onClick={() => setReceiving(true)}><PackageCheck /> Registrar recebimento</Button>}
                    </div>
                    {receiving && (
                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        <F label="Acessórios entregues"><Textarea rows={2} value={rec.accessories} onChange={(e) => setRec({ ...rec, accessories: e.target.value })} /></F>
                        <F label="Condição visual"><Textarea rows={2} value={rec.visual_condition} onChange={(e) => setRec({ ...rec, visual_condition: e.target.value })} /></F>
                        <F label="Avarias aparentes"><Textarea rows={2} value={rec.damages} onChange={(e) => setRec({ ...rec, damages: e.target.value })} /></F>
                        <F label="Peças faltantes"><Textarea rows={2} value={rec.missing_parts} onChange={(e) => setRec({ ...rec, missing_parts: e.target.value })} /></F>
                        <F label="Modificações identificadas"><Textarea rows={2} value={rec.modifications} onChange={(e) => setRec({ ...rec, modifications: e.target.value })} /></F>
                        <F label="Observações da conferência"><Textarea rows={2} value={rec.notes} onChange={(e) => setRec({ ...rec, notes: e.target.value })} /></F>
                        <label className="flex items-center gap-2 text-sm"><Switch checked={rec.has_invoice} onCheckedChange={(v) => setRec({ ...rec, has_invoice: v })} /> Nota fiscal apresentada</label>
                        <F label="Prazo previsto (dias)"><Input type="number" min={1} max={180} value={dueDays} onChange={(e) => setDueDays(Number(e.target.value) || 15)} /></F>
                        <p className="text-xs text-muted-foreground md:col-span-2">As fotos do equipamento no recebimento podem ser anexadas na O.S. logo após a confirmação.</p>
                        <div className="flex gap-2 md:col-span-2">
                          <Button variant="cta" disabled={convert.isPending} onClick={() => convert.mutate()}>{convert.isPending ? "Gerando…" : "Confirmar recebimento e gerar O.S."}</Button>
                          <Button variant="ghost" onClick={() => setReceiving(false)}>Cancelar</Button>
                        </div>
                      </div>
                    )}
                  </section>
                )}
              </>
            )}

            <section>
              <p className="mb-3 font-semibold">Histórico</p>
              <EventTimeline events={q.data!.events} staff />
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CustomerBox({ owner }: { owner: Any }) {
  return (
    <div className="grid gap-2 rounded-lg border border-border bg-secondary/30 p-3 text-sm sm:grid-cols-4">
      <span><span className="block text-xs text-muted-foreground">Cliente</span>{owner.name || "—"}</span>
      <span><span className="block text-xs text-muted-foreground">CPF/CNPJ</span>{owner.document || "—"}</span>
      <span><span className="block text-xs text-muted-foreground">Telefone</span>{owner.phone || "—"}</span>
      <span className="truncate"><span className="block text-xs text-muted-foreground">E-mail</span>{owner.email || "—"}</span>
    </div>
  );
}

function Info({ label, value, className }: { label: string; value?: string | null | undefined; className?: string }) {
  return (
    <div className={cn("rounded-lg border border-border p-3", className)}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 whitespace-pre-line">{value || "—"}</p>
    </div>
  );
}

type FieldDef = { key: string; label: string; type?: "text" | "area" | "number" | "date" | "select" | "bool"; options?: Record<string, string>; wide?: boolean };

function SectionForm({
  orderId,
  section,
  fields,
  values,
  disabled,
  onSaved,
  extra,
  stage,
}: {
  orderId: string;
  section: string;
  fields: FieldDef[];
  values: Any;
  disabled?: boolean;
  onSaved: () => void;
  extra?: (v: Any, set: (v: Any) => void) => React.ReactNode;
  stage?: string;
}) {
  const [v, setV] = useState<Any>(() => ({ ...values }));
  const m = useMutation({
    mutationFn: () => {
      const payload: Any = {};
      for (const f of fields) payload[f.key] = f.type === "number" ? (v[f.key] === "" || v[f.key] == null ? null : Number(v[f.key])) : v[f.key] ?? (f.type === "bool" ? false : "");
      if (v.parts) payload.parts = v.parts;
      return adminUpdateOrder({ data: { id: orderId, section, values: payload } } as never);
    },
    onSuccess: () => { toast.success("Registro salvo no histórico"); onSaved(); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        {fields.map((f) => (
          <F key={f.key} label={f.label} className={f.wide || f.type === "area" ? "md:col-span-2" : undefined}>
            {f.type === "area" ? (
              <Textarea rows={3} disabled={disabled} value={v[f.key] ?? ""} onChange={(e) => setV({ ...v, [f.key]: e.target.value })} />
            ) : f.type === "select" ? (
              <Sel label={f.label} value={v[f.key] ?? ""} onChange={(x) => setV({ ...v, [f.key]: x })} options={{ "": "—", ...f.options! }} />
            ) : f.type === "bool" ? (
              <div className="flex h-10 items-center"><Switch disabled={disabled} checked={Boolean(v[f.key])} onCheckedChange={(x) => setV({ ...v, [f.key]: x })} /></div>
            ) : (
              <Input type={f.type ?? "text"} step={f.type === "number" ? "0.01" : undefined} disabled={disabled} value={v[f.key] ?? ""} onChange={(e) => setV({ ...v, [f.key]: e.target.value })} />
            )}
          </F>
        ))}
      </div>
      {extra?.(v, setV)}
      {values.updated_by && <p className="text-xs text-muted-foreground">Última atualização: {values.updated_by} em {fmtDateTime(values.updated_at)}</p>}
      {!disabled && <Button variant="tech" disabled={m.isPending} onClick={() => m.mutate()}>{m.isPending ? "Salvando…" : "Salvar registro"}</Button>}
      {stage && (
        <div className="pt-2">
          <p className="mb-2 text-sm font-semibold">Anexos desta etapa</p>
          <FileDrop scope="order" id={orderId} stage={stage} staff onDone={onSaved} hint="Fotos, vídeos, logs, capturas e documentos técnicos." />
        </div>
      )}
    </div>
  );
}

function PartsEditor({ v, set, disabled }: { v: Any; set: (v: Any) => void; disabled?: boolean }) {
  const parts: Any[] = Array.isArray(v.parts) ? v.parts : [];
  const upd = (i: number, k: string, val: string) => set({ ...v, parts: parts.map((p, j) => (j === i ? { ...p, [k]: val } : p)) });
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold">Peças substituídas</p>
        {!disabled && <Button size="sm" variant="outline" onClick={() => set({ ...v, parts: [...parts, { name: "", code: "", qty: "1", serial: "", lot: "", origin: "estoque" }] })}><Plus /> Peça</Button>}
      </div>
      {parts.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma peça registrada.</p>}
      <div className="space-y-2">
        {parts.map((p, i) => (
          <div key={i} className="grid gap-2 md:grid-cols-[2fr_1fr_70px_1fr_1fr_1.3fr_36px]">
            <Input placeholder="Nome da peça" value={p.name} onChange={(e) => upd(i, "name", e.target.value)} disabled={disabled} />
            <Input placeholder="Código" value={p.code} onChange={(e) => upd(i, "code", e.target.value)} disabled={disabled} />
            <Input placeholder="Qtd" value={p.qty} onChange={(e) => upd(i, "qty", e.target.value)} disabled={disabled} />
            <Input placeholder="Nº série" value={p.serial} onChange={(e) => upd(i, "serial", e.target.value)} disabled={disabled} />
            <Input placeholder="Lote" value={p.lot} onChange={(e) => upd(i, "lot", e.target.value)} disabled={disabled} />
            <Sel label="Origem" value={p.origin} onChange={(x) => upd(i, "origin", x)} options={PART_ORIGIN} />
            {!disabled && <Button size="icon" variant="ghost" aria-label="Remover peça" onClick={() => set({ ...v, parts: parts.filter((_, j) => j !== i) })}><Trash2 className="size-4" /></Button>}
          </div>
        ))}
      </div>
    </div>
  );
}

function OrderDialog({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged: () => void }) {
  const qc = useQueryClient();
  const q = useDetail("order", id);
  const o = q.data?.row;
  const reload = () => { qc.invalidateQueries({ queryKey: ["service-detail", "order", id] }); onChanged(); };
  const [note, setNote] = useState("");
  const [noteVisible, setNoteVisible] = useState(true);
  const [termReason, setTermReason] = useState("");
  const [termInPerson, setTermInPerson] = useState(false);
  const [termSig, setTermSig] = useState("");
  const [history, setHistory] = useState<string | null>(null);

  const patch = useMutation({
    mutationFn: (data: Any) => adminUpdateOrder({ data: { id, ...data } } as never),
    onSuccess: () => { toast.success("O.S. atualizada"); setNote(""); reload(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const term = useMutation({
    mutationFn: () => adminCreatePrivateTerm({ data: { id, reason: termReason, signedInPerson: termInPerson, signature: termSig } } as never),
    onSuccess: () => { toast.success("Termo gerado"); reload(); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!o) {
    return (
      <Dialog open onOpenChange={(x) => !x && onClose()}>
        <DialogContent><p className="p-6 text-sm text-muted-foreground">Carregando…</p></DialogContent>
      </Dialog>
    );
  }
  const closed = Boolean(o.closed_at);
  const owner = q.data!.owner;
  const r = o.reported ?? {};
  const t = o.private_term as Any | null;
  const key = o.updated_at; // remonta formulários após salvar

  return (
    <Dialog open onOpenChange={(x) => !x && onClose()}>
      <DialogContent className="max-h-[94dvh] overflow-y-auto sm:max-w-5xl">
        <div className="space-y-5">
          <DialogHeader>
            <div className="flex flex-wrap items-center gap-2">
              <DialogTitle className="text-2xl">{osNumber(o.number)}</DialogTitle>
              <Badge variant={statusTone(o.status)}>{ORDER_STATUS[o.status]}</Badge>
              {closed && <Badge variant="outline">Encerrada {fmtDate(o.closed_at)}</Badge>}
            </div>
            <DialogDescription>
              {o.equipment?.brand} {o.equipment?.model} · Série {o.equipment?.serial} · Entrada {fmtDateTime(o.received_at)}
              {r.pa_number ? ` · Origem ${paNumber(r.pa_number)}` : ""}{o.due_at ? ` · Prazo ${fmtDate(o.due_at)}` : ""}
            </DialogDescription>
          </DialogHeader>

          <CustomerBox owner={owner} />
          <OrderProgress status={o.status} />

          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => printReceipt(o, owner)}><Download /> Comprovante de recebimento</Button>
            <Button size="sm" variant="outline" onClick={() => printFinal(o, owner, q.data!.events.filter((e) => e.visible_to_client))}><Download /> PDF da O.S.</Button>
            {t && <Button size="sm" variant="outline" onClick={() => printTerm(o)}><Download /> Termo particular</Button>}
            <Button size="sm" variant="ghost" onClick={() => setHistory(o.equipment_id)}><History /> Histórico do equipamento</Button>
          </div>

          {!closed && (
            <section className="grid gap-3 rounded-xl border border-border bg-card p-4 md:grid-cols-3">
              <F label="Status da O.S."><Sel label="Status" value={o.status} onChange={(v) => patch.mutate({ status: v })} options={ORDER_STATUS} /></F>
              <F label="Garantia"><Sel label="Garantia" value={o.warranty_status} onChange={(v) => patch.mutate({ warranty_status: v })} options={Object.fromEntries(Object.entries(WARRANTY_STATUS).filter(([k]) => k !== "particular" || o.warranty_status === "particular"))} /></F>
              <F label="Orçamento"><Sel label="Orçamento" value={o.budget_status} onChange={(v) => patch.mutate({ budget_status: v })} options={BUDGET_STATUS} /></F>
              <div className="md:col-span-3">
                <F label="Novo lançamento no histórico técnico">
                  <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex.: Teste de impressão realizado. Falha confirmada no sensor de filamento." />
                </F>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 text-sm"><Switch checked={noteVisible} onCheckedChange={setNoteVisible} /> Visível ao cliente</label>
                  <Button size="sm" variant="tech" disabled={!note.trim() || patch.isPending} onClick={() => patch.mutate({ note, visible_to_client: noteVisible })}>Lançar</Button>
                </div>
              </div>
            </section>
          )}

          <Tabs defaultValue="relato">
            <TabsList className="flex h-auto flex-wrap justify-start">
              {[["relato", "Relato e recebimento"], ["diagnostico", "Diagnóstico"], ["garantia", "Garantia"], ["orcamento", "Orçamento"], ["execucao", "Execução"], ["validacao", "Validação final"], ["encerramento", "Encerramento"], ["arquivos", "Arquivos"], ["historico", "Histórico"]].map(([v, l]) => (
                <TabsTrigger key={v} value={v}>{l}</TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="relato" className="mt-4 space-y-5">
              <div>
                <p className="mb-2 text-sm font-semibold">Informado pelo cliente (preservado)</p>
                <div className="grid gap-3 text-sm md:grid-cols-2">
                  <Info label="Defeito relatado" value={r.problem} className="md:col-span-2" />
                  <Info label="Código de erro" value={r.error_code} />
                  <Info label="Frequência / início" value={[r.frequency, r.started_when].filter(Boolean).join(" · ")} />
                  <Info label="Procedimentos realizados" value={r.steps_tried} className="md:col-span-2" />
                </div>
              </div>
              <div>
                <p className="mb-2 text-sm font-semibold">Constatações da assistência no recebimento</p>
                <SectionForm
                  key={key}
                  orderId={id}
                  section="reception"
                  stage="recebimento"
                  disabled={closed}
                  values={o.reception ?? {}}
                  onSaved={reload}
                  fields={[
                    { key: "accessories", label: "Acessórios entregues", type: "area" },
                    { key: "visual_condition", label: "Condição visual", type: "area" },
                    { key: "damages", label: "Avarias aparentes" },
                    { key: "missing_parts", label: "Peças faltantes" },
                    { key: "modifications", label: "Modificações identificadas" },
                    { key: "has_invoice", label: "Nota fiscal apresentada", type: "bool" },
                    { key: "notes", label: "Observações da conferência", type: "area" },
                  ]}
                />
              </div>
            </TabsContent>

            <TabsContent value="diagnostico" className="mt-4">
              <SectionForm
                key={key}
                orderId={id}
                section="diagnosis"
                stage="diagnostico"
                disabled={closed}
                values={o.diagnosis ?? {}}
                onSaved={reload}
                fields={[
                  { key: "informed_symptom", label: "Sintoma informado", type: "area" },
                  { key: "symptom_confirmed", label: "Sintoma confirmado?", type: "select", options: { sim: "Sim, confirmado", nao: "Não confirmado", parcial: "Parcialmente" } },
                  { key: "error_code", label: "Código de erro" },
                  { key: "tests", label: "Testes realizados", type: "area" },
                  { key: "test_results", label: "Resultado dos testes", type: "area" },
                  { key: "probable", label: "Diagnóstico provável" },
                  { key: "confirmed", label: "Diagnóstico confirmado" },
                  { key: "cause", label: "Causa encontrada", type: "area" },
                  { key: "notes", label: "Observações técnicas (visíveis ao cliente)", type: "area" },
                  { key: "internal_notes", label: "Anotações internas de bancada (não aparecem ao cliente)", type: "area" },
                ]}
              />
            </TabsContent>

            <TabsContent value="garantia" className="mt-4 space-y-5">
              <SectionForm
                key={key}
                orderId={id}
                section="warranty"
                stage="garantia"
                disabled={closed}
                values={o.warranty ?? {}}
                onSaved={reload}
                fields={[
                  { key: "manufacturer", label: "Fabricante" },
                  { key: "protocol", label: "Nº do protocolo / chamado" },
                  { key: "evidence_sent", label: "Evidências enviadas", type: "area" },
                  { key: "part_requested", label: "Peça solicitada" },
                  { key: "part_authorized", label: "Peça autorizada" },
                  { key: "response", label: "Resposta do fabricante", type: "area" },
                  { key: "authorized_at", label: "Data da autorização", type: "date" },
                  { key: "notes", label: "Observações", type: "area" },
                ]}
              />
              <section className="rounded-xl border border-accent/60 bg-accent/5 p-4">
                <p className="font-semibold">Termo de Ciência e Autorização para Atendimento Particular</p>
                {t ? (
                  <div className="mt-2 space-y-2 text-sm">
                    <p>Motivo: {t.reason}</p>
                    <p>Gerado por {t.created_by} em {fmtDateTime(t.created_at)}</p>
                    <p className={t.signed_at ? "font-medium text-tech" : "font-medium text-accent"}>
                      {t.signed_at ? `Assinado por ${t.signature} em ${fmtDateTime(t.signed_at)} (${t.signature_method}) — registro imutável.` : "Aguardando assinatura do cliente no Minha SOS-3D. O reparo só avança após a assinatura."}
                    </p>
                  </div>
                ) : null}
                {!t?.signed_at && !closed && (
                  <div className="mt-3 grid gap-3">
                    <p className="text-xs text-muted-foreground">Use quando o cliente optar por não aguardar/prosseguir com a análise de garantia. Os dados do cliente e do equipamento são preenchidos automaticamente.</p>
                    <F label="Motivo da escolha do cliente"><Textarea rows={2} value={termReason} onChange={(e) => setTermReason(e.target.value)} /></F>
                    <label className="flex items-center gap-2 text-sm"><Switch checked={termInPerson} onCheckedChange={setTermInPerson} /> Cliente assinou presencialmente</label>
                    {termInPerson && <F label="Nome de quem assinou"><Input value={termSig} onChange={(e) => setTermSig(e.target.value)} /></F>}
                    <Button variant="cta" className="w-fit" disabled={termReason.trim().length < 5 || term.isPending} onClick={() => term.mutate()}>{t ? "Regerar termo" : "Gerar termo"}</Button>
                  </div>
                )}
              </section>
            </TabsContent>

            <TabsContent value="orcamento" className="mt-4">
              <SectionForm
                key={key}
                orderId={id}
                section="budget"
                stage="orcamento"
                disabled={closed}
                values={o.budget ?? {}}
                onSaved={reload}
                fields={[
                  { key: "evaluation", label: "Valor da avaliação (R$)", type: "number" },
                  { key: "labor", label: "Mão de obra (R$)", type: "number" },
                  { key: "parts", label: "Peças (R$)", type: "number" },
                  { key: "other", label: "Outros custos (R$)", type: "number" },
                  { key: "discount", label: "Desconto (R$)", type: "number" },
                  { key: "authorization_method", label: "Forma de autorização", type: "select", options: { site: "Site", whatsapp: "WhatsApp", email: "E-mail", presencial: "Presencial" } },
                  { key: "authorized_at", label: "Data da autorização", type: "date" },
                  { key: "authorized_by", label: "Autorizado por" },
                  { key: "notes", label: "Observações", type: "area" },
                ]}
                extra={(v) => (
                  <div className="rounded-lg bg-secondary/50 p-3 text-right text-sm">
                    Total: <strong className="text-lg text-brand">{formatBRL(budgetTotal({ evaluation: +v.evaluation || 0, labor: +v.labor || 0, parts: +v.parts || 0, other: +v.other || 0, discount: +v.discount || 0 }))}</strong>
                    <span className="block text-xs text-muted-foreground">Para o cliente aprovar pelo site, altere o status do orçamento para "Orçamento enviado".</span>
                  </div>
                )}
              />
            </TabsContent>

            <TabsContent value="execucao" className="mt-4">
              <SectionForm
                key={key}
                orderId={id}
                section="execution"
                stage="execucao"
                disabled={closed}
                values={o.execution ?? {}}
                onSaved={reload}
                fields={[
                  { key: "services", label: "Serviços executados", type: "area" },
                  { key: "adjustments", label: "Ajustes" },
                  { key: "cleaning", label: "Limpeza" },
                  { key: "lubrication", label: "Lubrificação" },
                  { key: "calibration", label: "Calibração" },
                ]}
                extra={(v, set) => <PartsEditor v={v} set={set} disabled={closed} />}
              />
            </TabsContent>

            <TabsContent value="validacao" className="mt-4">
              <SectionForm
                key={key}
                orderId={id}
                section="validation"
                stage="validacao"
                disabled={closed}
                values={o.validation ?? {}}
                onSaved={reload}
                fields={[
                  { key: "result", label: "Resultado da validação", type: "select", options: VALIDATION_RESULT, wide: true },
                  { key: "tests", label: "Testes realizados", type: "area" },
                  { key: "calibration", label: "Calibração" },
                  { key: "leveling", label: "Nivelamento" },
                  { key: "extrusion", label: "Teste de extrusão" },
                  { key: "test_print", label: "Impressão de teste" },
                  { key: "material", label: "Material utilizado" },
                  { key: "file", label: "Arquivo utilizado" },
                  { key: "duration", label: "Tempo de teste" },
                  { key: "notes", label: "Observações", type: "area" },
                ]}
              />
            </TabsContent>

            <TabsContent value="encerramento" className="mt-4">
              {o.validation?.result && !["aprovado", "aprovado_obs"].includes(o.validation.result) && !closed && (
                <p className="mb-3 flex items-center gap-2 rounded-lg border border-destructive/50 p-3 text-sm text-destructive"><AlertTriangle className="size-4" /> A validação técnica final não está aprovada.</p>
              )}
              <SectionForm
                key={key}
                orderId={id}
                section="closing"
                stage="encerramento"
                disabled={closed}
                values={o.closing ?? {}}
                onSaved={reload}
                fields={[
                  { key: "reason", label: "Motivo do encerramento", type: "select", options: CLOSING_REASON, wide: true },
                  { key: "final_diagnosis", label: "Diagnóstico final", type: "area" },
                  { key: "summary", label: "Resumo do serviço realizado", type: "area" },
                  { key: "parts_summary", label: "Peças substituídas" },
                  { key: "final_value", label: "Valor final (R$)", type: "number" },
                  { key: "completed_at", label: "Data da conclusão", type: "date" },
                  { key: "delivered_at", label: "Data da entrega", type: "date" },
                  { key: "delivered_by", label: "Responsável pela entrega" },
                  { key: "notes", label: "Observações finais", type: "area" },
                ]}
              />
              {!closed && (
                <Button
                  className="mt-4"
                  variant="cta"
                  disabled={!o.closing?.reason || patch.isPending}
                  onClick={() => {
                    if (confirm("Encerrar a O.S.? Após o encerramento ela não poderá ser alterada.")) patch.mutate({ section: "closing", values: { finalize: true } });
                  }}
                >
                  <Wrench /> Encerrar O.S. e gerar PDF final
                </Button>
              )}
              {!o.closing?.reason && !closed && <p className="mt-2 text-xs text-muted-foreground">Salve o motivo do encerramento antes de encerrar.</p>}
            </TabsContent>

            <TabsContent value="arquivos" className="mt-4 space-y-4">
              {!closed && <FileDrop scope="order" id={id} stage="diagnostico" staff onDone={reload} />}
              <FileGrid files={q.data!.files} staff />
            </TabsContent>

            <TabsContent value="historico" className="mt-4">
              <EventTimeline events={q.data!.events} staff />
            </TabsContent>
          </Tabs>
        </div>
        <EquipmentHistoryDialog id={history} onClose={() => setHistory(null)} />
      </DialogContent>
    </Dialog>
  );
}

type EqRow = { id: string; brand: string; model: string; serial: string; owner_name: string; owner_email: string; purchase_date: string | null; invoice_number: string };

function EquipmentAdmin({ search }: { search: string }) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin-equipment"], queryFn: () => adminListEquipment() as unknown as Promise<EqRow[]> });
  const [history, setHistory] = useState<string | null>(null);
  const [transfer, setTransfer] = useState<EqRow | null>(null);
  const list = (q.data ?? []).filter((e) => !search.trim() || norm(`${e.brand} ${e.model} ${e.serial} ${e.owner_name} ${e.owner_email}`).includes(norm(search)));
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {list.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">Nenhum equipamento.</p>}
      {list.map((e) => (
        <div key={e.id} className="grid items-center gap-2 border-b border-border p-4 last:border-b-0 md:grid-cols-[1fr_1fr_1fr_auto]">
          <span><span className="block font-medium">{e.brand} {e.model}</span><span className="text-xs text-muted-foreground">Série {e.serial}</span></span>
          <span className="text-sm">{e.owner_name}<span className="block text-xs text-muted-foreground">{e.owner_email}</span></span>
          <span className="text-xs text-muted-foreground">Compra {fmtDate(e.purchase_date)}{e.invoice_number ? ` · NF ${e.invoice_number}` : ""}</span>
          <span className="flex gap-1">
            <Button size="sm" variant="outline" onClick={() => setHistory(e.id)}><History /> Histórico</Button>
            <Button size="sm" variant="ghost" onClick={() => setTransfer(e)}>Transferir</Button>
          </span>
        </div>
      ))}
      <EquipmentHistoryDialog id={history} onClose={() => setHistory(null)} />
      <TransferDialog equipment={transfer} onClose={() => setTransfer(null)} onDone={() => qc.invalidateQueries({ queryKey: ["admin-equipment"] })} admin />
    </div>
  );
}
