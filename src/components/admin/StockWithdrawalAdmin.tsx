import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, MinusCircle, PackageMinus, Search, Wrench, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { listStockWithdrawals, registerStockWithdrawal } from "@/lib/admin.functions";

type ProductOption = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  stock: number;
};

type Kind = "consumo" | "avaria";

const kindInfo: Record<Kind, { label: string; hint: string; icon: typeof Wrench }> = {
  consumo: {
    label: "Consumo",
    hint: "Uso interno: impressões, assistência, amostras, testes.",
    icon: Wrench,
  },
  avaria: {
    label: "Avaria",
    hint: "Produto danificado, com defeito ou perdido.",
    icon: AlertTriangle,
  },
};

const reasonSuggestions: Record<Kind, string[]> = {
  consumo: [
    "Uso na impressão sob demanda",
    "Uso na assistência técnica (O.S.)",
    "Amostra / demonstração na loja",
    "Teste de qualidade",
    "Brinde / ação de marketing",
  ],
  avaria: [
    "Danificado no transporte",
    "Defeito de fábrica",
    "Embalagem violada",
    "Filamento com umidade",
    "Quebra no manuseio",
  ],
};

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function StockWithdrawalAdmin({
  products,
  onSaved,
}: {
  products: ProductOption[];
  onSaved: () => void;
}) {
  const queryClient = useQueryClient();
  const history = useQuery({
    queryKey: ["admin-stock-withdrawals"],
    queryFn: () => listStockWithdrawals(),
    retry: false,
  });

  const [productSearch, setProductSearch] = useState("");
  const [productId, setProductId] = useState<string | null>(null);
  const [kind, setKind] = useState<Kind>("consumo");
  const [quantity, setQuantity] = useState("1");
  const [reason, setReason] = useState("");

  const [historySearch, setHistorySearch] = useState("");
  const [historyKind, setHistoryKind] = useState<"all" | Kind>("all");

  const product = products.find((p) => p.id === productId) ?? null;
  const qty = Math.max(0, Math.round(Number(quantity) || 0));
  const resulting = product ? product.stock - qty : 0;
  const qtyError =
    product && qty > product.stock
      ? `O estoque atual é de ${product.stock} un.`
      : qty < 1
        ? "Informe ao menos 1 unidade."
        : null;

  const matches = useMemo(() => {
    const q = normalize(productSearch.trim());
    if (!q) return [];
    const tokens = q.split(/\s+/);
    return products
      .filter((p) => {
        const hay = normalize(`${p.name} ${p.brand} ${p.slug}`);
        return tokens.every((t) => hay.includes(t));
      })
      .slice(0, 8);
  }, [products, productSearch]);

  const rows = history.data ?? [];
  const filteredRows = useMemo(() => {
    const q = normalize(historySearch.trim());
    return rows.filter((r) => {
      if (historyKind !== "all" && r.kind !== historyKind) return false;
      if (!q) return true;
      return normalize(`${r.product_name} ${r.reason} ${r.created_by_name}`).includes(q);
    });
  }, [rows, historySearch, historyKind]);

  const totals = useMemo(() => {
    const since = Date.now() - 30 * 24 * 60 * 60 * 1000;
    let consumo = 0;
    let avaria = 0;
    for (const r of rows) {
      if (new Date(r.created_at).getTime() < since) continue;
      if (r.kind === "avaria") avaria += r.quantity;
      else consumo += r.quantity;
    }
    return { consumo, avaria };
  }, [rows]);

  const mutation = useMutation({
    mutationFn: (input: { productId: string; kind: Kind; quantity: number; reason: string }) =>
      registerStockWithdrawal({ data: input } as never),
    onSuccess: () => {
      toast.success("Baixa registrada", {
        description: `${qty} un de ${product?.name ?? "produto"} (${kindInfo[kind].label.toLowerCase()}).`,
      });
      setQuantity("1");
      setReason("");
      setProductId(null);
      void queryClient.invalidateQueries({ queryKey: ["admin-stock-withdrawals"] });
      onSaved();
    },
    onError: (e: Error) => toast.error("Não foi possível registrar a baixa", { description: e.message }),
  });

  function submit() {
    if (!product) {
      toast.error("Selecione o produto");
      return;
    }
    if (qtyError) {
      toast.error(qtyError);
      return;
    }
    if (reason.trim().length < 3) {
      toast.error("Informe o motivo / destino da baixa");
      return;
    }
    if (
      !confirm(
        `Confirmar baixa de ${qty} un de "${product.name}" por ${kindInfo[kind].label.toLowerCase()}?\nEstoque passará de ${product.stock} para ${resulting}.`,
      )
    )
      return;
    mutation.mutate({ productId: product.id, kind, quantity: qty, reason: reason.trim() });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
      <section className="h-fit rounded-xl border border-border bg-card p-4">
        <h3 className="flex items-center gap-2 text-lg font-semibold">
          <PackageMinus className="h-5 w-5 text-primary" /> Nova baixa
        </h3>

        <div className="mt-4">
          <Label>Tipo de baixa</Label>
          <div className="mt-1 grid grid-cols-2 gap-2">
            {(Object.keys(kindInfo) as Kind[]).map((k) => {
              const Icon = kindInfo[k].icon;
              const active = kind === k;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKind(k)}
                  className={cn(
                    "rounded-lg border p-3 text-left transition-colors",
                    active
                      ? k === "avaria"
                        ? "border-destructive bg-destructive/10"
                        : "border-primary bg-primary/10"
                      : "border-border hover:bg-muted",
                  )}
                >
                  <span className="flex items-center gap-2 font-medium">
                    <Icon className={cn("h-4 w-4", k === "avaria" ? "text-destructive" : "text-primary")} />
                    {kindInfo[k].label}
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">{kindInfo[k].hint}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4">
          <Label>Produto</Label>
          {product ? (
            <div className="mt-1 flex items-start justify-between gap-2 rounded-lg border border-primary bg-primary/5 p-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{product.name}</p>
                <p className="text-xs text-muted-foreground">
                  {product.brand} · estoque atual <strong>{product.stock} un</strong>
                </p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                aria-label="Trocar produto"
                onClick={() => setProductId(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <>
              <div className="relative mt-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Busque pelo nome ou marca"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                />
              </div>
              {matches.length > 0 && (
                <div className="mt-2 space-y-1 rounded-lg border border-border p-2">
                  {matches.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      disabled={p.stock <= 0}
                      className="flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                      onClick={() => {
                        setProductId(p.id);
                        setProductSearch("");
                      }}
                    >
                      <span className="min-w-0 truncate">
                        {p.name} <span className="text-muted-foreground">· {p.brand}</span>
                      </span>
                      <span className="shrink-0 text-muted-foreground">
                        {p.stock > 0 ? `${p.stock} un` : "sem estoque"}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {productSearch.trim() && matches.length === 0 && (
                <p className="mt-2 text-sm text-muted-foreground">Nenhum produto encontrado.</p>
              )}
            </>
          )}
        </div>

        <div className="mt-4">
          <Label htmlFor="withdrawal-qty">Quantidade</Label>
          <Input
            id="withdrawal-qty"
            type="number"
            min={1}
            max={product?.stock}
            className="mt-1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
          {product && (
            <p className={cn("mt-1 text-xs", qtyError ? "text-destructive" : "text-muted-foreground")}>
              {qtyError ?? `Estoque passará de ${product.stock} para ${resulting} un.`}
            </p>
          )}
        </div>

        <div className="mt-4">
          <Label htmlFor="withdrawal-reason">Motivo / para onde vai</Label>
          <Textarea
            id="withdrawal-reason"
            className="mt-1"
            rows={3}
            maxLength={500}
            placeholder={
              kind === "consumo"
                ? "Ex.: usado na O.S. 123 para trocar o bico da impressora"
                : "Ex.: carretel chegou amassado da transportadora"
            }
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {reasonSuggestions[kind].map((s) => (
              <button
                key={s}
                type="button"
                className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={() => setReason((prev) => (prev.trim() ? `${s} — ${prev.trim()}` : s))}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <Button
          className="mt-5 w-full"
          variant={kind === "avaria" ? "destructive" : "cta"}
          disabled={mutation.isPending || !product || Boolean(qtyError) || reason.trim().length < 3}
          onClick={submit}
        >
          <MinusCircle className="mr-2 h-4 w-4" />
          {mutation.isPending ? "Registrando…" : `Registrar baixa por ${kindInfo[kind].label.toLowerCase()}`}
        </Button>
      </section>

      <section className="rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-semibold">Histórico de baixas</h3>
          <div className="flex gap-2 text-sm">
            <span className="rounded-lg bg-primary/10 px-3 py-1">
              Consumo (30 dias): <strong>{totals.consumo} un</strong>
            </span>
            <span className="rounded-lg bg-destructive/10 px-3 py-1">
              Avaria (30 dias): <strong>{totals.avaria} un</strong>
            </span>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Input
            className="min-w-[200px] flex-1"
            placeholder="Buscar por produto, motivo ou responsável"
            value={historySearch}
            onChange={(e) => setHistorySearch(e.target.value)}
          />
          <Select value={historyKind} onValueChange={(v) => setHistoryKind(v as typeof historyKind)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="consumo">Consumo</SelectItem>
              <SelectItem value="avaria">Avaria</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="mt-3 max-h-[640px] space-y-2 overflow-y-auto">
          {history.isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
          {history.isError && (
            <p className="text-sm text-destructive">Não foi possível carregar o histórico.</p>
          )}
          {!history.isLoading && filteredRows.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhuma baixa registrada.</p>
          )}
          {filteredRows.map((r) => (
            <div key={r.id} className="rounded-lg border border-border p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-medium">{r.product_name}</p>
                  <p className="mt-0.5 text-sm">{r.reason}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDate(r.created_at)} · {r.created_by_name || "—"} · estoque {r.previous_stock} →{" "}
                    {r.resulting_stock}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant={r.kind === "avaria" ? "destructive" : "secondary"}>
                    {r.kind === "avaria" ? "Avaria" : "Consumo"}
                  </Badge>
                  <span className="font-semibold">−{r.quantity} un</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
