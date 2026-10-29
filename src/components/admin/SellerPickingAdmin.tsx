import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  CheckCircle2,
  ClipboardList,
  Hand,
  PackageCheck,
  PackageOpen,
  Search,
  Timer,
  Undo2,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { formatBRL, imageFor } from "@/lib/catalog";
import { orderDelivery, paymentLabels, statusLabels } from "@/lib/sales-analytics";
import {
  PICKABLE_ORDER_STATUSES,
  pickedIds,
  pickingProgress,
} from "@/lib/picking";
import {
  claimOrderPicking,
  completeOrderPicking,
  releaseOrderPicking,
  togglePickedItem,
} from "@/lib/picking.functions";

export type PickingOrderRow = {
  id: string;
  reference: string;
  created_at: string;
  status: string;
  payment_method: string;
  total: number | string;
  customer_name: string;
  customer_phone: string | null;
  notes: string | null;
  shipping_address: unknown;
  picker_id: string | null;
  picker_name: string;
  picking_status: string;
  picking_started_at: string | null;
  picked_at: string | null;
  picked_item_ids: unknown;
  order_items: {
    id: string;
    product_id: string | null;
    product_slug: string;
    product_name: string;
    qty: number;
  }[];
};

type ProductLite = { id: string; slug: string; brand: string; image_key: string; image_url: string | null };

type View = "mine" | "queue" | "others" | "done";

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "";

