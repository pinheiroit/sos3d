import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Download,
  Eye,
  History,
  LifeBuoy,
  Plus,
  Printer,
  Send,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  BUDGET_STATUS,
  CLOSED_ORDER_STATUS,
  CLOSING_REASON,
  FAILURE_TYPES,
  ORDER_STATUS,
  REQUEST_STATUS,
  WARRANTY_STATUS,
  budgetTotal,
  fmtDate,
  osNumber,
  paNumber,
  statusTone,
} from "@/lib/service";
import { formatBRL } from "@/lib/catalog";
import {
  cancelMyRequest,
  createServiceRequest,
  getEquipmentHistory,
  getServiceDetail,
  myService,
  respondBudget,
  saveMyEquipment,
  signPrivateTerm,
  transferMyEquipment,
} from "@/lib/service.functions";
import { uploadServiceFile } from "@/lib/service-client";
import { printFinal, printReceipt, printTerm } from "@/lib/service-pdf";
import { EventTimeline, FileDrop, FileGrid, OrderProgress, type ServiceEvent, type ServiceFile } from "./ServiceShared";

type Equip = {
  id: string;
  brand: string;
  model: string;
  serial: string;
  purchase_date: string | null;
  order_reference: string;
  invoice_number: string;
  invoice_date: string | null;
};
type Mini = { brand: string; model: string; serial: string } | null;
type MyData = {
  equipment: Equip[];
  requests: { id: string; number: number; status: string; problem: string; created_at: string; updated_at: string; equipment: Mini }[];
  orders: {
    id: string;
    number: number;
    status: string;
    budget_status: string;
    received_at: string;
    updated_at: string;
    closed_at: string | null;
    closing: { reason?: string } | null;
    equipment: Mini;
  }[];
  suggestions: { order_reference: string; purchase_date: string; brand: string; model: string }[];
};

const KEY = ["my-service"];

