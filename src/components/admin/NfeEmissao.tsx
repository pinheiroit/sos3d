import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  cancelNfe,
  checkNfeService,
  defaultFiscalSettings,
  getFiscalPanel,
  issueNfe,
  type FiscalSettings,
} from "@/lib/fiscal.functions";

const brl = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const onlyDigits = (value: string) => value.replace(/\D/g, "");

type ItemForm = {
  codigo: string;
  descricao: string;
  ncm: string;
  cfop: string;
  unidade: string;
  quantidade: string;
  valorUnitario: string;
};

type IssueForm = {
  orderId: string | null;
  reference: string;
  numero: string;
  serie: string;
  naturezaOperacao: string;
  nome: string;
  documento: string;
  ie: string;
  email: string;
  logradouro: string;
  numeroEndereco: string;
  complemento: string;
  bairro: string;
  municipio: string;
  codigoMunicipio: string;
  uf: string;
  cep: string;
  fone: string;
  frete: string;
  desconto: string;
  formaPagamento: "pix" | "boleto" | "cartao" | "dinheiro" | "outros";
  informacoesAdicionais: string;
  itens: ItemForm[];
};

const statusLabel: Record<string, string> = {
  autorizada: "Autorizada",
  rejeitada: "Rejeitada",
  cancelada: "Cancelada",
  pendente: "Pendente",
};

