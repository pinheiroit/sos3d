import { queryOptions, useQuery } from "@tanstack/react-query";
import { getPricingRules } from "@/lib/pricing.functions";

/** Regra promocional cadastrada pelo admin. */
export type PromoRule = {
  id: string;
  label: string;
  scope: "all" | "category" | "brand" | "product";
  target: string;
  percent: number;
  active: boolean;
};

export type PricingRules = {
  pixDiscountPercent: number;
  boletoDiscountPercent: number;
  cardDiscountPercent: number;
  freeShippingFrom: number;
  flatShipping: number;
  defaultInstallments: number;
  promos: PromoRule[];
};

export const defaultPricingRules: PricingRules = {
  pixDiscountPercent: 5,
  boletoDiscountPercent: 0,
  cardDiscountPercent: 0,
  freeShippingFrom: 500,
  flatShipping: 79,
  defaultInstallments: 12,
  promos: [],
};

export function normalizeRules(value: unknown): PricingRules {
  const v = (value ?? {}) as Partial<PricingRules>;
  const num = (n: unknown, fallback: number) =>
    typeof n === "number" && Number.isFinite(n) ? n : fallback;
  return {
    pixDiscountPercent: num(v.pixDiscountPercent, defaultPricingRules.pixDiscountPercent),
    boletoDiscountPercent: num(v.boletoDiscountPercent, 0),
    cardDiscountPercent: num(v.cardDiscountPercent, 0),
    freeShippingFrom: num(v.freeShippingFrom, defaultPricingRules.freeShippingFrom),
    flatShipping: num(v.flatShipping, defaultPricingRules.flatShipping),
    defaultInstallments: num(v.defaultInstallments, 12),
    promos: Array.isArray(v.promos) ? (v.promos as PromoRule[]) : [],
  };
}

export function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/** Maior desconto promocional aplicável ao produto (%). */
export function promoPercentFor(
  product: { slug: string; category: string; brand: string },
  rules: PricingRules,
) {
  const matches = rules.promos.filter((p) => {
    if (!p.active || !(p.percent > 0)) return false;
    const target = (p.target ?? "").trim().toLowerCase();
    if (p.scope === "all") return true;
    if (p.scope === "category") return product.category.toLowerCase() === target;
    if (p.scope === "brand") return product.brand.toLowerCase() === target;
    return product.slug.toLowerCase() === target;
  });
  if (!matches.length) return 0;
  return Math.min(90, Math.max(...matches.map((m) => m.percent)));
}

/** Preço final do produto após regras promocionais. */
export function effectivePrice(
  product: { slug: string; category: string; brand: string; price: number },
  rules: PricingRules,
) {
  const pct = promoPercentFor(product, rules);
  return pct > 0 ? round2(product.price * (1 - pct / 100)) : product.price;
}

export function paymentDiscountPercent(method: string, rules: PricingRules) {
  if (method === "pix") return rules.pixDiscountPercent;
  if (method === "boleto") return rules.boletoDiscountPercent;
  return rules.cardDiscountPercent;
}

export function shippingFor(subtotal: number, rules: PricingRules) {
  if (subtotal <= 0) return 0;
  return subtotal < rules.freeShippingFrom ? rules.flatShipping : 0;
}

export const pricingQueryOptions = queryOptions({
  queryKey: ["pricing-rules"],
  queryFn: () => getPricingRules(),
  staleTime: 60_000,
});

export function usePricing(): PricingRules {
  const { data } = useQuery(pricingQueryOptions);
  return normalizeRules(data);
}
