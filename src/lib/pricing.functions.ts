import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const promoSchema = z.object({
  id: z.string().trim().min(1).max(60),
  label: z.string().trim().min(1).max(120),
  scope: z.enum(["all", "category", "brand", "product"]),
  target: z.string().trim().max(160).default(""),
  percent: z.number().min(0).max(90),
  active: z.boolean().default(true),
});

const rulesSchema = z.object({
  pixDiscountPercent: z.number().min(0).max(90).default(5),
  boletoDiscountPercent: z.number().min(0).max(90).default(0),
  cardDiscountPercent: z.number().min(0).max(90).default(0),
  freeShippingFrom: z.number().min(0).max(1_000_000).default(500),
  flatShipping: z.number().min(0).max(100_000).default(79),
  defaultInstallments: z.number().int().min(1).max(48).default(12),
  promos: z.array(promoSchema).max(50).default([]),
});

/** Regras de negócio públicas (descontos, frete, parcelamento padrão). */
export const getPricingRules = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("site_settings")
    .select("value")
    .eq("key", "pricing")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return { value: (data?.value ?? null) as Record<string, unknown> | null };
});

export const savePricingRules = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => rulesSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { assertAdmin, adminClient } = await import("@/lib/admin-guard.server");
    await assertAdmin(context.supabase, context.userId);
    const db = await adminClient();
    const { error } = await db
      .from("site_settings")
      .upsert({ key: "pricing", value: data, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