export function NfeEmissao() {
  const queryClient = useQueryClient();
  const loadPanel = useServerFn(getFiscalPanel);
  const saveSettingsFn = useServerFn(saveFiscalSettings);
  const checkServiceFn = useServerFn(checkNfeService);
  const issueNfeFn = useServerFn(issueNfe);
  const cancelNfeFn = useServerFn(cancelNfe);

  const { data, isLoading } = useQuery({ queryKey: ["fiscal-panel"], queryFn: () => loadPanel() });

  const [settings, setSettings] = useState<FiscalSettings | null>(null);
  const current = settings ?? data?.settings ?? defaultFiscalSettings;

  const [issue, setIssue] = useState<IssueForm | null>(null);
  const [cancelTarget, setCancelTarget] = useState<{ id: string; numero: number | null } | null>(null);
  const [justificativa, setJustificativa] = useState("");

  const saveSettings = useMutation({
    mutationFn: async (values: FiscalSettings) => {
      const { saveFiscalSettings } = await import("@/lib/fiscal.functions");
      return saveFiscalSettings({ data: values });
    },
    onSuccess: () => {
      toast.success("Configuração fiscal salva.");
      void queryClient.invalidateQueries({ queryKey: ["fiscal-panel"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const testService = useMutation({
    mutationFn: async () => {
      const { checkNfeService: check } = await import("@/lib/fiscal.functions");
      return check();
    },
    onSuccess: (result) => {
      if (result.online) toast.success(`Serviço no ar (ambiente: ${result.ambiente}).`);
      else toast.error(result.message || "O serviço de NF-e não respondeu.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const emitir = useMutation({
    mutationFn: async (form: IssueForm) => {
      const { issueNfe: emit } = await import("@/lib/fiscal.functions");
      return emit({
        data: {
          orderId: form.orderId,
          numero: Number(form.numero),
          serie: Number(form.serie),
          naturezaOperacao: form.naturezaOperacao,
          destinatario: {
            nome: form.nome,
            documento: onlyDigits(form.documento),
            ie: form.ie,
            email: form.email,
            endereco: {
              logradouro: form.logradouro,
              numero: form.numeroEndereco || "S/N",
              complemento: form.complemento,
              bairro: form.bairro,
              municipio: form.municipio,
              codigoMunicipio: onlyDigits(form.codigoMunicipio),
              uf: form.uf.toUpperCase(),
              cep: onlyDigits(form.cep),
              fone: onlyDigits(form.fone),
            },
          },
          itens: form.itens.map((item) => ({
            codigo: item.codigo,
            descricao: item.descricao,
            ncm: onlyDigits(item.ncm),
            cfop: onlyDigits(item.cfop),
            unidade: item.unidade,
            quantidade: Number(item.quantidade.replace(",", ".")),
            valorUnitario: Number(item.valorUnitario.replace(",", ".")),
          })),
          frete: Number(form.frete.replace(",", ".")) || 0,
          desconto: Number(form.desconto.replace(",", ".")) || 0,
          pagamento: {
            forma: form.formaPagamento,
            valor: 0,
          },
          informacoesAdicionais: form.informacoesAdicionais,
        },
      });
    },
    onSuccess: (result) => {
      if (result.ok) {
        toast.success(result.message);
        setIssue(null);
      } else {
        toast.error(result.message);
      }
      void queryClient.invalidateQueries({ queryKey: ["fiscal-panel"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const cancelar = useMutation({
    mutationFn: async () => {
      const { cancelNfe: cancel } = await import("@/lib/fiscal.functions");
      return cancel({ data: { id: cancelTarget!.id, justificativa } });
    },
    onSuccess: (result) => {
      if (result.ok) {
        toast.success(result.message);
        setCancelTarget(null);
        setJustificativa("");
      } else {
        toast.error(result.message);
      }
      void queryClient.invalidateQueries({ queryKey: ["fiscal-panel"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const faturados = useMemo(
    () => new Set((data?.documents ?? []).filter((d) => d.status === "autorizada").map((d) => d.order_id)),
    [data?.documents],
  );

  function startIssue(order: NonNullable<typeof data>["orders"][number]) {
    const address = (order.shipping_address ?? {}) as Record<string, string>;
    const uf = (address["state"] ?? "").slice(0, 2).toUpperCase();
    setIssue({
      orderId: order.id,
      reference: order.reference,
      numero: String(current.proximoNumero),
      serie: String(current.serie),
      naturezaOperacao: current.naturezaOperacao,
      nome: order.customer_name,
      documento: order.customer_document ?? "",
      ie: "",
      email: order.customer_email ?? "",
      logradouro: address["street"] ?? "",
      numeroEndereco: address["number"] ?? "S/N",
      complemento: address["complement"] ?? "",
      bairro: address["district"] ?? "Centro",
      municipio: address["city"] ?? "",
      codigoMunicipio: current.codigoMunicipioPadrao,
      uf,
      cep: address["zip"] ?? "",
      fone: order.customer_phone ?? "",
      frete: String(Number(order.shipping ?? 0)),
      desconto: String(Number(order.discount ?? 0)),
      formaPagamento: (["pix", "boleto", "cartao"].includes(order.payment_method)
        ? order.payment_method
        : "outros") as IssueForm["formaPagamento"],
      informacoesAdicionais: current.informacoesAdicionais,
      itens: (order.order_items ?? []).map((item) => ({
        codigo: item.product_slug.slice(0, 60),
        descricao: item.product_name.slice(0, 120),
        ncm: current.ncmPadrao,
        cfop: uf && uf !== "" && uf !== "AC" ? current.cfopInterestadual : current.cfopInterno,
        unidade: current.unidadePadrao,
        quantidade: String(item.qty),
        valorUnitario: String(Number(item.unit_price)),
      })),
    });
  }

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando dados fiscais…</p>;

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">Servidor de emissão</h3>
            <p className="text-sm text-muted-foreground">
              A emissão acontece no seu servidor com o certificado digital A1.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={data?.configured ? "secondary" : "destructive"}>
              {data?.configured ? "Configurado" : "Falta configurar"}
            </Badge>
            <Button variant="outline" onClick={() => testService.mutate()} disabled={testService.isPending}>
              Testar conexão
            </Button>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-lg font-semibold">Dados padrão da nota</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Série">
            <Input
              value={current.serie}
              onChange={(e) => setSettings({ ...current, serie: Number(e.target.value) || 1 })}
            />
          </Field>
          <Field label="Próximo número">
            <Input
              value={current.proximoNumero}
              onChange={(e) => setSettings({ ...current, proximoNumero: Number(e.target.value) || 1 })}
            />
          </Field>
          <Field label="Natureza da operação">
            <Input
              value={current.naturezaOperacao}
              onChange={(e) => setSettings({ ...current, naturezaOperacao: e.target.value })}
            />
          </Field>
          <Field label="CFOP dentro do estado">
            <Input value={current.cfopInterno} onChange={(e) => setSettings({ ...current, cfopInterno: e.target.value })} />
          </Field>
          <Field label="CFOP para outro estado">
            <Input
              value={current.cfopInterestadual}
              onChange={(e) => setSettings({ ...current, cfopInterestadual: e.target.value })}
            />
          </Field>
          <Field label="NCM padrão">
            <Input value={current.ncmPadrao} onChange={(e) => setSettings({ ...current, ncmPadrao: e.target.value })} />
          </Field>
          <Field label="Unidade padrão">
            <Input value={current.unidadePadrao} onChange={(e) => setSettings({ ...current, unidadePadrao: e.target.value })} />
          </Field>
          <Field label="CSOSN (Simples Nacional)">
            <Input value={current.csosn} onChange={(e) => setSettings({ ...current, csosn: e.target.value })} />
          </Field>
          <Field label="Código IBGE do município padrão">
            <Input
              value={current.codigoMunicipioPadrao}
              onChange={(e) => setSettings({ ...current, codigoMunicipioPadrao: e.target.value })}
            />
          </Field>
        </div>
        <div className="mt-4">
          <Field label="Informações adicionais">
            <Textarea
              rows={2}
              value={current.informacoesAdicionais}
              onChange={(e) => setSettings({ ...current, informacoesAdicionais: e.target.value })}
            />
          </Field>
        </div>
        <Button className="mt-4" onClick={() => saveSettings.mutate(current)} disabled={saveSettings.isPending}>
          Salvar configuração
        </Button>
      </section>

      <section>
        <h3 className="text-lg font-semibold">Pedidos para faturar</h3>
        <div className="mt-3 space-y-3">
          {(data?.orders ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum pedido registrado ainda.</p>
          )}
          {(data?.orders ?? []).map((order) => (
            <div
              key={order.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4"
            >
              <div>
                <p className="font-semibold">
                  {order.reference} — {order.customer_name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {brl(Number(order.total))} · {(order.order_items ?? []).length} item(ns)
                </p>
              </div>
              <div className="flex items-center gap-2">
                {faturados.has(order.id) && <Badge variant="secondary">Já faturado</Badge>}
                <Button variant="outline" onClick={() => startIssue(order)}>
                  Emitir NF-e
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-lg font-semibold">Notas emitidas</h3>
        <div className="mt-3 space-y-3">
          {(data?.documents ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhuma nota emitida até agora.</p>
          )}
          {(data?.documents ?? []).map((doc) => (
            <div key={doc.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">
                    NF-e {doc.numero ?? "—"} / série {doc.serie ?? "—"} — {doc.recipient_name}
                  </p>
                  <p className="break-all text-xs text-muted-foreground">
                    {doc.chave ? `Chave ${doc.chave}` : "Sem chave"} ·{" "}
                    {doc.environment === "producao" ? "Produção" : "Homologação"} · {brl(Number(doc.total))}
                  </p>
                  {doc.error_message && <p className="mt-1 text-xs text-destructive">{doc.error_message}</p>}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={doc.status === "autorizada" ? "secondary" : "outline"}>
                    {statusLabel[doc.status] ?? doc.status}
                  </Badge>
                  {doc.danfe_url && (
                    <a className="text-sm underline" href={doc.danfe_url} target="_blank" rel="noreferrer">
                      DANFE
                    </a>
                  )}
                  {doc.xml_url && (
                    <a className="text-sm underline" href={doc.xml_url} target="_blank" rel="noreferrer">
                      XML
                    </a>
                  )}
                  {doc.status === "autorizada" && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setCancelTarget({ id: doc.id, numero: doc.numero })}
                    >
                      Cancelar
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <Dialog open={Boolean(issue)} onOpenChange={(open) => !open && setIssue(null)}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Emitir NF-e {issue?.reference ? `— pedido ${issue.reference}` : ""}</DialogTitle>
            <DialogDescription>Confira os dados fiscais antes de enviar para a SEFAZ.</DialogDescription>
          </DialogHeader>

          {issue && (
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Número">
                  <Input value={issue.numero} onChange={(e) => setIssue({ ...issue, numero: e.target.value })} />
                </Field>
                <Field label="Série">
                  <Input value={issue.serie} onChange={(e) => setIssue({ ...issue, serie: e.target.value })} />
                </Field>
                <Field label="Natureza da operação">
                  <Input
                    value={issue.naturezaOperacao}
                    onChange={(e) => setIssue({ ...issue, naturezaOperacao: e.target.value })}
                  />
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Cliente">
                  <Input value={issue.nome} onChange={(e) => setIssue({ ...issue, nome: e.target.value })} />
                </Field>
                <Field label="CPF/CNPJ">
                  <Input value={issue.documento} onChange={(e) => setIssue({ ...issue, documento: e.target.value })} />
                </Field>
                <Field label="Inscrição estadual (se houver)">
                  <Input value={issue.ie} onChange={(e) => setIssue({ ...issue, ie: e.target.value })} />
                </Field>
                <Field label="E-mail">
                  <Input value={issue.email} onChange={(e) => setIssue({ ...issue, email: e.target.value })} />
                </Field>
                <Field label="Endereço">
                  <Input value={issue.logradouro} onChange={(e) => setIssue({ ...issue, logradouro: e.target.value })} />
                </Field>
                <Field label="Número">
                  <Input
                    value={issue.numeroEndereco}
                    onChange={(e) => setIssue({ ...issue, numeroEndereco: e.target.value })}
                  />
                </Field>
                <Field label="Bairro">
                  <Input value={issue.bairro} onChange={(e) => setIssue({ ...issue, bairro: e.target.value })} />
                </Field>
                <Field label="Cidade">
                  <Input value={issue.municipio} onChange={(e) => setIssue({ ...issue, municipio: e.target.value })} />
                </Field>
                <Field label="Código IBGE da cidade">
                  <Input
                    value={issue.codigoMunicipio}
                    onChange={(e) => setIssue({ ...issue, codigoMunicipio: e.target.value })}
                  />
                </Field>
                <Field label="UF">
                  <Input value={issue.uf} onChange={(e) => setIssue({ ...issue, uf: e.target.value })} />
                </Field>
                <Field label="CEP">
                  <Input value={issue.cep} onChange={(e) => setIssue({ ...issue, cep: e.target.value })} />
                </Field>
                <Field label="Telefone">
                  <Input value={issue.fone} onChange={(e) => setIssue({ ...issue, fone: e.target.value })} />
                </Field>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-semibold">Itens</p>
                {issue.itens.map((item, index) => (
                  <div key={index} className="grid gap-3 rounded-lg border border-border p-3 sm:grid-cols-6">
                    <div className="sm:col-span-2">
                      <Field label="Descrição">
                        <Input
                          value={item.descricao}
                          onChange={(e) => updateItem(setIssue, issue, index, { descricao: e.target.value })}
                        />
                      </Field>
                    </div>
                    <Field label="NCM">
                      <Input value={item.ncm} onChange={(e) => updateItem(setIssue, issue, index, { ncm: e.target.value })} />
                    </Field>
                    <Field label="CFOP">
                      <Input value={item.cfop} onChange={(e) => updateItem(setIssue, issue, index, { cfop: e.target.value })} />
                    </Field>
                    <Field label="Qtde">
                      <Input
                        value={item.quantidade}
                        onChange={(e) => updateItem(setIssue, issue, index, { quantidade: e.target.value })}
                      />
                    </Field>
                    <Field label="Valor unit. (R$)">
                      <Input
                        value={item.valorUnitario}
                        onChange={(e) => updateItem(setIssue, issue, index, { valorUnitario: e.target.value })}
                      />
                    </Field>
                  </div>
                ))}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Frete (R$)">
                  <Input value={issue.frete} onChange={(e) => setIssue({ ...issue, frete: e.target.value })} />
                </Field>
                <Field label="Desconto (R$)">
                  <Input value={issue.desconto} onChange={(e) => setIssue({ ...issue, desconto: e.target.value })} />
                </Field>
              </div>

              <Field label="Informações adicionais">
                <Textarea
                  rows={2}
                  value={issue.informacoesAdicionais}
                  onChange={(e) => setIssue({ ...issue, informacoesAdicionais: e.target.value })}
                />
              </Field>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIssue(null)}>
              Voltar
            </Button>
            <Button onClick={() => issue && emitir.mutate(issue)} disabled={emitir.isPending}>
              {emitir.isPending ? "Enviando à SEFAZ…" : "Emitir NF-e"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(cancelTarget)} onOpenChange={(open) => !open && setCancelTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar NF-e {cancelTarget?.numero ?? ""}</DialogTitle>
            <DialogDescription>
              A SEFAZ exige uma justificativa com pelo menos 15 caracteres.
            </DialogDescription>
          </DialogHeader>
          <Textarea rows={3} value={justificativa} onChange={(e) => setJustificativa(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelTarget(null)}>
              Voltar
            </Button>
            <Button
              variant="destructive"
              onClick={() => cancelar.mutate()}
              disabled={cancelar.isPending || justificativa.trim().length < 15}
            >
              Confirmar cancelamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function updateItem(
  setIssue: (form: IssueForm) => void,
  issue: IssueForm,
  index: number,
  patch: Partial<ItemForm>,
) {
  const itens = issue.itens.map((item, i) => (i === index ? { ...item, ...patch } : item));
  setIssue({ ...issue, itens });
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