export function SellerPickingAdmin({
  orders,
  products,
  currentUserId,
  isSeller,
  isAdmin,
  onChanged,
  onOpenMembers,
}: {
  orders: PickingOrderRow[];
  products: ProductLite[];
  currentUserId: string;
  isSeller: boolean;
  isAdmin: boolean;
  onChanged: () => void;
  onOpenMembers: () => void;
}) {
  const [search, setSearch] = useState("");
  const [localPicked, setLocalPicked] = useState<Record<string, string[]>>({});
  const [viewState, setView] = useState<View | null>(null);

  const claimFn = useServerFn(claimOrderPicking);
  const toggleFn = useServerFn(togglePickedItem);
  const completeFn = useServerFn(completeOrderPicking);
  const releaseFn = useServerFn(releaseOrderPicking);

  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const productBySlug = useMemo(() => new Map(products.map((p) => [p.slug, p])), [products]);

  const withLocal = (o: PickingOrderRow): PickingOrderRow =>
    localPicked[o.id] ? { ...o, picked_item_ids: localPicked[o.id] } : o;

  const groups = useMemo(() => {
    const pickable = (o: PickingOrderRow) =>
      (PICKABLE_ORDER_STATUSES as readonly string[]).includes(o.status);
    const mine = orders.filter((o) => o.picker_id === currentUserId && o.picking_status === "em_separacao");
    const queue = orders
      .filter((o) => pickable(o) && !o.picker_id && o.picking_status !== "separado")
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
    const others = orders.filter(
      (o) => o.picking_status === "em_separacao" && o.picker_id && o.picker_id !== currentUserId,
    );
    const done = orders
      .filter((o) => o.picking_status === "separado")
      .sort((a, b) => (b.picked_at ?? "").localeCompare(a.picked_at ?? ""));
    return { mine, queue, others, done };
  }, [orders, currentUserId]);

  const view: View = viewState ?? (groups.mine.length ? "mine" : "queue");

  const ranking = useMemo(() => {
    const since = Date.now() - 30 * 86_400_000;
    const map = new Map<string, { name: string; count: number; items: number }>();
    for (const o of groups.done) {
      if (!o.picked_at || new Date(o.picked_at).getTime() < since) continue;
      const key = o.picker_id ?? o.picker_name;
      const cur = map.get(key) ?? { name: o.picker_name || "Vendedor", count: 0, items: 0 };
      cur.count += 1;
      cur.items += o.order_items.reduce((s, i) => s + i.qty, 0);
      map.set(key, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [groups.done]);

  const claim = useMutation({
    mutationFn: (orderId: string) => claimFn({ data: { orderId } }),
    onSuccess: () => {
      toast.success("Pedido no seu nome. Bora separar!");
      setView("mine");
      onChanged();
    },
    onError: (e: Error) => {
      toast.error("Não foi possível pegar o pedido", { description: e.message });
      onChanged();
    },
  });

  const toggle = useMutation({
    mutationFn: (input: { orderId: string; itemId: string; picked: boolean; prev: string[] }) =>
      toggleFn({ data: { orderId: input.orderId, itemId: input.itemId, picked: input.picked } }),
    onMutate: (input) => {
      const next = input.picked
        ? Array.from(new Set([...input.prev, input.itemId]))
        : input.prev.filter((x) => x !== input.itemId);
      setLocalPicked((m) => ({ ...m, [input.orderId]: next }));
    },
    onSuccess: (res, input) => setLocalPicked((m) => ({ ...m, [input.orderId]: res.picked })),
    onError: (e: Error, input) => {
      setLocalPicked((m) => ({ ...m, [input.orderId]: input.prev }));
      toast.error("Não foi possível marcar o item", { description: e.message });
    },
  });

  const complete = useMutation({
    mutationFn: (orderId: string) => completeFn({ data: { orderId } }),
    onSuccess: () => {
      toast.success("Separação concluída");
      onChanged();
    },
    onError: (e: Error) => toast.error("Não foi possível concluir", { description: e.message }),
  });

  const release = useMutation({
    mutationFn: (orderId: string) => releaseFn({ data: { orderId } }),
    onSuccess: (_r, orderId) => {
      setLocalPicked((m) => {
        const { [orderId]: _drop, ...rest } = m;
        return rest;
      });
      toast.success("Pedido devolvido para a fila");
      onChanged();
    },
    onError: (e: Error) => toast.error("Não foi possível devolver", { description: e.message }),
  });

  const q = search.trim().toLowerCase();
  const list = groups[view].filter(
    (o) => !q || `${o.reference} ${o.customer_name} ${o.picker_name}`.toLowerCase().includes(q),
  );

  const tabs: { key: View; label: string; n: number; icon: typeof Hand }[] = [
    { key: "mine", label: "Minhas separações", n: groups.mine.length, icon: ClipboardList },
    { key: "queue", label: "Aguardando", n: groups.queue.length, icon: PackageOpen },
    { key: "others", label: "Com outros vendedores", n: groups.others.length, icon: UserRound },
    { key: "done", label: "Separados", n: groups.done.length, icon: PackageCheck },
  ];

  const itemImage = (i: PickingOrderRow["order_items"][number]) => {
    const p = (i.product_id && productById.get(i.product_id)) || productBySlug.get(i.product_slug);
    return { src: p ? imageFor(p.image_key, p.image_url) : imageFor(null), brand: p?.brand ?? "" };
  };

  return (
    <div className="space-y-4">
      {!isSeller && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-tech/50 bg-tech/5 p-4 text-sm">
          <p>
            Você está vendo a fila como administrador. Para <strong>pegar pedidos</strong>, sua
            conta precisa estar marcada como <strong>Vendedor</strong>.
          </p>
          <Button size="sm" variant="outline" onClick={onOpenMembers}>
            Abrir Clientes e membros
          </Button>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setView(t.key)}
            className={cn(
              "flex items-center gap-3 rounded-xl border bg-card p-4 text-left transition-colors hover:border-tech",
              view === t.key ? "border-tech ring-1 ring-tech" : "border-border",
            )}
          >
            <span
              className={cn(
                "grid size-10 shrink-0 place-items-center rounded-lg",
                view === t.key ? "bg-tech text-tech-foreground" : "bg-secondary text-tech",
              )}
            >
              <t.icon className="size-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-2xl font-bold leading-none">{t.n}</span>
              <span className="mt-1 block truncate text-xs text-muted-foreground">{t.label}</span>
            </span>
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Buscar por pedido, cliente ou vendedor"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {list.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          {view === "mine"
            ? "Você não tem pedidos em separação. Pegue um na fila \"Aguardando\"."
            : view === "queue"
              ? "Nenhum pedido aguardando separação."
              : view === "others"
                ? "Nenhum pedido com outros vendedores agora."
                : "Nenhum pedido separado ainda."}
        </div>
      )}

      <div className={cn("grid gap-4", view === "mine" ? "xl:grid-cols-2" : "lg:grid-cols-2")}>
        {list.map((raw) => {
          const o = withLocal(raw);
          const prog = pickingProgress(o);
          const picked = new Set(pickedIds(o));
          const units = o.order_items.reduce((s, i) => s + i.qty, 0);
          const coleta = orderDelivery(o as never) === "coleta";
          const isMine = o.picker_id === currentUserId && o.picking_status === "em_separacao";
          return (
            <article key={o.id} className="flex flex-col rounded-xl border border-border bg-card">
              <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border p-4">
                <div className="min-w-0">
                  <p className="font-semibold">
                    {o.reference} <span className="text-muted-foreground">—</span> {o.customer_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Pedido em {fmtDate(o.created_at)}
                    {o.customer_phone ? ` • ${o.customer_phone}` : ""}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Badge
                      className={cn(
                        coleta ? "bg-accent text-accent-foreground" : "bg-brand text-brand-foreground",
                      )}
                    >
                      {coleta ? "Coleta no balcão" : "Envio"}
                    </Badge>
                    <Badge variant="outline">{statusLabels[o.status] ?? o.status}</Badge>
                    <Badge variant="secondary">
                      {paymentLabels[o.payment_method] ?? o.payment_method}
                    </Badge>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-brand">{formatBRL(Number(o.total))}</p>
                  <p className="text-xs text-muted-foreground">
                    {o.order_items.length} produto(s) • {units} un.
                  </p>
                </div>
              </header>

              {(isMine || view === "others" || view === "done") && (
                <div className="space-y-1.5 px-4 pt-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                      <UserRound className="size-3.5" />
                      {o.picker_name || "Vendedor"}
                      {o.picking_status === "separado"
                        ? ` • separado em ${fmtDate(o.picked_at)}`
                        : ` • desde ${fmtDate(o.picking_started_at)}`}
                    </span>
                    <span className="font-medium">
                      {prog.done}/{prog.total} itens
                    </span>
                  </div>
                  <Progress value={prog.total ? (prog.done / prog.total) * 100 : 0} className="h-2" />
                </div>
              )}

              <ul className="flex-1 divide-y divide-border px-4 py-2">
                {o.order_items.map((i) => {
                  const img = itemImage(i);
                  const checked = picked.has(i.id);
                  const content = (
                    <>
                      <img
                        src={img.src}
                        alt=""
                        className="size-12 shrink-0 rounded-md border border-border bg-muted object-contain"
                        loading="lazy"
                      />
                      <span className="grid size-10 shrink-0 place-items-center rounded-md bg-secondary text-base font-bold">
                        {i.qty}×
                      </span>
                      <span className="min-w-0 flex-1">
                        <span
                          className={cn(
                            "block text-sm font-medium",
                            checked && "text-muted-foreground line-through",
                          )}
                        >
                          {i.product_name}
                        </span>
                        {img.brand && (
                          <span className="block text-xs text-muted-foreground">{img.brand}</span>
                        )}
                      </span>
                    </>
                  );
                  return (
                    <li key={i.id}>
                      {isMine ? (
                        <label className="flex cursor-pointer items-center gap-3 py-2.5">
                          <Checkbox
                            className="size-6"
                            checked={checked}
                            onCheckedChange={(v) =>
                              toggle.mutate({
                                orderId: o.id,
                                itemId: i.id,
                                picked: v === true,
                                prev: pickedIds(o),
                              })
                            }
                            aria-label={`Separado: ${i.product_name}`}
                          />
                          {content}
                          {checked && <CheckCircle2 className="size-5 shrink-0 text-success" />}
                        </label>
                      ) : (
                        <div className="flex items-center gap-3 py-2.5">
                          {content}
                          {view !== "queue" && checked && (
                            <CheckCircle2 className="size-5 shrink-0 text-success" />
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>

              {o.notes && view !== "done" && (
                <p className="mx-4 mb-3 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                  {o.notes}
                </p>
              )}

              <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-border p-4">
                {view === "queue" && (
                  <Button
                    variant="cta"
                    disabled={!isSeller || claim.isPending}
                    onClick={() => claim.mutate(o.id)}
                  >
                    <Hand className="size-4" /> Pegar para separar
                  </Button>
                )}
                {isMine && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={release.isPending}
                      onClick={() => {
                        if (window.confirm(`Devolver ${o.reference} para a fila?`)) release.mutate(o.id);
                      }}
                    >
                      <Undo2 className="size-4" /> Devolver para a fila
                    </Button>
                    {prog.complete ? (
                      <Button
                        variant="cta"
                        size="lg"
                        className="w-full sm:w-auto"
                        disabled={complete.isPending || toggle.isPending}
                        onClick={() => complete.mutate(o.id)}
                      >
                        <PackageCheck className="size-5" /> Finalizar separação
                      </Button>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        Faltam {prog.total - prog.done} item(ns) para finalizar
                      </span>
                    )}
                  </>
                )}
                {view === "others" && isAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={release.isPending}
                    onClick={() => {
                      if (
                        window.confirm(
                          `Tirar ${o.reference} de ${o.picker_name || "outro vendedor"} e devolver para a fila?`,
                        )
                      )
                        release.mutate(o.id);
                    }}
                  >
                    <Undo2 className="size-4" /> Devolver para a fila
                  </Button>
                )}
                {view === "done" && (
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-success">
                    <CheckCircle2 className="size-4" /> Separado por {o.picker_name || "vendedor"}
                  </span>
                )}
              </footer>
            </article>
          );
        })}
      </div>

      {ranking.length > 0 && (
        <section className="rounded-xl border border-border bg-card p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Timer className="size-4 text-tech" /> Separações por vendedor (últimos 30 dias)
          </h3>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {ranking.map((r) => (
              <li
                key={r.name}
                className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
              >
                <span className="truncate font-medium">{r.name}</span>
                <span className="shrink-0 text-muted-foreground">
                  {r.count} pedido(s) • {r.items} un.
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