export function MemberService() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: KEY, queryFn: () => myService() as unknown as Promise<MyData> });
  const [tab, setTab] = useState("abertas");
  const [detail, setDetail] = useState<{ kind: "request" | "order"; id: string } | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: KEY });

  const d = q.data;
  const openReqs = (d?.requests ?? []).filter((r) => !["convertida", "cancelado"].includes(r.status));
  const openOrders = (d?.orders ?? []).filter((o) => !o.closed_at && !CLOSED_ORDER_STATUS.includes(o.status));
  const closedOrders = (d?.orders ?? []).filter((o) => o.closed_at || CLOSED_ORDER_STATUS.includes(o.status));
  const actionNeeded = (d?.orders ?? []).filter((o) => ["enviado", "aguardando"].includes(o.budget_status)).length;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { label: "Pré-atendimentos", value: openReqs.length, icon: ClipboardList },
          { label: "O.S. em andamento", value: openOrders.length, icon: Wrench },
          { label: "O.S. finalizadas", value: closedOrders.length, icon: CheckCircle2 },
          { label: "Equipamentos", value: d?.equipment.length ?? 0, icon: Printer },
        ].map((c) => (
          <div key={c.label} className="rounded-xl border border-border bg-card p-4">
            <c.icon className="size-5 text-tech" />
            <p className="mt-2 text-2xl font-bold">{c.value}</p>
            <p className="text-xs text-muted-foreground">{c.label}</p>
          </div>
        ))}
      </div>

      {actionNeeded > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-accent bg-accent/10 p-4 text-sm">
          <LifeBuoy className="size-5 text-accent" />
          Você tem {actionNeeded} orçamento(s) aguardando sua aprovação. Abra a O.S. para responder.
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex h-auto flex-wrap justify-start">
          <TabsTrigger value="solicitar"><Plus className="mr-1 size-4" /> Solicitar atendimento</TabsTrigger>
          <TabsTrigger value="abertas">O.S. abertas</TabsTrigger>
          <TabsTrigger value="finalizadas">O.S. finalizadas</TabsTrigger>
          <TabsTrigger value="equipamentos">Meus equipamentos</TabsTrigger>
        </TabsList>

        <TabsContent value="solicitar" className="mt-6">
          <RequestWizard
            data={d}
            onCreated={(id) => {
              refresh();
              setTab("abertas");
              setDetail({ kind: "request", id });
            }}
            onEquipmentSaved={refresh}
          />
        </TabsContent>

        <TabsContent value="abertas" className="mt-6 space-y-3">
          {q.isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
          {!q.isLoading && openReqs.length + openOrders.length === 0 && (
            <Empty
              title="Nenhum atendimento em aberto"
              text="Precisa de ajuda com seu equipamento? Abra um pré-atendimento antes de trazê-lo até a SOS 3D."
              action={<Button variant="cta" onClick={() => setTab("solicitar")}>Solicitar atendimento <ArrowRight /></Button>}
            />
          )}
          {openOrders.map((o) => (
            <Card
              key={o.id}
              title={`${osNumber(o.number)} — ${o.equipment?.brand ?? ""} ${o.equipment?.model ?? ""}`}
              status={ORDER_STATUS[o.status] ?? o.status}
              tone={statusTone(o.status)}
              lines={[`Entrada: ${fmtDate(o.received_at)}`, `Última atualização: ${fmtDate(o.updated_at)}`]}
              badge={["enviado", "aguardando"].includes(o.budget_status) ? "Orçamento aguardando você" : undefined}
              onOpen={() => setDetail({ kind: "order", id: o.id })}
            />
          ))}
          {openReqs.map((r) => (
            <Card
              key={r.id}
              title={`${paNumber(r.number)} — ${r.equipment?.brand ?? ""} ${r.equipment?.model ?? ""}`}
              status={REQUEST_STATUS[r.status] ?? r.status}
              tone={statusTone(r.status)}
              lines={[`Aberto em: ${fmtDate(r.created_at)}`, r.problem.slice(0, 90)]}
              onOpen={() => setDetail({ kind: "request", id: r.id })}
            />
          ))}
        </TabsContent>

        <TabsContent value="finalizadas" className="mt-6 space-y-3">
          {closedOrders.length === 0 && <Empty title="Nenhuma O.S. finalizada" text="Seu histórico de atendimentos concluídos aparecerá aqui." />}
          {closedOrders.map((o) => (
            <Card
              key={o.id}
              title={`${osNumber(o.number)} — ${o.equipment?.brand ?? ""} ${o.equipment?.model ?? ""}`}
              status={CLOSING_REASON[o.closing?.reason ?? ""] ?? ORDER_STATUS[o.status] ?? o.status}
              tone="default"
              lines={[`Finalizada em: ${fmtDate(o.closed_at ?? o.updated_at)}`]}
              onOpen={() => setDetail({ kind: "order", id: o.id })}
              pdf
            />
          ))}
        </TabsContent>

        <TabsContent value="equipamentos" className="mt-6">
          <EquipmentList data={d} onChanged={refresh} />
        </TabsContent>
      </Tabs>

      <DetailDialog detail={detail} onClose={() => setDetail(null)} onChanged={refresh} />
    </div>
  );
}

