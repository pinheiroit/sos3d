import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  ChevronDown,
  Clock,
  LogIn,
  MessageCircle,
  MonitorSmartphone,
  ShoppingCart,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { formatBRL } from "@/lib/catalog";
import { originLabel } from "@/lib/cart-tracking";
import { listCartSessions, markCartContacted } from "@/lib/cart-tracking.functions";

type Row = Awaited<ReturnType<typeof listCartSessions>>[number];
type CartItem = { slug: string; name: string; brand: string; qty: number; price: number };
type StatusFilter = "abandonados" | "andamento" | "recuperados" | "todos";

/** Tempo sem atividade para considerar o carrinho abandonado. */
const ABANDON_AFTER_MS = 60 * 60 * 1000;

const pageNames: Record<string, string> = {
  "/": "Página inicial",
  "/loja": "Loja",
  "/filamentos": "Filamentos",
  "/impressoras": "Impressoras",
  "/acessorios": "Peças e acessórios",
  "/impressao-3d": "Impressão sob demanda",
  "/makers": "Área Maker",
  "/empresa": "Empresa",
  "/contato": "Contato",
  "/suporte": "Suporte",
  "/carrinho": "Carrinho",
  "/checkout": "Finalizar pedido",
  "/auth": "Login",
  "/portal": "Minha SOS-3D",
};

