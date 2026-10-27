import { useMemo, useState } from "react";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowDownRight,
  ArrowUpRight,
  Ban,
  CalendarRange,
  ChevronDown,
  CircleDollarSign,
  Clock,
  Download,
  Filter,
  Package,
  ReceiptText,
  Search,
  ShoppingBasket,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import { formatBRL } from "@/lib/catalog";
import {
  computeKpis,
  defaultSalesFilters,
  filterOrders,
  hasItemFilter,
  itemBreakdown,
  orderBreakdown,
  orderChannel,
  orderCity,
  orderDelivery,
  paymentLabels,
  percentChange,
  periodLabels,
  previousRange,
  resolveRange,
  statusLabels,
  timeline,
  topCustomers,
  weekdayBreakdown,
  type Breakdown,
  type FilteredOrder,
  type PeriodPreset,
  type ProductInfo,
  type SalesFilters,
  type SalesOrder,
} from "@/lib/sales-analytics";

type Option = { value: string; label: string };

export type SalesLookups = {
  categories: Option[];
  subcategories: (Option & { category: string })[];
  categoryName: (slug: string) => string;
  subcategoryName: (slug: string, category: string) => string;
};

const shortBRL = (v: number) =>
  v >= 1000 ? `R$ ${(v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil` : formatBRL(v);

const fmtDate = (d: Date) => d.toLocaleDateString("pt-BR");

/* ============================== Filtros ============================== */

export function useSalesFilters() {
  return useState<SalesFilters>(defaultSalesFilters);
}