function Empty({ title, text, action }: { title: string; text: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-border p-10 text-center">
      <Wrench className="mx-auto size-8 text-steel" />
      <p className="mt-3 font-semibold">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{text}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

function Card({
  title,
  status,
  tone,
  lines,
  badge,
  onOpen,
  pdf,
}: {
  title: string;
  status: string;
  tone: "default" | "secondary" | "destructive" | "outline";
  lines: string[];
  badge?: string | undefined;
  onOpen: () => void;
  pdf?: boolean;
}) {
  return (
    <article className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-5 transition-colors hover:border-tech/50">
      <div className="min-w-0">
        <p className="font-semibold">{title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <Badge variant={tone}>{status}</Badge>
          {badge && <Badge className="bg-accent text-accent-foreground">{badge}</Badge>}
        </div>
        {lines.map((l) => (
          <p key={l} className="mt-1 truncate text-xs text-muted-foreground">{l}</p>
        ))}
      </div>
      <Button variant="outline" size="sm" onClick={onOpen}>
        {pdf ? <><Eye /> Visualizar | <Download /> PDF</> : <>Acompanhar <ArrowRight /></>}
      </Button>
    </article>
  );
}

const emptyEquip = { brand: "", model: "", serial: "", purchase_date: "", order_reference: "", invoice_number: "", invoice_date: "" };

function EquipmentForm({
  suggestions,
  initial,
  onSaved,
}: {
  suggestions: MyData["suggestions"];
  initial?: Equip | null;
  onSaved: (id: string) => void;
}) {
  const [f, setF] = useState(() =>
    initial
      ? { ...initial, purchase_date: initial.purchase_date ?? "", invoice_date: initial.invoice_date ?? "" }
      : emptyEquip,
  );
  const [invoice, setInvoice] = useState<File | null>(null);
  const save = useMutation({
    mutationFn: async () => {
      const res = (await saveMyEquipment({ data: { ...f, id: initial?.id ?? null } } as never)) as { id: string };
      if (invoice) await uploadServiceFile(invoice, { scope: "equipment", id: res.id, category: "nota_fiscal" });
      return res.id;
    },
    onSuccess: (id) => {
      toast.success("Equipamento salvo");
      onSaved(id);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
    >
      {!initial && suggestions.length > 0 && (
        <div className="rounded-lg border border-tech/40 bg-tech/5 p-3">
          <p className="text-xs font-semibold">Comprou na SOS 3D? Use os dados do seu pedido:</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <Button
                key={s.order_reference + s.model}
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setF({ ...f, brand: s.brand, model: s.model, order_reference: s.order_reference, purchase_date: s.purchase_date })}
              >
                {s.model} · {s.order_reference}
              </Button>
            ))}
          </div>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Marca *"><Input required value={f.brand} onChange={set("brand")} placeholder="Ex.: Bambu Lab" /></Field>
        <Field label="Modelo *"><Input required value={f.model} onChange={set("model")} placeholder="Ex.: A1" /></Field>
        <Field label="Número de série *"><Input required value={f.serial} onChange={set("serial")} disabled={Boolean(initial)} /></Field>
        <Field label="Data da compra"><Input type="date" value={f.purchase_date} onChange={set("purchase_date")} /></Field>
        <Field label="Número do pedido"><Input value={f.order_reference} onChange={set("order_reference")} placeholder="SOS-…" /></Field>
        <Field label="Nº da nota fiscal"><Input value={f.invoice_number} onChange={set("invoice_number")} /></Field>
        <Field label="Data da nota fiscal"><Input type="date" value={f.invoice_date} onChange={set("invoice_date")} /></Field>
        <Field label="Anexar nota fiscal">
          <Input type="file" accept="application/pdf,image/*" onChange={(e) => setInvoice(e.target.files?.[0] ?? null)} />
        </Field>
      </div>
      <Button type="submit" variant="cta" disabled={save.isPending}>{save.isPending ? "Salvando…" : "Salvar equipamento"}</Button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function RequestWizard({
  data,
  onCreated,
  onEquipmentSaved,
}: {
  data?: MyData | undefined;
  onCreated: (id: string) => void;
  onEquipmentSaved: () => void;
}) {
  const [step, setStep] = useState(1);
  const [equipmentId, setEquipmentId] = useState<string>("");
  const [newEquip, setNewEquip] = useState(false);
  const [f, setF] = useState({ failure_type: "outro", problem: "", started_when: "", frequency: "", error_code: "", steps_tried: "" });
  const [files, setFiles] = useState<File[]>([]);
  const equipment = data?.equipment ?? [];
  const failure = FAILURE_TYPES.find((t) => t.value === f.failure_type)!;

  const submit = useMutation({
    mutationFn: async () => {
      const r = (await createServiceRequest({ data: { ...f, equipmentId } } as never)) as { id: string; number: number };
      for (const file of files) await uploadServiceFile(file, { scope: "request", id: r.id });
      return r;
    },
    onSuccess: (r) => {
      toast.success(`Pré-atendimento ${paNumber(r.number)} aberto!`, { description: "Acompanhe por aqui as orientações da nossa equipe." });
      setStep(1);
      setF({ failure_type: "outro", problem: "", started_when: "", frequency: "", error_code: "", steps_tried: "" });
      setFiles([]);
      onCreated(r.id);
    },
    onError: (e: Error) => toast.error("Não foi possível abrir", { description: e.message }),
  });

  const steps = ["Equipamento", "Problema", "Evidências", "Revisão"];

  return (
    <div className="rounded-xl border border-border bg-card p-5 md:p-7">
      <ol className="mb-6 grid grid-cols-4 gap-2">
        {steps.map((s, i) => (
          <li key={s} className="space-y-1.5">
            <span className={cn("block h-1.5 rounded-full", i + 1 <= step ? "bg-tech" : "bg-secondary")} />
            <span className={cn("text-xs", i + 1 === step ? "font-semibold" : "text-muted-foreground")}>{i + 1}. {s}</span>
          </li>
        ))}
      </ol>

      {step === 1 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Qual equipamento precisa de atendimento?</h3>
          {equipment.length > 0 && !newEquip && (
            <div className="grid gap-3 sm:grid-cols-2">
              {equipment.map((e) => (
                <button
                  type="button"
                  key={e.id}
                  onClick={() => setEquipmentId(e.id)}
                  className={cn(
                    "rounded-lg border p-4 text-left transition-colors",
                    equipmentId === e.id ? "border-tech bg-tech/5 ring-1 ring-tech" : "border-border hover:border-tech/50",
                  )}
                >
                  <p className="font-semibold">{e.brand} {e.model}</p>
                  <p className="text-xs text-muted-foreground">Série {e.serial}</p>
                </button>
              ))}
            </div>
          )}
          {newEquip || equipment.length === 0 ? (
            <div className="rounded-lg border border-border p-4">
              <EquipmentForm
                suggestions={data?.suggestions ?? []}
                onSaved={(id) => {
                  setEquipmentId(id);
                  setNewEquip(false);
                  onEquipmentSaved();
                }}
              />
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setNewEquip(true)}><Plus /> Cadastrar outro equipamento</Button>
          )}
          <div className="flex justify-end">
            <Button variant="cta" disabled={!equipmentId} onClick={() => setStep(2)}>Continuar <ArrowRight /></Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Conte o que está acontecendo</h3>
          <div className="flex flex-wrap gap-2">
            {FAILURE_TYPES.map((t) => (
              <Button key={t.value} type="button" size="sm" variant={f.failure_type === t.value ? "tech" : "outline"} onClick={() => setF({ ...f, failure_type: t.value })}>
                {t.label}
              </Button>
            ))}
          </div>
          <Field label="Descrição do problema *">
            <Textarea rows={4} value={f.problem} onChange={(e) => setF({ ...f, problem: e.target.value })} placeholder="Descreva o que acontece, em qual etapa e o que você observa." />
          </Field>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Quando começou?"><Input value={f.started_when} onChange={(e) => setF({ ...f, started_when: e.target.value })} placeholder="Ex.: há 1 semana" /></Field>
            <Field label="Frequência da falha"><Input value={f.frequency} onChange={(e) => setF({ ...f, frequency: e.target.value })} placeholder="Sempre, às vezes…" /></Field>
            <Field label="Código de erro"><Input value={f.error_code} onChange={(e) => setF({ ...f, error_code: e.target.value })} placeholder="Se houver" /></Field>
          </div>
          <Field label="O que você já tentou fazer?">
            <Textarea rows={3} value={f.steps_tried} onChange={(e) => setF({ ...f, steps_tried: e.target.value })} />
          </Field>
          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep(1)}>Voltar</Button>
            <Button variant="cta" disabled={f.problem.trim().length < 10} onClick={() => setStep(3)}>Continuar <ArrowRight /></Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Anexe evidências</h3>
          <div className="rounded-lg border border-tech/40 bg-tech/5 p-4 text-sm">
            <p className="font-semibold text-tech">Dica para "{failure.label}"</p>
            <p className="mt-1">{failure.evidence}</p>
            <p className="mt-1 text-xs text-muted-foreground">Inclua também a nota fiscal, se ainda não anexou no cadastro do equipamento.</p>
          </div>
          <Input type="file" multiple accept="image/*,video/*,application/pdf" onChange={(e) => setFiles(Array.from(e.target.files ?? []))} />
          {files.length > 0 && (
            <ul className="space-y-1 text-sm text-muted-foreground">
              {files.map((x) => <li key={x.name}>• {x.name} ({(x.size / 1024 / 1024).toFixed(1)} MB)</li>)}
            </ul>
          )}
          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep(2)}>Voltar</Button>
            <Button variant="cta" onClick={() => setStep(4)}>Revisar <ArrowRight /></Button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Revise e envie</h3>
          <dl className="grid gap-2 rounded-lg border border-border p-4 text-sm sm:grid-cols-[180px_1fr]">
            {(() => {
              const e = equipment.find((x) => x.id === equipmentId);
              return [
                ["Equipamento", e ? `${e.brand} ${e.model} — série ${e.serial}` : "—"],
                ["Tipo de falha", failure.label],
                ["Problema", f.problem],
                ["Começou", f.started_when || "—"],
                ["Frequência", f.frequency || "—"],
                ["Código de erro", f.error_code || "—"],
                ["Já tentou", f.steps_tried || "—"],
                ["Anexos", files.length ? `${files.length} arquivo(s)` : "Nenhum"],
              ].map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="whitespace-pre-line">{v}</dd>
                </div>
              ));
            })()}
          </dl>
          <p className="text-xs text-muted-foreground">
            Após o envio você recebe um número de pré-atendimento (PA). A O.S. oficial é criada quando o equipamento chegar à SOS 3D.
          </p>
          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep(3)}>Voltar</Button>
            <Button variant="cta" disabled={submit.isPending} onClick={() => submit.mutate()}>
              <Send /> {submit.isPending ? "Enviando…" : "Enviar pré-atendimento"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function EquipmentList({ data, onChanged }: { data?: MyData | undefined; onChanged: () => void }) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Equip | null>(null);
  const [history, setHistory] = useState<string | null>(null);
  const [transfer, setTransfer] = useState<Equip | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="cta" onClick={() => setAdding(true)}><Plus /> Cadastrar equipamento</Button>
      </div>
      {(data?.equipment ?? []).length === 0 && <Empty title="Nenhum equipamento cadastrado" text="Cadastre suas impressoras para agilizar seus atendimentos e manter o histórico técnico." />}
      <div className="grid gap-3 md:grid-cols-2">
        {(data?.equipment ?? []).map((e) => (
          <article key={e.id} className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-start gap-3">
              <span className="grid size-10 place-items-center rounded-lg bg-tech/10 text-tech"><Printer className="size-5" /></span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{e.brand} {e.model}</p>
                <p className="text-xs text-muted-foreground">Série {e.serial}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Compra: {fmtDate(e.purchase_date)}{e.order_reference ? ` · Pedido ${e.order_reference}` : ""}{e.invoice_number ? ` · NF ${e.invoice_number}` : ""}
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => setHistory(e.id)}><History /> Histórico</Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(e)}>Editar</Button>
              <Button size="sm" variant="ghost" onClick={() => setTransfer(e)}>Transferir</Button>
            </div>
          </article>
        ))}
      </div>

      <Dialog open={adding || Boolean(editing)} onOpenChange={(o) => { if (!o) { setAdding(false); setEditing(null); } }}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader><DialogTitle>{editing ? "Editar equipamento" : "Cadastrar equipamento"}</DialogTitle></DialogHeader>
          <EquipmentForm
            key={editing?.id ?? "new"}
            initial={editing}
            suggestions={data?.suggestions ?? []}
            onSaved={() => { setAdding(false); setEditing(null); onChanged(); }}
          />
        </DialogContent>
      </Dialog>

      <EquipmentHistoryDialog id={history} onClose={() => setHistory(null)} />
      <TransferDialog equipment={transfer} onClose={() => setTransfer(null)} onDone={onChanged} admin={false} />
    </div>
  );
}

