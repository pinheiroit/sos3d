import { describe, expect, it } from "vitest";
import {
  computeKpis,
  defaultSalesFilters,
  filterOrders,
  itemBreakdown,
  resolveRange,
  type ProductInfo,
  type SalesOrder,
} from "./sales-analytics";

const products: ProductInfo[] = [
  { id: "p1", slug: "pla-preto", name: "PLA Preto", brand: "Voolt3D", category: "filamentos", subcategory: "pla" },
  { id: "p2", slug: "a1-mini", name: "A1 Mini", brand: "Bambu Lab", category: "impressoras", subcategory: "" },
];

const order = (o: Partial<SalesOrder>): SalesOrder => ({
  id: Math.random().toString(36),
  reference: "SOS-1",
  created_at: "2026-10-20T15:00:00",
  status: "concluido",
  payment_method: "pix",
  total: 0,
  customer_name: "Cliente",
  customer_email: "c@x.com",
  customer_phone: null,
  customer_document: null,
  user_id: null,
  notes: null,
  shipping_address: {},
  order_items: [],
  ...o,
});

const orders = [
  order({
    total: 2100,
    customer_name: "Maria",
    order_items: [
      { id: "i1", product_id: "p1", product_slug: "pla-preto", product_name: "PLA Preto", qty: 2, unit_price: 50 },
      { id: "i2", product_id: "p2", product_slug: "a1-mini", product_name: "A1 Mini", qty: 1, unit_price: 2000 },
    ],
  }),
  order({
    total: 90,
    status: "cancelado",
    order_items: [{ id: "i3", product_id: "p1", product_slug: "pla-preto", product_name: "PLA Preto", qty: 1, unit_price: 90 }],
  }),
  order({
    total: 300,
    created_at: "2026-09-01T10:00:00",
    notes: "Televendas",
    customer_name: "João",
    order_items: [{ id: "i4", product_id: "p1", product_slug: "pla-preto", product_name: "PLA Preto", qty: 3, unit_price: 100 }],
  }),
];

const now = new Date("2026-10-27T12:00:00");

describe("vendas do painel", () => {
  it("faturamento não conta pedidos cancelados", () => {
    const f = { ...defaultSalesFilters, period: "all" as const };
    const kpis = computeKpis(filterOrders(orders, products, f), false);
    expect(kpis.revenue).toBe(2400);
    expect(kpis.orders).toBe(2);
    expect(kpis.cancelledCount).toBe(1);
  });

  it("últimos 7 dias inclui hoje e os 6 dias anteriores", () => {
    const r = resolveRange({ period: "7d", from: "", to: "" }, now);
    expect(r.start).toEqual(new Date(2026, 9, 21));
    expect(r.end).toEqual(new Date(2026, 9, 28));
  });

  it("filtro por período deixa de fora pedidos de fora do intervalo", () => {
    const f = { ...defaultSalesFilters, period: "custom" as const, from: "2026-10-01", to: "2026-10-31" };
    expect(filterOrders(orders, products, f).length).toBe(2);
  });

  it("filtro por categoria soma só os itens da categoria", () => {
    const f = { ...defaultSalesFilters, period: "all" as const, category: "filamentos" };
    const kpis = computeKpis(filterOrders(orders, products, f), true);
    expect(kpis.revenue).toBe(400);
  });

  it("filtro por cliente e canal televendas", () => {
    const byName = { ...defaultSalesFilters, period: "all" as const, customer: "maria" };
    expect(filterOrders(orders, products, byName).map((o) => o.customer_name)).toEqual(["Maria"]);
    const tele = { ...defaultSalesFilters, period: "all" as const, channel: "televendas" as const };
    expect(filterOrders(orders, products, tele).map((o) => o.customer_name)).toEqual(["João"]);
  });

  it("vendas por categoria agrupam o valor dos itens", () => {
    const f = { ...defaultSalesFilters, period: "all" as const };
    const rows = itemBreakdown(filterOrders(orders, products, f), products, (_i, p) => ({
      key: p?.category ?? "-",
      label: p?.category ?? "-",
    }));
    expect(rows.map((r) => [r.key, r.value])).toEqual([
      ["impressoras", 2000],
      ["filamentos", 400],
    ]);
  });
});
