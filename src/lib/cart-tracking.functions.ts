import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const short = (max: number) => z.string().trim().max(max).optional().default("");

const trackSchema = z.object({
  id: z.string().uuid(),
  items: z
    .array(z.object({ slug: z.string().trim().min(1).max(120), qty: z.number().int().min(1).max(999) }))
    .max(50),
  contact: z
    .object({ name: short(120), email: short(180), phone: short(40) })
    .optional(),
  visit: z
    .object({
      entryPage: short(300),
      referrer: short(300),
      utmSource: short(120),
      utmMedium: short(120),
      utmCampaign: short(160),
    })
    .optional(),
  lastPage: short(300),
  device: z.enum(["mobile", "desktop", ""]).optional().default(""),
  reachedCheckout: z.boolean().optional().default(false),
});

/**
 * Registra o carrinho do visitante (público: anônimos também têm carrinho).
 * Preços e nomes vêm do banco, nunca do navegador.
 */
export const trackCart = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => trackSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { resolveOptionalUserId } = await import("@/lib/orders.server");
    const userId = await resolveOptionalUserId(getRequestHeader("authorization"));

    const { data: existing } = await supabaseAdmin
      .from("cart_sessions")
      .select("id, status, user_id, customer_name, customer_email, customer_phone, reached_checkout")
      .eq("id", data.id)
      .maybeSingle();

    if (existing?.status === "convertido") return { converted: true };
    if (!existing && data.items.length === 0) return { converted: false };

    const slugs = data.items.map((i) => i.slug);
    const { data: products } = slugs.length
      ? await supabaseAdmin.from("products").select("slug, name, brand, price").in("slug", slugs)
      : { data: [] as { slug: string; name: string; brand: string; price: number }[] };

    const items = data.items
      .map((i) => {
        const p = (products ?? []).find((r) => r.slug === i.slug);
        return p
          ? { slug: p.slug, name: p.name, brand: p.brand, qty: i.qty, price: Number(p.price) }
          : null;
      })
      .filter((i): i is NonNullable<typeof i> => i !== null);

    const itemCount = items.reduce((s, i) => s + i.qty, 0);
    const subtotal = Math.round(items.reduce((s, i) => s + i.qty * i.price, 0) * 100) / 100;

    let name = data.contact?.name || existing?.customer_name || "";
    let email = data.contact?.email || existing?.customer_email || "";
    let phone = data.contact?.phone || existing?.customer_phone || "";
    const ownerId = userId ?? existing?.user_id ?? null;
    if (ownerId && (!name || !email || !phone)) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("full_name, email, phone")
        .eq("id", ownerId)
        .maybeSingle();
      name ||= profile?.full_name ?? "";
      email ||= profile?.email ?? "";
      phone ||= profile?.phone ?? "";
    }

    const common = {
      user_id: ownerId,
      customer_name: name,
      customer_email: email,
      customer_phone: phone,
      items,
      item_count: itemCount,
      subtotal,
      last_page: data.lastPage,
      reached_checkout: Boolean(existing?.reached_checkout) || data.reachedCheckout,
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      const { error } = await supabaseAdmin.from("cart_sessions").update(common).eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin.from("cart_sessions").insert({
        id: data.id,
        ...common,
        entry_page: data.visit?.entryPage ?? "",
        referrer: data.visit?.referrer ?? "",
        utm_source: data.visit?.utmSource ?? "",
        utm_medium: data.visit?.utmMedium ?? "",
        utm_campaign: data.visit?.utmCampaign ?? "",
        device: data.device,
      });
      if (error) throw new Error(error.message);
    }
    return { converted: false };
  });

/** Lista carrinhos (abertos e convertidos) para o painel. */
export const listCartSessions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ days: z.number().int().min(1).max(365).default(30) }).parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { assertAdmin, adminClient } = await import("@/lib/admin-guard.server");
    await assertAdmin(context.supabase, context.userId);
    const db = await adminClient();
    const since = new Date(Date.now() - data.days * 24 * 60 * 60 * 1000).toISOString();
    const { data: rows, error } = await db
      .from("cart_sessions")
      .select("*")
      .gte("updated_at", since)
      .gt("item_count", 0)
      .order("updated_at", { ascending: false })
      .limit(1000);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

/** Marca (ou desmarca) que a equipe já entrou em contato com o cliente. */
export const markCartContacted = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), contacted: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { assertAdmin, adminClient } = await import("@/lib/admin-guard.server");
    await assertAdmin(context.supabase, context.userId);
    const db = await adminClient();
    const { error } = await db
      .from("cart_sessions")
      .update({ contacted_at: data.contacted ? new Date().toISOString() : null })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