export function EquipmentHistoryDialog({ id, onClose }: { id: string | null; onClose: () => void }) {
  const q = useQuery({
    queryKey: ["equipment-history", id],
    queryFn: () => getEquipmentHistory({ data: { id: id! } } as never) as unknown as Promise<{
      equipment: Equip;
      orders: { id: string; number: number; status: string; received_at: string; title: string; mine: boolean }[];
      owners: { id: string; previous: string; next: string; at: string; notes: string; proof: string }[];
      files: ServiceFile[];
    }>,
    enabled: Boolean(id),
  });
  const d = q.data;
  return (
    <Dialog open={Boolean(id)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{d ? `${d.equipment.brand} ${d.equipment.model} — Série ${d.equipment.serial}` : "Histórico"}</DialogTitle>
          <DialogDescription>Histórico técnico vinculado ao número de série.</DialogDescription>
        </DialogHeader>
        {q.isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
        {d && (
          <div className="space-y-5">
            <ul className="divide-y divide-border rounded-lg border border-border">
              {d.orders.length === 0 && <li className="p-4 text-sm text-muted-foreground">Nenhuma O.S. registrada.</li>}
              {d.orders.map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                  <span><strong>{osNumber(o.number)}</strong> — {o.title || "Atendimento"}</span>
                  <span className="text-xs text-muted-foreground">{fmtDate(o.received_at)} · {ORDER_STATUS[o.status]}</span>
                </li>
              ))}
            </ul>
            {d.owners.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-semibold">Histórico de proprietários</p>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {d.owners.map((o) => (
                    <li key={o.id}>{fmtDate(o.at)}: {o.previous} → <strong className="text-foreground">{o.next}</strong>{o.notes ? ` · ${o.notes}` : ""}{o.proof ? ` · Comprovação: ${o.proof}` : ""}</li>
                  ))}
                </ul>
              </div>
            )}
            <div>
              <p className="mb-2 text-sm font-semibold">Documentos do equipamento</p>
              <FileGrid files={d.files} />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function TransferDialog({
  equipment,
  onClose,
  onDone,
  admin,
}: {
  equipment: { id: string; brand: string; model: string; serial: string } | null;
  onClose: () => void;
  onDone: () => void;
  admin: boolean;
}) {
  const [email, setEmail] = useState("");
  const [proof, setProof] = useState("");
  const [notes, setNotes] = useState("");
  const m = useMutation({
    mutationFn: async () => {
      const fn = admin ? (await import("@/lib/service.functions")).adminTransferEquipment : transferMyEquipment;
      return fn({ data: { equipmentId: equipment!.id, email, proof, notes } } as never);
    },
    onSuccess: () => {
      toast.success("Propriedade transferida");
      setEmail(""); setProof(""); setNotes("");
      onDone();
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open={Boolean(equipment)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transferir propriedade</DialogTitle>
          <DialogDescription>
            {equipment ? `${equipment.brand} ${equipment.model} — série ${equipment.serial}. ` : ""}
            O novo proprietário não verá seus dados, conversas, documentos ou valores.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Field label="E-mail da conta do novo proprietário *"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          <Field label="Comprovação (ex.: recibo de venda, nº documento)"><Input value={proof} onChange={(e) => setProof(e.target.value)} /></Field>
          <Field label="Observações"><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
          <Button variant="cta" className="w-full" disabled={!email || m.isPending} onClick={() => m.mutate()}>
            {m.isPending ? "Transferindo…" : "Confirmar transferência"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

type Detail = {
  kind: "request" | "order";
  row: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  events: ServiceEvent[];
  files: ServiceFile[];
  owner: { name: string; email: string; phone: string; document: string };
};

function DetailDialog({
  detail,
  onClose,
  onChanged,
}: {
  detail: { kind: "request" | "order"; id: string } | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const qc = useQueryClient();
  const key = ["service-detail", detail?.kind, detail?.id];
  const q = useQuery({
    queryKey: key,
    queryFn: () => getServiceDetail({ data: detail! } as never) as unknown as Promise<Detail>,
    enabled: Boolean(detail),
  });
  const reload = () => {
    qc.invalidateQueries({ queryKey: key });
    onChanged();
  };
  const [signature, setSignature] = useState("");
  const cancel = useMutation({
    mutationFn: () => cancelMyRequest({ data: { id: detail!.id } } as never),
    onSuccess: () => { toast.success("Pré-atendimento cancelado"); reload(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const budget = useMutation({
    mutationFn: (approve: boolean) => respondBudget({ data: { id: detail!.id, approve } } as never),
    onSuccess: () => { toast.success("Resposta registrada"); reload(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const sign = useMutation({
    mutationFn: () => signPrivateTerm({ data: { id: detail!.id, signature } } as never),
    onSuccess: () => { toast.success("Termo assinado"); reload(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const d = q.data;
  const r = d?.row;
  const isOrder = d?.kind === "order";
  const term = r?.private_term as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  const b = (r?.budget ?? {}) as any; // eslint-disable-line @typescript-eslint/no-explicit-any

  return (
    <Dialog open={Boolean(detail)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-3xl">
        {!d || !r ? (
          <p className="p-6 text-sm text-muted-foreground">Carregando…</p>
        ) : (
          <div className="space-y-6">
            <DialogHeader>
              <DialogTitle className="text-xl">
                {isOrder ? osNumber(r.number) : paNumber(r.number)} — {r.equipment?.brand} {r.equipment?.model}
              </DialogTitle>
              <DialogDescription>
                Série {r.equipment?.serial} · {isOrder ? `Entrada ${fmtDate(r.received_at)}` : `Aberto em ${fmtDate(r.created_at)}`}
              </DialogDescription>
            </DialogHeader>

            {isOrder ? (
              <OrderProgress status={r.status} />
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={statusTone(r.status)}>{REQUEST_STATUS[r.status]}</Badge>
                {r.status === "liberado_entrega" && <span className="text-sm text-tech">Pode trazer seu equipamento à SOS 3D informando o número {paNumber(r.number)}.</span>}
              </div>
            )}

            {!isOrder && r.staff_message && (
              <div className="rounded-lg border border-tech/40 bg-tech/5 p-4 text-sm">
                <p className="font-semibold text-tech">Mensagem da assistência</p>
                <p className="mt-1 whitespace-pre-line">{r.staff_message}</p>
              </div>
            )}

            {isOrder && (
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => printReceipt(r, d.owner)}><Download /> Comprovante de recebimento</Button>
                {r.closed_at && <Button size="sm" variant="tech" onClick={() => printFinal(r, d.owner, d.events)}><Download /> PDF final da O.S.</Button>}
                {term && <Button size="sm" variant="outline" onClick={() => printTerm(r)}><Download /> Termo</Button>}
              </div>
            )}

            {isOrder && term && !term.signed_at && (
              <section className="rounded-xl border border-accent bg-accent/10 p-5">
                <p className="flex items-center gap-2 font-semibold"><ShieldCheck className="size-5 text-accent" /> Termo de atendimento particular aguardando sua assinatura</p>
                <p className="mt-2 text-sm">
                  Você optou por não aguardar/prosseguir com a análise de garantia neste atendimento. Esta opção não representa renúncia
                  aos seus direitos de garantia. Motivo registrado: <em>{term.reason}</em>
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => printTerm(r)}>Ler termo completo</Button>
                </div>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <Input placeholder="Digite seu nome completo para assinar" value={signature} onChange={(e) => setSignature(e.target.value)} />
                  <Button variant="cta" disabled={signature.trim().length < 3 || sign.isPending} onClick={() => sign.mutate()}>Assinar termo</Button>
                </div>
              </section>
            )}

            {isOrder && r.budget_status !== "nao_aplica" && (
              <section className="rounded-xl border border-border p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">Orçamento</p>
                  <Badge variant="secondary">{BUDGET_STATUS[r.budget_status]}</Badge>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-1 text-sm">
                  {[["Avaliação", b.evaluation], ["Mão de obra", b.labor], ["Peças", b.parts], ["Outros", b.other], ["Desconto", b.discount]].map(([k, v]) =>
                    v ? <div key={k as string} className="contents"><dt className="text-muted-foreground">{k}</dt><dd className="text-right">{formatBRL(Number(v))}</dd></div> : null,
                  )}
                  <dt className="font-semibold">Total</dt>
                  <dd className="text-right font-bold text-brand">{formatBRL(budgetTotal(b))}</dd>
                </dl>
                {["enviado", "aguardando"].includes(r.budget_status) && (
                  <div className="mt-4 flex gap-2">
                    <Button variant="cta" disabled={budget.isPending} onClick={() => budget.mutate(true)}>Aprovar orçamento</Button>
                    <Button variant="outline" disabled={budget.isPending} onClick={() => budget.mutate(false)}>Recusar</Button>
                  </div>
                )}
              </section>
            )}

            {isOrder && (
              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <Info label="Garantia" value={WARRANTY_STATUS[r.warranty_status]} />
                {r.diagnosis?.confirmed && <Info label="Diagnóstico" value={r.diagnosis.confirmed} />}
                {r.closing?.reason && <Info label="Encerramento" value={CLOSING_REASON[r.closing.reason]} />}
                {r.closing?.summary && <Info label="Serviço realizado" value={r.closing.summary} />}
              </div>
            )}

            <section>
              <p className="mb-2 font-semibold">Seu relato</p>
              <div className="rounded-lg border border-border bg-secondary/30 p-4 text-sm">
                <p className="whitespace-pre-line">{isOrder ? r.reported?.problem : r.problem}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {[
                    (isOrder ? r.reported?.error_code : r.error_code) && `Código: ${isOrder ? r.reported?.error_code : r.error_code}`,
                    (isOrder ? r.reported?.frequency : r.frequency) && `Frequência: ${isOrder ? r.reported?.frequency : r.frequency}`,
                  ].filter(Boolean).join(" · ")}
                </p>
              </div>
            </section>

            <section>
              <p className="mb-2 font-semibold">Arquivos</p>
              {!isOrder && !["convertida", "cancelado"].includes(r.status) && (
                <div className="mb-3"><FileDrop scope="request" id={r.id} onDone={reload} /></div>
              )}
              <FileGrid files={d.files} canDelete={!isOrder} onChanged={reload} />
            </section>

            <section>
              <p className="mb-3 font-semibold">Andamento</p>
              <EventTimeline events={d.events} />
            </section>

            {!isOrder && !["convertida", "cancelado"].includes(r.status) && (
              <Button variant="ghost" className="text-destructive" disabled={cancel.isPending} onClick={() => cancel.mutate()}>
                Cancelar pré-atendimento
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Info({ label, value }: { label: string; value?: string | undefined }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 whitespace-pre-line">{value || "—"}</p>
    </div>
  );
}
