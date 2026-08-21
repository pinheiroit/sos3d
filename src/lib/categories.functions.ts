import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const categorySchema = z.object({
  slug: z
    .string()
    .trim()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/, "Use apenas letras minúsculas, números e hífen"),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(400).default(""),
  sort_order: z.number().int().min(0).max(9999).default(0),
  active: z.boolean().default(true),
});

export type CategoryRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  sort_order: number;
  active: boolean;
};

/** Categorias ativas (uso público na loja). */
export const listCategories = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("categories")
    .select("id, slug, name, description, sort_order, active")
    .eq("active", true)
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as CategoryRow[];
});

/** Todas as categorias (inclusive inativas) para o painel. */
export const adminListCategories = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdmin, adminClient } = await import("@/lib/admin-guard.server");
    await assertAdmin(context.supabase, context.userId);
    const db = await adminClient();
    const [cats, products] = await Promise.all([
      db
        .from("categories")
        .select("id, slug, name, description, sort_order, active")
        .order("sort_order", { ascending: true }),
      db.from("products").select("category"),
    ]);
    if (cats.error) throw new Error(cats.error.message);
    if (products.error) throw new Error(products.error.message);

    const counts = new Map<string, number>();
    for (const p of products.data ?? []) {
      counts.set(p.category, (counts.get(p.category) ?? 0) + 1);
    }

    return ((cats.data ?? []) as CategoryRow[]).map((c) => ({
      ...c,
      product_count: counts.get(c.slug) ?? 0,
    }));
  });

export const saveCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid().nullable().optional(), values: categorySchema }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { assertAdmin, adminClient } = await import("@/lib/admin-guard.server");
    await assertAdmin(context.supabase, context.userId);
    const db = await adminClient();

    const payload = {
      slug: data.values.slug,
      name: data.values.name,
      description: data.values.description,
      sort_order: data.values.sort_order,
      active: data.values.active,
      updated_at: new Date().toISOString(),
    };

    if (data.id) {
      const current = await db.from("categories").select("slug").eq("id", data.id).single();
      if (current.error) throw new Error(current.error.message);
      const { error } = await db.from("categories").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      // Mantém os produtos vinculados quando o identificador muda.
      if (current.data.slug !== payload.slug) {
        const moved = await db
          .from("products")
          .update({ category: payload.slug, updated_at: payload.updated_at })
          .eq("category", current.data.slug);
        if (moved.error) throw new Error(moved.error.message);
      }
    } else {
      const { error } = await db.from("categories").insert(payload);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const deleteCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { assertAdmin, adminClient } = await import("@/lib/admin-guard.server");
    await assertAdmin(context.supabase, context.userId);
    const db = await adminClient();

    const current = await db.from("categories").select("slug").eq("id", data.id).single();
    if (current.error) throw new Error(current.error.message);

    const used = await db
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("category", current.data.slug);
    if (used.error) throw new Error(used.error.message);
    if ((used.count ?? 0) > 0) {
      throw new Error(
        `Existem ${used.count} produto(s) nesta categoria. Mova-os antes de excluir.`,
      );
    }

    const { error } = await db.from("categories").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