function pageLabel(path: string) {
  if (!path) return "Não identificada";
  const clean = path.split("?")[0] ?? path;
  if (clean.startsWith("/produto/")) return `Produto: ${clean.replace("/produto/", "")}`;
  return pageNames[clean] ?? clean;
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function stateOf(r: Row): "recuperado" | "abandonado" | "andamento" {
  if (r.status === "convertido") return "recuperado";
  return Date.now() - new Date(r.updated_at).getTime() > ABANDON_AFTER_MS ? "abandonado" : "andamento";
}

function timeAgo(iso: string) {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const min = Math.round(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.round(h / 24);
  return `há ${d} dia${d > 1 ? "s" : ""}`;
}

function whatsappUrl(r: Row) {
  let digits = (r.customer_phone || "").replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length <= 11) digits = `55${digits}`;
  const items = (r.items as CartItem[]).map((i) => `${i.qty}x ${i.name}`).join(", ");
  const first = (r.customer_name || "").split(" ")[0];
  const msg =
    `Olá${first ? ` ${first}` : ""}! Aqui é da SOS.3D. Vimos que você deixou no carrinho: ${items}. ` +
    `Posso te ajudar a finalizar a compra? https://sos3d.com.br/carrinho`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(msg)}`;
}

function topCounts(values: string[], limit = 5) {
  const map = new Map<string, number>();
  for (const v of values) map.set(v, (map.get(v) ?? 0) + 1);
  return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
}

export function AbandonedCartsAdmin() {
  const queryClient = useQueryClient();
  const [days, setDays] = useState("30");
  const [status, setStatus] = useState<StatusFilter>("abandonados");
  const [search, setSearch] = useState("");
  const [onlyContact, setOnlyContact] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["admin-cart-sessions", days],
    queryFn: () => listCartSessions({ data: { days: Number(days) } } as never),
    retry: false,
  });

  const contacted = useMutation({
    mutationFn: (input: { id: string; contacted: boolean }) =>
      markCartContacted({ data: input } as never),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin-cart-sessions"] }),
    onError: (e: Error) => toast.error("Não foi possível atualizar", { description: e.message }),
  });

  const rows = query.data ?? [];

  const stats = useMemo(() => {
    const abandoned = rows.filter((r) => stateOf(r) === "abandonado");
    const recovered = rows.filter((r) => stateOf(r) === "recuperado");
    const closed = abandoned.length + recovered.length;
    return {
      abandoned,
      abandonedValue: abandoned.reduce((s, r) => s + Number(r.subtotal), 0),
      recoveredCount: recovered.length,
      conversion: closed ? Math.round((recovered.length / closed) * 100) : 0,
      reachedCheckout: abandoned.filter((r) => r.reached_checkout).length,
      entryPages: topCounts(abandoned.map((r) => pageLabel(r.entry_page))),
      origins: topCounts(abandoned.map((r) => originLabel(r))),
      exitPages: topCounts(abandoned.map((r) => pageLabel(r.last_page))),
    };
  }, [rows]);

  const filtered = useMemo(() => {
    const q = normalize(search.trim());
    return rows.filter((r) => {
      const st = stateOf(r);
      if (status === "abandonados" && st !== "abandonado") return false;
      if (status === "andamento" && st !== "andamento") return false;
      if (status === "recuperados" && st !== "recuperado") return false;
      if (onlyContact && !r.customer_phone && !r.customer_email) return false;
      if (!q) return true;
      const items = (r.items as CartItem[]).map((i) => `${i.name} ${i.brand}`).join(" ");
      return normalize(
        `${r.customer_name} ${r.customer_email} ${r.customer_phone} ${items} ${r.entry_page}`,
      ).includes(q);
    });
  }, [rows, status, search, onlyContact]);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={ShoppingCart} label="Carrinhos abandonados" value={String(stats.abandoned.length)} />
        <Kpi icon={Clock} label="Valor parado no carrinho" value={formatBRL(stats.abandonedValue)} />
        <Kpi
          icon={LogIn}
          label="Chegaram a finalizar pedido"
          value={String(stats.reachedCheckout)}
          hint="Abandonaram na tela de pagamento"
        />
        <Kpi
          icon={TrendingUp}
          label="Taxa de conversão"
          value={`${stats.conversion}%`}
          hint={`${stats.recoveredCount} carrinho(s) viraram pedido`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <RankCard title="Onde entraram no site" rows={stats.entryPages} />
        <RankCard title="De onde vieram" rows={stats.origins} />
        <RankCard title="Última página antes de sair" rows={stats.exitPages} />
      </div>

      <section className="rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            className="min-w-[220px] flex-1"
            placeholder="Buscar por cliente, contato ou produto"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="abandonados">Abandonados</SelectItem>
              <SelectItem value="andamento">Em andamento (última hora)</SelectItem>
              <SelectItem value="recuperados">Viraram pedido</SelectItem>
              <SelectItem value="todos">Todos</SelectItem>
            </SelectContent>
          </Select>
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Últimas 24 h</SelectItem>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2 px-1">
            <Switch id="only-contact" checked={onlyContact} onCheckedChange={setOnlyContact} />
            <Label htmlFor="only-contact" className="text-sm">
              Só com contato
            </Label>
          </div>
        </div>

        <p className="mt-3 text-xs text-muted-foreground">
          Um carrinho é considerado abandonado após 1 hora sem atividade. O registro começou a
          funcionar hoje; carrinhos anteriores não aparecem.
        </p>

        <div className="mt-3 space-y-2">
          {query.isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
          {query.isError && (
            <p className="text-sm text-destructive">Não foi possível carregar os carrinhos.</p>
          )}
          {!query.isLoading && filtered.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum carrinho encontrado neste filtro.</p>
          )}
          {filtered.map((r) => {
            const st = stateOf(r);
            const items = r.items as CartItem[];
            const wa = whatsappUrl(r);
            const isOpen = open === r.id;
            return (
              <div key={r.id} className="rounded-lg border border-border">
                <button
                  type="button"
                  className="flex w-full flex-wrap items-center justify-between gap-3 p-3 text-left hover:bg-muted/50"
                  onClick={() => setOpen(isOpen ? null : r.id)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-medium">
                        {r.customer_name || "Visitante não identificado"}
                      </p>
                      {st === "abandonado" && <Badge variant="destructive">Abandonado</Badge>}
                      {st === "andamento" && <Badge variant="secondary">Em andamento</Badge>}
                      {st === "recuperado" && (
                        <Badge className="bg-primary text-primary-foreground">
                          Pedido {r.order_reference}
                        </Badge>
                      )}
                      {r.reached_checkout && st !== "recuperado" && (
                        <Badge variant="outline">Chegou ao pagamento</Badge>
                      )}
                      {r.contacted_at && <Badge variant="outline">Contatado</Badge>}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      Entrou por <strong>{pageLabel(r.entry_page)}</strong> · {originLabel(r)} ·{" "}
                      {r.item_count} item(ns) · {timeAgo(r.updated_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">{formatBRL(Number(r.subtotal))}</span>
                    <ChevronDown
                      className={cn("h-4 w-4 text-muted-foreground transition-transform", isOpen && "rotate-180")}
                    />
                  </div>
                </button>

                {isOpen && (
                  <div className="grid gap-4 border-t border-border p-3 md:grid-cols-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Produtos no carrinho
                      </p>
                      <ul className="mt-2 space-y-1 text-sm">
                        {items.map((i) => (
                          <li key={i.slug} className="flex justify-between gap-2">
                            <span className="min-w-0 truncate">
                              {i.qty}x {i.name}{" "}
                              <span className="text-muted-foreground">· {i.brand}</span>
                            </span>
                            <span className="shrink-0">{formatBRL(i.qty * i.price)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="space-y-1 text-sm">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Visita
                      </p>
                      <Info label="Página de entrada" value={pageLabel(r.entry_page)} />
                      <Info label="Origem" value={originLabel(r)} />
                      {r.utm_campaign && <Info label="Campanha" value={r.utm_campaign} />}
                      <Info label="Última página" value={pageLabel(r.last_page)} />
                      <Info
                        label="Aparelho"
                        value={r.device === "mobile" ? "Celular" : r.device === "desktop" ? "Computador" : "—"}
                        icon={MonitorSmartphone}
                      />
                      <Info
                        label="Início / última ação"
                        value={`${new Date(r.created_at).toLocaleString("pt-BR")} / ${new Date(r.updated_at).toLocaleString("pt-BR")}`}
                      />
                      <p className="pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Contato
                      </p>
                      <Info label="E-mail" value={r.customer_email || "—"} />
                      <Info label="Telefone" value={r.customer_phone || "—"} />
                      {st !== "recuperado" && (
                        <div className="flex flex-wrap gap-2 pt-2">
                          {wa && (
                            <Button asChild size="sm" variant="cta">
                              <a href={wa} target="_blank" rel="noreferrer">
                                <MessageCircle className="mr-2 h-4 w-4" /> Chamar no WhatsApp
                              </a>
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={contacted.isPending}
                            onClick={() => contacted.mutate({ id: r.id, contacted: !r.contacted_at })}
                          >
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            {r.contacted_at ? "Desmarcar contato" : "Marcar como contatado"}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof ShoppingCart;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="h-4 w-4 text-primary" /> {label}
      </p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function RankCard({ title, rows }: { title: string; rows: [string, number][] }) {
  const max = rows[0]?.[1] ?? 1;
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-sm font-semibold">{title}</p>
      <p className="text-xs text-muted-foreground">Entre os carrinhos abandonados</p>
      <div className="mt-3 space-y-2">
        {rows.length === 0 && <p className="text-sm text-muted-foreground">Sem dados ainda.</p>}
        {rows.map(([label, count]) => (
          <div key={label}>
            <div className="flex justify-between gap-2 text-sm">
              <span className="min-w-0 truncate">{label}</span>
              <span className="shrink-0 text-muted-foreground">{count}</span>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-muted">
              <div className="h-1.5 rounded-full bg-primary" style={{ width: `${(count / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Info({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon?: typeof ShoppingCart;
}) {
  return (
    <p className="flex flex-wrap gap-1">
      <span className="text-muted-foreground">
        {Icon && <Icon className="mr-1 inline h-3.5 w-3.5" />}
        {label}:
      </span>
      <span className="min-w-0 break-words">{value}</span>
    </p>
  );
}
