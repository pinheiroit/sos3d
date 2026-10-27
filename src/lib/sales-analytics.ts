/**
 * Filtros e indicadores de vendas do painel (visão geral e pedidos).
 * Funções puras: recebem pedidos já carregados e devolvem recortes/agregações.
 */

export type SalesOrderItem = {
  id: string;
  product_id: string | null;
  product_slug: string;
  product_name: string;
  qty: number;
  unit_price: number;
};

export type SalesOrder = {
  id: string;
  reference: string;
  created_at: string;
  status: string;
  payment_method: string;
  total: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  customer_document: string | null;
  user_id: string | null;
  notes: string | null;
  shipping_address: unknown;
  order_items: SalesOrderItem[];
};

export type ProductInfo = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  category: string;
  subcategory: string;
};

export type PeriodPreset =
  | "today"
  | "7d"
  | "30d"
  | "month"
  | "last_month"
  | "90d"
  | "year"
  | "all"
  | "custom";

export const periodLabels: Record<PeriodPreset, string> = {
  today: "Hoje",
  "7d": "Últimos 7 dias",
  "30d": "Últimos 30 dias",
  month: "Este mês",
  last_month: "Mês passado",
  "90d": "Últimos 90 dias",
  year: "Este ano",
  all: "Todo o período",
  custom: "Personalizado",
};

export type SalesFilters = {
  period: PeriodPreset;
  /** YYYY-MM-DD, usados quando period = custom. */
  from: string;
  to: string;
  customer: string;
  product: string;
  category: string;
  subcategory: string;
  brand: string;
  status: string;
  payment: string;
  channel: "all" | "site" | "televendas";
  delivery: "all" | "coleta" | "envio";
};

export const defaultSalesFilters: SalesFilters = {
  period: "30d",
  from: "",
  to: "",
  customer: "",
  product: "",
  category: "all",
  subcategory: "all",
  brand: "all",
  status: "all",
  payment: "all",
  channel: "all",
  delivery: "all",
};

export const paymentLabels: Record<string, string> = {
  pix: "Pix",
  cartao: "Cartão",
  boleto: "Boleto",
  dinheiro: "Dinheiro",
};