export function SalesFiltersBar({
  filters,
  onChange,
  orders,
  products,
  lookups,
}: {
  filters: SalesFilters;
  onChange: (next: SalesFilters) => void;
  orders: SalesOrder[];
  products: ProductInfo[];
  lookups: SalesLookups;
}) {
  const [open, setOpen] = useState(false);
  const set = <K extends keyof SalesFilters>(key: K, value: SalesFilters[K]) =>
    onChange({ ...filters, [key]: value });

  const brands = useMemo(
    () =>
      [...new Set(products.map((p) => p.brand).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b, "pt-BR"),
      ),
    [products],
  );
  const customerNames = useMemo(
    () => [...new Set(orders.map((o) => o.customer_name.trim()).filter(Boolean))].sort(),
    [orders],
  );
  const subs = lookups.subcategories.filter(
    (s) => filters.category === "all" || s.category === filters.category,
  );
  const range = resolveRange(filters);

  const advancedKeys: (keyof SalesFilters)[] = [
    "category",
    "subcategory",
    "brand",
    "status",
    "payment",
    "channel",
    "delivery",
  ];
  const advancedCount =
    advancedKeys.filter((k) => filters[k] !== "all").length + (filters.product.trim() ? 1 : 0);
  const isDefault = JSON.stringify(filters) === JSON.stringify(defaultSalesFilters);

  const chips: { label: string; clear: () => void }[] = [];
  if (filters.customer.trim()) chips.push({ label: `Cliente: ${filters.customer}`, clear: () => set("customer", "") });
  if (filters.product.trim()) chips.push({ label: `Produto: ${filters.product}`, clear: () => set("product", "") });
  if (filters.category !== "all")
    chips.push({
      label: lookups.categoryName(filters.category),
      clear: () => onChange({ ...filters, category: "all", subcategory: "all" }),
    });
  if (filters.subcategory !== "all")
    chips.push({ label: lookups.subcategoryName(filters.subcategory, filters.category), clear: () => set("subcategory", "all") });
  if (filters.brand !== "all") chips.push({ label: `Marca: ${filters.brand}`, clear: () => set("brand", "all") });
  if (filters.status !== "all") chips.push({ label: statusLabels[filters.status] ?? filters.status, clear: () => set("status", "all") });
  if (filters.payment !== "all") chips.push({ label: paymentLabels[filters.payment] ?? filters.payment, clear: () => set("payment", "all") });
  if (filters.channel !== "all") chips.push({ label: filters.channel === "site" ? "Site" : "Televendas", clear: () => set("channel", "all") });
  if (filters.delivery !== "all") chips.push({ label: filters.delivery === "coleta" ? "Coleta" : "Envio", clear: () => set("delivery", "all") });

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-3 md:p-4">
      <div className="flex flex-wrap items-end gap-2">
        <div className="w-full sm:w-48">
          <Label className="text-xs">Período</Label>
          <Select value={filters.period} onValueChange={(v) => set("period", v as PeriodPreset)}>
            <SelectTrigger className="mt-1">
              <CalendarRange className="mr-2 size-4 text-tech" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(periodLabels) as PeriodPreset[]).map((p) => (
                <SelectItem key={p} value={p}>
                  {periodLabels[p]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {filters.period === "custom" && (
          <>
            <div className="w-[calc(50%-0.25rem)] sm:w-40">
              <Label className="text-xs">De</Label>
              <Input type="date" className="mt-1" value={filters.from} onChange={(e) => set("from", e.target.value)} />
            </div>
            <div className="w-[calc(50%-0.25rem)] sm:w-40">
              <Label className="text-xs">Até</Label>
              <Input type="date" className="mt-1" value={filters.to} onChange={(e) => set("to", e.target.value)} />
            </div>
          </>
        )}
        <div className="min-w-0 flex-1 basis-56">
          <Label className="text-xs">Cliente</Label>
          <div className="relative mt-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              list="sales-customers"
              className="pl-9"
              placeholder="Nome, e-mail, CPF, telefone ou nº do pedido"
              value={filters.customer}
              onChange={(e) => set("customer", e.target.value)}
            />
            <datalist id="sales-customers">
              {customerNames.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
          </div>
        </div>
        <Button variant="outline" onClick={() => setOpen((o) => !o)} className="gap-2">
          <Filter className="size-4" /> Mais filtros
          {advancedCount > 0 && (
            <span className="rounded-full bg-tech px-1.5 text-xs text-tech-foreground">{advancedCount}</span>
          )}
          <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} />
        </Button>
        {!isDefault && (
          <Button variant="ghost" onClick={() => onChange(defaultSalesFilters)}>
            Limpar
          </Button>
        )}
      </div>

      {open && (
        <div className="grid gap-3 border-t border-border pt-3 sm:grid-cols-2 lg:grid-cols-4">
          <FilterSelect
            label="Categoria"
            value={filters.category}
            onChange={(v) => onChange({ ...filters, category: v, subcategory: "all" })}
            options={lookups.categories}
          />
          <FilterSelect
            label="Subcategoria"
            value={filters.subcategory}
            onChange={(v) => set("subcategory", v)}
            options={subs.map((s) => ({ value: s.value, label: s.label }))}
          />
          <FilterSelect
            label="Marca"
            value={filters.brand}
            onChange={(v) => set("brand", v)}
            options={brands.map((b) => ({ value: b, label: b }))}
          />
          <div>
            <Label className="text-xs">Produto</Label>
            <Input
              className="mt-1"
              placeholder="Ex.: PLA, A1 Mini"
              value={filters.product}
              onChange={(e) => set("product", e.target.value)}
            />
          </div>
          <FilterSelect
            label="Status do pedido"
            value={filters.status}
            onChange={(v) => set("status", v)}
            options={Object.entries(statusLabels).map(([value, label]) => ({ value, label }))}
          />
          <FilterSelect
            label="Forma de pagamento"
            value={filters.payment}
            onChange={(v) => set("payment", v)}
            options={Object.entries(paymentLabels).map(([value, label]) => ({ value, label }))}
          />
          <FilterSelect
            label="Canal de venda"
            value={filters.channel}
            onChange={(v) => set("channel", v as SalesFilters["channel"])}
            options={[
              { value: "site", label: "Site" },
              { value: "televendas", label: "Televendas" },
            ]}
          />
          <FilterSelect
            label="Entrega"
            value={filters.delivery}
            onChange={(v) => set("delivery", v as SalesFilters["delivery"])}
            options={[
              { value: "envio", label: "Envio" },
              { value: "coleta", label: "Coleta (retirada)" },
            ]}
          />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>
          {range.start && range.end
            ? `${fmtDate(range.start)} a ${fmtDate(new Date(range.end.getTime() - 1))}`
            : range.start
              ? `A partir de ${fmtDate(range.start)}`
              : range.end
                ? `Até ${fmtDate(new Date(range.end.getTime() - 1))}`
                : "Todo o histórico"}
        </span>
        {chips.map((c) => (
          <button
            key={c.label}
            type="button"
            onClick={c.clear}
            className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary px-2 py-0.5 text-foreground hover:bg-secondary/70"
          >
            {c.label} <X className="size-3" />
          </button>
        ))}
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Option[];
}) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="mt-1">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/* ============================== Visão geral ============================== */

const chartColors: string[] = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--success)", "var(--chart-5)"];

export function SalesOverview({
  orders,
  products,
  filters,
  onChange,
  lookups,
}: {
  orders: SalesOrder[];
  products: ProductInfo[];
  filters: SalesFilters;
  onChange: (next: SalesFilters) => void;
  lookups: SalesLookups;
}) {
  const m = useMemo(() => {
    const range = resolveRange(filters);
    const itemFilter = hasItemFilter(filters);
    const current = filterOrders(orders, products, filters, range);
    const prevRange = previousRange(range);
    const previous = prevRange ? filterOrders(orders, products, filters, prevRange) : null;
    const kpis = computeKpis(current, itemFilter);
    const prevKpis = previous ? computeKpis(previous, itemFilter) : null;
    return {
      itemFilter,
      current,
      kpis,
      prevKpis,
      series: timeline(current, range, itemFilter),
      byCategory: itemBreakdown(current, products, (_i, p) => ({
        key: p?.category || "-",
        label: p?.category ? lookups.categoryName(p.category) : "Sem categoria",
      })),
      bySubcategory: itemBreakdown(current, products, (_i, p) => ({
        key: `${p?.category ?? ""}|${p?.subcategory ?? ""}`,
        label: p?.subcategory
          ? `${lookups.subcategoryName(p.subcategory, p.category)} · ${lookups.categoryName(p.category)}`
          : `${p?.category ? lookups.categoryName(p.category) : "Sem categoria"} (sem subcategoria)`,
      })),
      byProduct: itemBreakdown(
        current,
        products,
        (i, p) => ({ key: p?.id ?? i.product_slug, label: p?.name ?? i.product_name }),
        10,
      ),
      byBrand: itemBreakdown(current, products, (_i, p) => ({ key: p?.brand || "-", label: p?.brand || "Sem marca" }), 8),
      byPayment: orderBreakdown(current, (o) => ({ key: o.payment_method, label: paymentLabels[o.payment_method] ?? o.payment_method }), { itemFilter }),
      byChannel: orderBreakdown(current, (o) => ({ key: orderChannel(o), label: orderChannel(o) === "site" ? "Site" : "Televendas" }), { itemFilter }),
      byDelivery: orderBreakdown(current, (o) => ({ key: orderDelivery(o), label: orderDelivery(o) === "coleta" ? "Coleta" : "Envio" }), { itemFilter }),
      byStatus: orderBreakdown(current, (o) => ({ key: o.status, label: statusLabels[o.status] ?? o.status }), { includeCancelled: true, itemFilter }),
      byCity: orderBreakdown(current, (o) => ({ key: orderCity(o), label: orderCity(o) }), { itemFilter, limit: 8 }),
      customers: topCustomers(current, itemFilter, 8),
      weekdays: weekdayBreakdown(current, itemFilter),
    };
  }, [orders, products, filters, lookups]);

  const [catMode, setCatMode] = useState<"category" | "subcategory">("category");
  const k = m.kpis;
  const p = m.prevKpis;
  const cards = [
    { icon: CircleDollarSign, t: m.itemFilter ? "Vendas dos itens filtrados" : "Faturamento", v: formatBRL(k.revenue), d: p ? percentChange(k.revenue, p.revenue) : null },
    { icon: ReceiptText, t: "Pedidos", v: String(k.orders), d: p ? percentChange(k.orders, p.orders) : null },
    { icon: ShoppingBasket, t: "Ticket médio", v: formatBRL(k.avgTicket), d: p ? percentChange(k.avgTicket, p.avgTicket) : null },
    { icon: Package, t: "Itens vendidos", v: k.itemsSold.toLocaleString("pt-BR"), d: p ? percentChange(k.itemsSold, p.itemsSold) : null },
    { icon: Users, t: "Clientes que compraram", v: String(k.customers), d: p ? percentChange(k.customers, p.customers) : null },
    { icon: Clock, t: "Pendentes", v: formatBRL(k.pendingValue), sub: `${k.pendingCount} pedido(s) aguardando`, d: null },
  ];

  const timeConfig = {
    revenue: { label: "Faturamento", color: "var(--chart-2)" },
    orders: { label: "Pedidos", color: "var(--chart-3)" },
  } satisfies ChartConfig;

  const empty = m.current.length === 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {cards.map((c) => (
          <div key={c.t} className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">{c.t}</p>
              <c.icon className="size-5 shrink-0 text-tech" />
            </div>
            <p className="mt-2 text-2xl font-bold">{c.v}</p>
            {c.d !== null && c.d !== undefined ? (
              <p className={cn("mt-1 flex items-center gap-1 text-xs", c.d >= 0 ? "text-success" : "text-destructive")}>
                {c.d >= 0 ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
                {Math.abs(c.d).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% vs. período anterior
              </p>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground">{"sub" in c && c.sub ? c.sub : p ? "Sem base no período anterior" : "\u00a0"}</p>
            )}
          </div>
        ))}
      </div>
      {k.cancelledCount > 0 && (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Ban className="size-3.5" /> {k.cancelledCount} pedido(s) cancelado(s) no período ({formatBRL(k.cancelledValue)}), fora do faturamento.
        </p>
      )}

      {empty ? (
        <div className="rounded-lg border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          Nenhuma venda encontrada com esses filtros. Tente outro período ou limpe os filtros.
        </div>
      ) : (
        <>
          <Panel title="Faturamento e pedidos no período" subtitle="Pedidos cancelados não entram">
            <ChartContainer config={timeConfig} className="aspect-auto h-72 w-full">
              <ComposedChart data={m.series} margin={{ left: 4, right: 4, top: 8 }}>
                <defs>
                  <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-revenue)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="var(--color-revenue)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={16} />
                <YAxis yAxisId="r" tickLine={false} axisLine={false} width={72} tickFormatter={(v: number) => shortBRL(v)} />
                <YAxis yAxisId="o" orientation="right" tickLine={false} axisLine={false} allowDecimals={false} width={28} />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value, name) => (
                        <div className="flex w-full justify-between gap-4">
                          <span className="text-muted-foreground">{name === "revenue" ? "Faturamento" : "Pedidos"}</span>
                          <span className="font-mono font-medium">{name === "revenue" ? formatBRL(Number(value)) : String(value)}</span>
                        </div>
                      )}
                    />
                  }
                />
                <Bar yAxisId="o" dataKey="orders" fill="var(--color-orders)" radius={[3, 3, 0, 0]} maxBarSize={18} opacity={0.6} />
                <Area yAxisId="r" dataKey="revenue" type="monotone" stroke="var(--color-revenue)" strokeWidth={2} fill="url(#fillRevenue)" />
              </ComposedChart>
            </ChartContainer>
          </Panel>

          <div className="grid gap-4 xl:grid-cols-2">
            <Panel
              title="Vendas por categoria"
              subtitle="Valor dos itens vendidos · clique para filtrar"
              action={
                <div className="flex rounded-md border border-border p-0.5 text-xs">
                  {(["category", "subcategory"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setCatMode(mode)}
                      className={cn("rounded px-2 py-1", catMode === mode ? "bg-tech text-tech-foreground" : "text-muted-foreground")}
                    >
                      {mode === "category" ? "Categorias" : "Subcategorias"}
                    </button>
                  ))}
                </div>
              }
            >
              <BarList
                rows={catMode === "category" ? m.byCategory : m.bySubcategory.slice(0, 10)}
                onSelect={(row) => {
                  if (catMode === "category") {
                    if (row.key !== "-") onChange({ ...filters, category: row.key, subcategory: "all" });
                  } else {
                    const [cat, sub] = row.key.split("|");
                    if (cat) onChange({ ...filters, category: cat, subcategory: sub || "all" });
                  }
                }}
              />
            </Panel>
            <Panel title="Produtos mais vendidos" subtitle="Top 10 por valor · clique para filtrar">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs text-muted-foreground">
                    <tr>
                      <th className="pb-2 font-medium">Produto</th>
                      <th className="pb-2 text-right font-medium">Qtd.</th>
                      <th className="pb-2 text-right font-medium">Pedidos</th>
                      <th className="pb-2 text-right font-medium">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {m.byProduct.map((r, idx) => (
                      <tr
                        key={r.key}
                        className="cursor-pointer border-t border-border hover:bg-secondary/60"
                        onClick={() => onChange({ ...filters, product: r.label })}
                      >
                        <td className="py-2 pr-2">
                          <span className="mr-2 inline-flex size-5 items-center justify-center rounded-full bg-secondary text-[10px] font-semibold">
                            {idx + 1}
                          </span>
                          {r.label}
                        </td>
                        <td className="py-2 text-right tabular-nums">{r.qty}</td>
                        <td className="py-2 text-right tabular-nums">{r.orders}</td>
                        <td className="py-2 text-right font-semibold tabular-nums">{formatBRL(r.value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Donut title="Formas de pagamento" rows={m.byPayment} />
            <Donut title="Canal de venda" rows={m.byChannel} />
            <Donut title="Entrega" rows={m.byDelivery} />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <Panel title="Vendas por marca" subtitle="Clique para filtrar">
              <BarList rows={m.byBrand} onSelect={(row) => row.key !== "-" && onChange({ ...filters, brand: row.key })} />
            </Panel>
            <Panel title="Melhores clientes" subtitle="Por valor comprado · clique para filtrar">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs text-muted-foreground">
                    <tr>
                      <th className="pb-2 font-medium">Cliente</th>
                      <th className="pb-2 text-right font-medium">Pedidos</th>
                      <th className="pb-2 text-right font-medium">Último</th>
                      <th className="pb-2 text-right font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {m.customers.map((c) => (
                      <tr
                        key={c.key}
                        className="cursor-pointer border-t border-border hover:bg-secondary/60"
                        onClick={() => onChange({ ...filters, customer: c.name })}
                      >
                        <td className="py-2 pr-2">
                          <p className="font-medium">{c.name}</p>
                          {c.contact && <p className="text-xs text-muted-foreground">{c.contact}</p>}
                        </td>
                        <td className="py-2 text-right tabular-nums">{c.orders}</td>
                        <td className="py-2 text-right text-xs text-muted-foreground">
                          {new Date(c.lastOrder).toLocaleDateString("pt-BR")}
                        </td>
                        <td className="py-2 text-right font-semibold tabular-nums">{formatBRL(c.value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <Panel title="Vendas por dia da semana">
              <ChartContainer config={{ value: { label: "Faturamento", color: "var(--chart-1)" } }} className="aspect-auto h-56 w-full">
                <BarChart data={m.weekdays} margin={{ top: 8 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} />
                  <YAxis hide />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value, _n, item) => (
                          <span className="font-mono">
                            {formatBRL(Number(value))} · {(item.payload as { orders: number }).orders} pedido(s)
                          </span>
                        )}
                      />
                    }
                  />
                  <Bar dataKey="value" fill="var(--color-value)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </Panel>
            <Panel title="Cidades que mais compram">
              <BarList rows={m.byCity} />
            </Panel>
            <Panel title="Status dos pedidos" subtitle="Inclui cancelados">
              <div className="space-y-2">
                {m.byStatus.map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => onChange({ ...filters, status: s.key })}
                    className="flex w-full items-center justify-between rounded-md border border-border px-3 py-2 text-sm hover:bg-secondary/60"
                  >
                    <span className="flex items-center gap-2">
                      <Badge variant={s.key === "cancelado" ? "destructive" : s.key === "pendente" ? "outline" : "secondary"}>
                        {s.label}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{s.orders} pedido(s)</span>
                    </span>
                    <span className="font-semibold tabular-nums">{formatBRL(s.value)}</span>
                  </button>
                ))}
              </div>
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}

function Panel({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold">{title}</h3>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function BarList({ rows, onSelect }: { rows: Breakdown[]; onSelect?: (row: Breakdown) => void }) {
  if (!rows.length) return <p className="text-sm text-muted-foreground">Sem dados no período.</p>;
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.key}>
          <button
            type="button"
            disabled={!onSelect}
            onClick={() => onSelect?.(r)}
            className={cn("w-full text-left", onSelect && "group")}
          >
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate group-hover:text-tech">{r.label}</span>
              <span className="shrink-0 tabular-nums">
                <span className="font-semibold">{formatBRL(r.value)}</span>
                <span className="ml-2 text-xs text-muted-foreground">
                  {r.share.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%
                </span>
              </span>
            </div>
            <div className="mt-1 h-2 rounded-full bg-secondary">
              <div className="h-2 rounded-full bg-tech transition-all" style={{ width: `${(r.value / max) * 100}%` }} />
            </div>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {r.qty} item(ns) · {r.orders} pedido(s)
            </p>
          </button>
        </li>
      ))}
    </ul>
  );
}

