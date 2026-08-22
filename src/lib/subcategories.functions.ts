import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const subcategorySchema = z.object({
  category_slug: z
    .string()
    .trim()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/, "Categoria inválida"),
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

export type SubcategoryRow = {
  id: string;
  category_slug: string;
  slug: string;
  name: string;
  description: string;
  sort_order: number;
  active: boolean;
};

const SELECT = "id, category_slug, slug, name, description, sort_order, active";

/** Subcategorias ativas (uso público na loja). */
export const listSubcategories = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("subcategories")
    .select(SELECT)
    .eq("active", true)
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as SubcategoryRow[];
});

/** Todas as subcategorias (inclusive inativas) para o painel. */
export const adminListSubcategories = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdmin, adminClient } = await import("@/lib/admin-guard.server");
    await assertAdmin(context.supabase, context.userId);
    const db = await adminClient();
    const [subs, products] = await Promise.all([
      db.from("subcategories").select(SELECT).order("sort_order", { ascending: true }),
      db.from("products").select("category, subcategory"),
    ]);
    if (subs.error) throw new Error(subs.error.message);
    if (products.error) throw new Error(products.error.message);

    const counts = new Map<string, number>();
    for (const p of products.data ?? []) {
      const key = `${p.category}::${p.subcategory ?? ""}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    return ((subs.data ?? []) as SubcategoryRow[]).map((s) => ({
      ...s,
      product_count: counts.get(`${s.category_slug}::${s.slug}`) ?? 0,
    }));
  });

export const saveSubcategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ id: z.string().uuid().nullable().optional(), values: subcategorySchema })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { assertAdmin, adminClient } = await import("@/lib/admin-guard.server");
    await assertAdmin(context.supabase, context.userId);
    const db = await adminClient();

    const payload = {
      category_slug: data.values.category_slug,
      slug: data.values.slug,
      name: data.values.name,
      description: data.values.description,
      sort_order: data.values.sort_order,
      active: data.values.active,
      updated_at: new Date().toISOString(),
    };

    if (data.id) {
      const current = await db
        .from("subcategories")
        .select("slug, category_slug")
        .eq("id", data.id)
        .single();
      if (current.error) throw new Error(current.error.message);
      const { error } = await db.from("subcategories").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      if (current.data.slug !== payload.slug) {
        const moved = await db
          .from("products")
          .update({ subcategory: payload.slug, updated_at: payload.updated_at })
          .eq("category", current.data.category_slug)
          .eq("subcategory", current.data.slug);
        if (moved.error) throw new Error(moved.error.message);
      }
    } else {
      const { error } = await db.from("subcategories").insert(payload);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const deleteSubcategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { assertAdmin, adminClient } = await import("@/lib/admin-guard.server");
    await assertAdmin(context.supabase, context.userId);
    const db = await adminClient();

    const current = await db
      .from("subcategories")
      .select("slug, category_slug")
      .eq("id", data.id)
      .single();
    if (current.error) throw new Error(current.error.message);

    // Produtos ficam na categoria, apenas sem subcategoria.
    const cleared = await db
      .from("products")
      .update({ subcategory: "", updated_at: new Date().toISOString() })
      .eq("category", current.data.category_slug)
      .eq("subcategory", current.data.slug);
    if (cleared.error) throw new Error(cleared.error.message);

    const { error } = await db.from("subcategories").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
