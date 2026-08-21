import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const specSchema = z.object({ label: z.string().max(120), value: z.string().max(400) });

const productSchema = z.object({
  slug: z.string().trim().min(2).max(120).regex(/^[a-z0-9-]+$/),
  name: z.string().trim().min(2).max(180),
  brand: z.string().trim().min(1).max(80),
  category: z
    .string()
    .trim()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/, "Categoria inválida"),
  subtitle: z.string().trim().max(300).default(""),
  description: z.string().trim().max(4000).default(""),
  price: z.number().min(0).max(10_000_000),
  old_price: z.number().min(0).max(10_000_000).nullable().optional(),
  image_key: z.string().trim().max(60).default("printer-1"),
  image_url: z
    .string()
    .trim()
    .max(600)
    .refine((v) => v.startsWith("/") || /^https?:\/\//.test(v), "URL inválida")
    .nullable()
    .optional(),
  badge: z.string().trim().max(40).nullable().optional(),
  stock: z.number().int().min(0).max(1_000_000),
  active: z.boolean().default(true),
  use_cases: z.array(z.string().trim().max(60)).max(12).default([]),
  specs: z.array(specSchema).max(30).default([]),
});

export const adminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdmin, adminClient } = await import("@/lib/admin-guard.server");
    await assertAdmin(context.supabase, context.userId);
    const db = await adminClient();

    const [products, orders, memberships, profiles, courses] = await Promise.all([
      db.from("products").select("*").order("created_at", { ascending: true }),
      db.from("orders").select("*, order_items(*)").order("created_at", { ascending: false }).limit(200),
      db.from("memberships").select("*").order("granted_at", { ascending: false }),
      db.from("profiles").select("*").order("created_at", { ascending: false }).limit(500),
      db.from("courses").select("*, lessons(*)").order("sort_order", { ascending: true }),
    ]);

    const firstError =
      products.error ?? orders.error ?? memberships.error ?? profiles.error ?? courses.error;
    if (firstError) throw new Error(firstError.message);

    return {
      products: products.data ?? [],
      orders: orders.data ?? [],
      memberships: memberships.data ?? [],
      profiles: profiles.data ?? [],
      courses: courses.data ?? [],
    };
  });

export const saveProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid().nullable().optional(), values: productSchema }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { assertAdmin, adminClient } = await import("@/lib/admin-guard.server");
    await assertAdmin(context.supabase, context.userId);
    const db = await adminClient();

    const v = data.values;
    const payload = {
      slug: v.slug,
      name: v.name,
      brand: v.brand,
      category: v.category,
      subtitle: v.subtitle,
      description: v.description,
      price: v.price,
      old_price: v.old_price ?? null,
      image_key: v.image_key,
      image_url: v.image_url ?? null,
      badge: v.badge ?? null,
      stock: v.stock,
      active: v.active,
      use_cases: v.use_cases,
      specs: v.specs,
      updated_at: new Date().toISOString(),
    };
    const query = data.id
      ? db.from("products").update(payload).eq("id", data.id)
      : db.from("products").insert(payload);
    const { error } = await query;
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { assertAdmin, adminClient } = await import("@/lib/admin-guard.server");
    await assertAdmin(context.supabase, context.userId);
    const db = await adminClient();
    const { error } = await db.from("products").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const quickUpdateProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        price: z.number().min(0).max(10_000_000).optional(),
        stock: z.number().int().min(0).max(1_000_000).optional(),
        active: z.boolean().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { assertAdmin, adminClient } = await import("@/lib/admin-guard.server");
    await assertAdmin(context.supabase, context.userId);
    const db = await adminClient();
    const current = await db.from("products").select("price, stock, active").eq("id", data.id).single();
    if (current.error) throw new Error(current.error.message);
    const { error } = await db
      .from("products")
      .update({
        price: data.price ?? current.data.price,
        stock: data.stock ?? current.data.stock,
        active: data.active ?? current.data.active,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["pendente", "pago", "em_producao", "enviado", "concluido", "cancelado"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { assertAdmin, adminClient } = await import("@/lib/admin-guard.server");
    await assertAdmin(context.supabase, context.userId);
    const db = await adminClient();
    const { error } = await db
      .from("orders")
      .update({ status: data.status, updated_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setMembership = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        userId: z.string().uuid(),
        active: z.boolean(),
        printerModel: z.string().trim().max(120).nullable().optional(),
        notes: z.string().trim().max(600).nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { assertAdmin, adminClient } = await import("@/lib/admin-guard.server");
    await assertAdmin(context.supabase, context.userId);
    const db = await adminClient();

    const { error } = await db.from("memberships").upsert(
      {
        user_id: data.userId,
        active: data.active,
        printer_model: data.printerModel ?? null,
        notes: data.notes ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const importRowSchema = productSchema.partial({
  brand: true,
  subtitle: true,
  description: true,
  image_key: true,
  stock: true,
  active: true,
  use_cases: true,
  specs: true,
});

/** Importa/atualiza produtos em massa (chave: slug). */
export const importProducts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ rows: z.array(importRowSchema).min(1).max(500) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { assertAdmin, adminClient } = await import("@/lib/admin-guard.server");
    await assertAdmin(context.supabase, context.userId);
    const db = await adminClient();

    const existing = await db.from("products").select("id, slug");
    if (existing.error) throw new Error(existing.error.message);
    const bySlug = new Map((existing.data ?? []).map((p) => [p.slug, p.id]));

    const now = new Date().toISOString();
    const errors: string[] = [];
    let created = 0;
    let updated = 0;

    const payload = data.rows.map((row) => {
      if (bySlug.has(row.slug)) updated += 1;
      else created += 1;
      return {
        slug: row.slug,
        name: row.name,
        brand: row.brand ?? "SOS.3D",
        category: row.category,
        subtitle: row.subtitle ?? "",
        description: row.description ?? "",
        price: row.price,
        old_price: row.old_price ?? null,
        image_key: row.image_key ?? "printer-1",
        image_url: row.image_url ?? null,
        badge: row.badge ?? null,
        stock: row.stock ?? 0,
        active: row.active ?? true,
        use_cases: row.use_cases ?? [],
        specs: row.specs ?? [],
        updated_at: now,
      };
    });

    const res = await db.from("products").upsert(payload, { onConflict: "slug" });
    if (res.error) {
      errors.push(res.error.message);
      created = 0;
      updated = 0;
    }

    return { created, updated, errors };
  });