export const statusLabels: Record<string, string> = {
  pendente: "Pendente",
  pago: "Pago",
  em_producao: "Em produção",
  enviado: "Enviado",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

const DAY = 86_400_000;

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

function parseDate(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

export type DateRange = { start: Date | null; end: Date | null };

/** Intervalo [start, end) do período escolhido, no fuso do navegador. */
export function resolveRange(filters: Pick<SalesFilters, "period" | "from" | "to">, now = new Date()): DateRange {
  const today = startOfDay(now);
  switch (filters.period) {
    case "today":
      return { start: today, end: addDays(today, 1) };
    case "7d":
      return { start: addDays(today, -6), end: addDays(today, 1) };
    case "30d":
      return { start: addDays(today, -29), end: addDays(today, 1) };
    case "90d":
      return { start: addDays(today, -89), end: addDays(today, 1) };
    case "month":
      return {
        start: new Date(today.getFullYear(), today.getMonth(), 1),
        end: new Date(today.getFullYear(), today.getMonth() + 1, 1),
      };
    case "last_month":
      return {
        start: new Date(today.getFullYear(), today.getMonth() - 1, 1),
        end: new Date(today.getFullYear(), today.getMonth(), 1),
      };
    case "year":
      return {
        start: new Date(today.getFullYear(), 0, 1),
        end: new Date(today.getFullYear() + 1, 0, 1),
      };
    case "custom": {
      const from = parseDate(filters.from);
      const to = parseDate(filters.to);
      return { start: from, end: to ? addDays(to, 1) : null };
    }
    default:
      return { start: null, end: null };
  }
}

/** Período anterior de mesmo tamanho (até "agora"), para comparar resultados. */
export function previousRange(range: DateRange, now = new Date()): DateRange | null {
  if (!range.start || !range.end) return null;
  const end = range.end.getTime() > now.getTime() ? now : range.end;
  const length = end.getTime() - range.start.getTime();
  if (length <= 0) return null;
  return { start: new Date(range.start.getTime() - length), end: range.start };
}

export function orderChannel(o: Pick<SalesOrder, "notes">): "site" | "televendas" {
  return (o.notes ?? "").trim().toLowerCase().startsWith("televendas") ? "televendas" : "site";
}

export function orderDelivery(o: Pick<SalesOrder, "notes" | "shipping_address">): "coleta" | "envio" {
  const addr = (o.shipping_address ?? {}) as Record<string, unknown>;
  if (addr["fulfillment"] === "coleta") return "coleta";
  return /coleta/i.test(o.notes ?? "") ? "coleta" : "envio";
}

export function orderCity(o: Pick<SalesOrder, "shipping_address">): string {
  const addr = (o.shipping_address ?? {}) as Record<string, unknown>;
  const city = String(addr["city"] ?? "").trim();
  const state = String(addr["state"] ?? "").trim().toUpperCase();
  if (!city) return "Não informado";
  const pretty = city.toLowerCase().replace(/(^|\s)\p{L}/gu, (c) => c.toUpperCase());
  return state ? `${pretty}/${state}` : pretty;
}

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

export const customerKey = (o: Pick<SalesOrder, "customer_email" | "customer_document" | "customer_name">) => {
  const doc = (o.customer_document ?? "").replace(/\D/g, "");
  if (doc) return `doc:${doc}`;
  const email = norm(o.customer_email);
  if (email && email !== "televendas@sos3d.com.br") return `mail:${email}`;
  return `name:${norm(o.customer_name)}`;
};

export function makeProductLookup(products: ProductInfo[]) {
  const byId = new Map(products.map((p) => [p.id, p]));
  const bySlug = new Map(products.map((p) => [p.slug, p]));
  return (item: Pick<SalesOrderItem, "product_id" | "product_slug">) =>
    (item.product_id ? byId.get(item.product_id) : undefined) ?? bySlug.get(item.product_slug);
}

export const hasItemFilter = (f: SalesFilters) =>
  f.category !== "all" || f.subcategory !== "all" || f.brand !== "all" || f.product.trim() !== "";

function itemMatches(
  item: SalesOrderItem,
  product: ProductInfo | undefined,
  f: SalesFilters,
): boolean {
  if (f.category !== "all" && product?.category !== f.category) return false;
  if (f.subcategory !== "all" && product?.subcategory !== f.subcategory) return false;
  if (f.brand !== "all" && product?.brand !== f.brand) return false;
  const q = norm(f.product);
  if (q && !norm(`${item.product_name} ${product?.brand ?? ""}`).includes(q)) return false;
  return true;
}

function orderMatchesBase(o: SalesOrder, f: SalesFilters, range: DateRange): boolean {
  const t = new Date(o.created_at).getTime();
  if (range.start && t < range.start.getTime()) return false;
  if (range.end && t >= range.end.getTime()) return false;
  if (f.status !== "all" && o.status !== f.status) return false;
  if (f.payment !== "all" && o.payment_method !== f.payment) return false;
  if (f.channel !== "all" && orderChannel(o) !== f.channel) return false;
  if (f.delivery !== "all" && orderDelivery(o) !== f.delivery) return false;
  const q = norm(f.customer);
  if (q) {
    const digits = q.replace(/\D/g, "");
    const hay = norm(`${o.customer_name} ${o.customer_email} ${o.reference}`);
    const hayDigits = `${o.customer_document ?? ""} ${o.customer_phone ?? ""}`.replace(/\D/g, "");
    if (!hay.includes(q) && !(digits.length >= 3 && hayDigits.includes(digits))) return false;
  }
  return true;
}

export type FilteredOrder = SalesOrder & {
  /** Itens que atendem aos filtros de categoria/marca/produto. */
  matchedItems: SalesOrderItem[];
};

/** Pedidos que atendem aos filtros; com filtro de item, só pedidos com algum item compatível. */
export function filterOrders(
  orders: SalesOrder[],
  products: ProductInfo[],
  f: SalesFilters,
  range: DateRange = resolveRange(f),
): FilteredOrder[] {
  const lookup = makeProductLookup(products);
  const itemFilter = hasItemFilter(f);
  const out: FilteredOrder[] = [];
  for (const o of orders) {
    if (!orderMatchesBase(o, f, range)) continue;
    const matchedItems = itemFilter
      ? o.order_items.filter((i) => itemMatches(i, lookup(i), f))
      : o.order_items;
    if (itemFilter && matchedItems.length === 0) continue;
    out.push({ ...o, matchedItems });
  }
  return out;
}

export const isRevenue = (o: Pick<SalesOrder, "status">) => o.status !== "cancelado";
const itemValue = (i: SalesOrderItem) => Number(i.qty) * Number(i.unit_price);

export type SalesKpis = {
  revenue: number;
  orders: number;
  avgTicket: number;
  itemsSold: number;
  customers: number;
  pendingCount: number;
  pendingValue: number;
  cancelledCount: number;
  cancelledValue: number;
};

/**
 * Faturamento ignora cancelados. Com filtro de categoria/marca/produto,
 * considera só o valor dos itens filtrados (sem frete/desconto do pedido).
 */
export function computeKpis(orders: FilteredOrder[], itemFilter: boolean): SalesKpis {
  const valid = orders.filter(isRevenue);
  const valueOf = (o: FilteredOrder) =>
    itemFilter ? o.matchedItems.reduce((s, i) => s + itemValue(i), 0) : Number(o.total);
  const revenue = valid.reduce((s, o) => s + valueOf(o), 0);
  const pending = orders.filter((o) => o.status === "pendente");
  const cancelled = orders.filter((o) => o.status === "cancelado");
  return {
    revenue,
    orders: valid.length,
    avgTicket: valid.length ? revenue / valid.length : 0,
    itemsSold: valid.reduce((s, o) => s + o.matchedItems.reduce((n, i) => n + Number(i.qty), 0), 0),
    customers: new Set(valid.map(customerKey)).size,
    pendingCount: pending.length,
    pendingValue: pending.reduce((s, o) => s + valueOf(o), 0),
    cancelledCount: cancelled.length,
    cancelledValue: cancelled.reduce((s, o) => s + valueOf(o), 0),
  };
}

export function percentChange(current: number, previous: number): number | null {
  if (!previous) return null;
  return ((current - previous) / previous) * 100;
}

export type TimelinePoint = { key: string; label: string; revenue: number; orders: number };

const pad = (n: number) => String(n).padStart(2, "0");
const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const monthKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
const monthNames = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** Série temporal: por dia até ~2 meses, senão por mês. Preenche dias/meses sem venda. */
export function timeline(
  orders: FilteredOrder[],
  range: DateRange,
  itemFilter: boolean,
  now = new Date(),
): TimelinePoint[] {
  const valid = orders.filter(isRevenue);
  const times = valid.map((o) => new Date(o.created_at).getTime());
  const start = range.start ?? (times.length ? startOfDay(new Date(Math.min(...times))) : startOfDay(now));
  const rawEnd = range.end ?? addDays(startOfDay(now), 1);
  const end = rawEnd.getTime() > addDays(startOfDay(now), 1).getTime() ? addDays(startOfDay(now), 1) : rawEnd;
  const byMonth = end.getTime() - start.getTime() > 62 * DAY;
  const points = new Map<string, TimelinePoint>();
  if (byMonth) {
    for (let d = new Date(start.getFullYear(), start.getMonth(), 1); d < end; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) {
      points.set(monthKey(d), { key: monthKey(d), label: `${monthNames[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`, revenue: 0, orders: 0 });
    }
  } else {
    for (let d = new Date(start); d < end; d = addDays(d, 1)) {
      points.set(dayKey(d), { key: dayKey(d), label: `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`, revenue: 0, orders: 0 });
    }
  }
  for (const o of valid) {
    const d = new Date(o.created_at);
    const p = points.get(byMonth ? monthKey(d) : dayKey(d));
    if (!p) continue;
    p.orders += 1;
    p.revenue += itemFilter ? o.matchedItems.reduce((s, i) => s + itemValue(i), 0) : Number(o.total);
  }
  return [...points.values()];
}

export type Breakdown = { key: string; label: string; value: number; qty: number; orders: number; share: number };

function finish(map: Map<string, Omit<Breakdown, "share">>, limit?: number): Breakdown[] {
  const rows = [...map.values()].sort((a, b) => b.value - a.value || b.qty - a.qty);
  const total = rows.reduce((s, r) => s + r.value, 0);
  const withShare = rows.map((r) => ({ ...r, share: total ? (r.value / total) * 100 : 0 }));
  return limit ? withShare.slice(0, limit) : withShare;
}

/** Agrupa os itens vendidos (pedidos não cancelados) por uma chave do produto. */
export function itemBreakdown(
  orders: FilteredOrder[],
  products: ProductInfo[],
  keyOf: (item: SalesOrderItem, product: ProductInfo | undefined) => { key: string; label: string },
  limit?: number,
): Breakdown[] {
  const lookup = makeProductLookup(products);
  const map = new Map<string, Omit<Breakdown, "share"> & { seen: Set<string> }>();
  for (const o of orders.filter(isRevenue)) {
    for (const i of o.matchedItems) {
      const { key, label } = keyOf(i, lookup(i));
      const row = map.get(key) ?? { key, label, value: 0, qty: 0, orders: 0, seen: new Set<string>() };
      row.value += itemValue(i);
      row.qty += Number(i.qty);
      if (!row.seen.has(o.id)) {
        row.seen.add(o.id);
        row.orders += 1;
      }
      map.set(key, row);
    }
  }
  const clean = new Map([...map].map(([k, { seen: _seen, ...r }]) => [k, r]));
  return finish(clean, limit);
}

/** Agrupa pedidos por um atributo do pedido. */
export function orderBreakdown(
  orders: FilteredOrder[],
  keyOf: (o: FilteredOrder) => { key: string; label: string },
  opts: { includeCancelled?: boolean; itemFilter?: boolean; limit?: number } = {},
): Breakdown[] {
  const map = new Map<string, Omit<Breakdown, "share">>();
  for (const o of opts.includeCancelled ? orders : orders.filter(isRevenue)) {
    const { key, label } = keyOf(o);
    const row = map.get(key) ?? { key, label, value: 0, qty: 0, orders: 0 };
    row.value += opts.itemFilter ? o.matchedItems.reduce((s, i) => s + itemValue(i), 0) : Number(o.total);
    row.qty += o.matchedItems.reduce((s, i) => s + Number(i.qty), 0);
    row.orders += 1;
    map.set(key, row);
  }
  return finish(map, opts.limit);
}

export type CustomerRank = {
  key: string;
  name: string;
  contact: string;
  orders: number;
  value: number;
  lastOrder: string;
};

export function topCustomers(orders: FilteredOrder[], itemFilter: boolean, limit = 10): CustomerRank[] {
  const map = new Map<string, CustomerRank>();
  for (const o of orders.filter(isRevenue)) {
    const key = customerKey(o);
    const row =
      map.get(key) ??
      {
        key,
        name: o.customer_name,
        contact: o.customer_phone || (o.customer_email === "televendas@sos3d.com.br" ? "" : o.customer_email),
        orders: 0,
        value: 0,
        lastOrder: o.created_at,
      };
    row.orders += 1;
    row.value += itemFilter ? o.matchedItems.reduce((s, i) => s + itemValue(i), 0) : Number(o.total);
    if (o.created_at > row.lastOrder) row.lastOrder = o.created_at;
    map.set(key, row);
  }
  return [...map.values()].sort((a, b) => b.value - a.value).slice(0, limit);
}

const weekdays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function weekdayBreakdown(orders: FilteredOrder[], itemFilter: boolean) {
  const rows = weekdays.map((label, idx) => ({ key: String(idx), label, value: 0, orders: 0 }));
  for (const o of orders.filter(isRevenue)) {
    const row = rows[new Date(o.created_at).getDay()]!;
    row.orders += 1;
    row.value += itemFilter ? o.matchedItems.reduce((s, i) => s + itemValue(i), 0) : Number(o.total);
  }
  return rows;
}
