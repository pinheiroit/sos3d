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

/** Taxa da maquininha/gateway por número de parcelas. */
export type InstallmentFee = { months: number; percent: number };

export type PricingRules = {
  pixDiscountPercent: number;
  boletoDiscountPercent: number;
  cardDiscountPercent: number;
  freeShippingFrom: number;
  flatShipping: number;
  defaultInstallments: number;
  promos: PromoRule[];
  installmentFees: InstallmentFee[];
};

export const defaultInstallmentFees: InstallmentFee[] = [
  { months: 1, percent: 4.2 },
  { months: 2, percent: 6.09 },
  { months: 3, percent: 7.01 },
  { months: 4, percent: 7.91 },
  { months: 5, percent: 8.8 },
  { months: 6, percent: 9.67 },
  { months: 7, percent: 12.59 },
  { months: 8, percent: 13.42 },
  { months: 9, percent: 14.25 },
  { months: 10, percent: 15.06 },
  { months: 11, percent: 15.87 },
  { months: 12, percent: 16.66 },
];

export const defaultPricingRules: PricingRules = {
  pixDiscountPercent: 0,
  boletoDiscountPercent: 0,
  cardDiscountPercent: 0,
  freeShippingFrom: 500,
  flatShipping: 79,
  defaultInstallments: 12,
  promos: [],
  installmentFees: defaultInstallmentFees,
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
    installmentFees: normalizeFees(v.installmentFees),
  };
}

export function normalizeFees(value: unknown): InstallmentFee[] {
  if (!Array.isArray(value)) return defaultInstallmentFees;
  const list = value
    .map((f) => ({
      months: Math.round(Number((f as InstallmentFee)?.months) || 0),
      percent: Number((f as InstallmentFee)?.percent) || 0,
    }))
    .filter((f) => f.months >= 1 && f.months <= 48 && f.percent >= 0)
    .sort((a, b) => a.months - b.months);
  return list.length ? list : defaultInstallmentFees;
}

export function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/** Taxa (%) para o número de parcelas escolhido. */
export function feePercentFor(months: number, rules: PricingRules) {
  const fees = normalizeFees(rules.installmentFees);
  const exact = fees.find((f) => f.months === months);
  if (exact) return exact.percent;
  const lower = fees.filter((f) => f.months <= months).pop();
  return lower?.percent ?? 0;
}

export type Quote = { months: number; installment: number; total: number };

/** Preço final no cartão para um produto, considerando tabela própria ou as taxas globais. */
export function quoteFor(
  product: { price: number; installments?: { months: number; installment: number; total: number }[] | null },
  months: number,
  rules: PricingRules,
): Quote {
  const own = (product.installments ?? []).filter((p) => p && p.total > 0);
  if (own.length) {
    const exact = own.find((p) => p.months === months);
    const lower = own.filter((p) => p.months <= months).sort((a, b) => a.months - b.months).pop();
    const plan = exact ?? lower ?? [...own].sort((a, b) => a.months - b.months)[0]!;
    return { months: plan.months, installment: round2(plan.installment), total: round2(plan.total) };
  }
  const total = round2(product.price * (1 + feePercentFor(months, rules) / 100));
  return { months, installment: round2(total / months), total };
}

/** Todas as opções de parcelamento disponíveis para um produto. */
export function quotesFor(
  product: { price: number; installments?: { months: number; installment: number; total: number }[] | null },
  rules: PricingRules,
): Quote[] {
  const own = (product.installments ?? []).filter((p) => p && p.total > 0);
  if (own.length) {
    return [...own]
      .sort((a, b) => a.months - b.months)
      .map((p) => ({ months: p.months, installment: round2(p.installment), total: round2(p.total) }));
  }
  return normalizeFees(rules.installmentFees).map((f) => quoteFor(product, f.months, rules));
}

/** Parcelamento máximo disponível (usado nas vitrines). */
export function maxQuote(
  product: { price: number; installments?: { months: number; installment: number; total: number }[] | null },
  rules: PricingRules,
): Quote | null {
  const list = quotesFor(product, rules);
  return list.length ? list[list.length - 1]! : null;
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