function Donut({ title, rows }: { title: string; rows: Breakdown[] }) {
  const config: ChartConfig = Object.fromEntries(
    rows.map((r, i) => [r.key, { label: r.label, color: chartColors[i % chartColors.length] ?? "var(--chart-1)" }]),
  );
  return (
    <Panel title={title}>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sem dados.</p>
      ) : (
        <div className="flex items-center gap-4">
          <ChartContainer config={config} className="aspect-square h-32 shrink-0">
            <PieChart>
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    hideLabel
                    nameKey="key"
                    formatter={(value, _n, item) => (
                      <span className="font-mono">
                        {(item.payload as Breakdown).label}: {formatBRL(Number(value))}
                      </span>
                    )}
                  />
                }
              />
              <Pie data={rows} dataKey="value" nameKey="key" innerRadius={34} outerRadius={56} strokeWidth={2}>
                {rows.map((r, i) => (
                  <Cell key={r.key} fill={chartColors[i % chartColors.length]} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
          <ul className="min-w-0 flex-1 space-y-1.5 text-sm">
            {rows.map((r, i) => (
              <li key={r.key} className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="size-2.5 shrink-0 rounded-full" style={{ background: chartColors[i % chartColors.length] }} />
                  <span className="truncate">{r.label}</span>
                </span>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {r.orders} · {r.share.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Panel>
  );
}

/* ============================== Pedidos ============================== */

export function OrdersSummary({ orders, itemFilter }: { orders: FilteredOrder[]; itemFilter: boolean }) {
  const k = computeKpis(orders, itemFilter);
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border border-border bg-card px-4 py-3 text-sm">
      <span>
        <strong>{orders.length}</strong> pedido(s)
      </span>
      <span>
        {itemFilter ? "Itens filtrados" : "Faturamento"}: <strong>{formatBRL(k.revenue)}</strong>
      </span>
      <span>
        Ticket médio: <strong>{formatBRL(k.avgTicket)}</strong>
      </span>
      <span>
        Pendentes: <strong>{k.pendingCount}</strong> ({formatBRL(k.pendingValue)})
      </span>
      {k.cancelledCount > 0 && <span className="text-muted-foreground">Cancelados: {k.cancelledCount}</span>}
      <Button variant="outline" size="sm" className="ml-auto" onClick={() => void exportOrdersXlsx(orders)}>
        <Download className="mr-1.5 size-4" /> Exportar planilha
      </Button>
    </div>
  );
}

export async function exportOrdersXlsx(orders: FilteredOrder[]) {
  const XLSX = await import("xlsx");
  const pedidos = orders.map((o) => ({
    Pedido: o.reference,
    Data: new Date(o.created_at).toLocaleString("pt-BR"),
    Cliente: o.customer_name,
    "E-mail": o.customer_email,
    Telefone: o.customer_phone ?? "",
    "CPF/CNPJ": o.customer_document ?? "",
    Status: statusLabels[o.status] ?? o.status,
    Pagamento: paymentLabels[o.payment_method] ?? o.payment_method,
    Canal: orderChannel(o) === "site" ? "Site" : "Televendas",
    Entrega: orderDelivery(o) === "coleta" ? "Coleta" : "Envio",
    Cidade: orderCity(o),
    Total: Number(o.total),
  }));
  const itens = orders.flatMap((o) =>
    o.matchedItems.map((i) => ({
      Pedido: o.reference,
      Data: new Date(o.created_at).toLocaleDateString("pt-BR"),
      Cliente: o.customer_name,
      Produto: i.product_name,
      Quantidade: Number(i.qty),
      "Preço unitário": Number(i.unit_price),
      Subtotal: Number(i.qty) * Number(i.unit_price),
      Status: statusLabels[o.status] ?? o.status,
    })),
  );
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(pedidos), "Pedidos");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(itens), "Itens");
  XLSX.writeFile(wb, `pedidos-sos3d-${new Date().toISOString().slice(0, 10)}.xlsx`);
}
