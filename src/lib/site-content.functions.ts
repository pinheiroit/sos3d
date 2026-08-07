import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const linkSchema = z.object({
  to: z.string().trim().min(1).max(300),
  label: z.string().trim().min(1).max(120),
});

const footerSchema = z.object({
  tagline: z.string().trim().max(600).default(""),
  phone: z.string().trim().max(80).default(""),
  email: z.string().trim().max(160).default(""),
  address: z.string().trim().max(200).default(""),
  legal: z.string().trim().max(300).default(""),
  copyright: z.string().trim().max(300).default(""),
  columns: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(80),
        links: z.array(linkSchema).max(12).default([]),
      }),
    )
    .max(6)
    .default([]),
});

const brandSchema = z.object({
  name: z.string().trim().min(1).max(120),
  logo_url: z
    .string()
    .trim()
    .max(600)
    .refine((v) => v.startsWith("/") || /^https?:\/\//.test(v), "URL inválida")
    .nullable()
    .optional(),
  website_url: z
    .string()
    .trim()
    .max(600)
    .refine((v) => /^https?:\/\//.test(v), "URL inválida")
    .nullable()
    .optional(),
  sort_order: z.number().int().min(0).max(9999).default(0),
  active: z.boolean().default(true),
});

/** Conteúdo público: dados do rodapé + marcas parceiras ativas. */
export const getSiteContent = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const [settings, brands] = await Promise.all([
    supabaseAdmin.from("site_settings").select("value").eq("key", "footer").maybeSingle(),
    supabaseAdmin
      .from("partner_brands")
      .select("id, name, logo_url, website_url")
      .eq("active", true)
      .order("sort_order", { ascending: true }),
  ]);

  if (settings.error) throw new Error(settings.error.message);
  if (brands.error) throw new Error(brands.error.message);

  return {
    footer: (settings.data?.value ?? null) as Record<string, unknown> | null,
    brands: brands.data ?? [],
  };
});

/** Marcas parceiras (todas, inclusive inativas) para o painel. */
export const adminListBrands = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdmin, adminClient } = await import("@/lib/admin-guard.server");
    await assertAdmin(context.supabase, context.userId);
    const db = await adminClient();
    const { data, error } = await db
      .from("partner_brands")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const saveFooterSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => footerSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { assertAdmin, adminClient } = await import("@/lib/admin-guard.server");
    await assertAdmin(context.supabase, context.userId);
    const db = await adminClient();
    const { error } = await db
      .from("site_settings")
      .upsert({ key: "footer", value: data, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const savePartnerBrand = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid().nullable().optional(), values: brandSchema }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { assertAdmin, adminClient } = await import("@/lib/admin-guard.server");
    await assertAdmin(context.supabase, context.userId);
    const db = await adminClient();
    const payload = {
      name: data.values.name,
      logo_url: data.values.logo_url ?? null,
      website_url: data.values.website_url ?? null,
      sort_order: data.values.sort_order,
      active: data.values.active,
      updated_at: new Date().toISOString(),
    };
    const { error } = data.id
      ? await db.from("partner_brands").update(payload).eq("id", data.id)
      : await db.from("partner_brands").insert(payload);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deletePartnerBrand = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { assertAdmin, adminClient } = await import("@/lib/admin-guard.server");
    await assertAdmin(context.supabase, context.userId);
    const db = await adminClient();
    const { error } = await db.from("partner_brands").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
