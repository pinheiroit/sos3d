import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const modelSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/, "Use apenas letras minúsculas, números e hífen"),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(600).default(""),
  sort_order: z.number().int().min(0).max(9999).default(0),
  active: z.boolean().default(true),
});

export type PrinterModelRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  sort_order: number;
  active: boolean;
};

const SELECT = "id, slug, name, description, sort_order, active";

/** Modelos de impressora visíveis para o usuário autenticado. */
export const listPrinterModels = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("printer_models")
      .select(SELECT)
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as PrinterModelRow[];
  });

/** Modelos + contagem de cursos e membros vinculados (painel admin). */
export const adminListPrinterModels = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdmin, adminClient } = await import("@/lib/admin-guard.server");
    await assertAdmin(context.supabase, context.userId);
    const db = await adminClient();

    const [models, courses, memberships] = await Promise.all([
      db.from("printer_models").select(SELECT).order("sort_order", { ascending: true }),
      db.from("course_printer_models").select("printer_model_id"),
      db.from("memberships").select("printer_model_id, active"),
    ]);
    const err = models.error ?? courses.error ?? memberships.error;
    if (err) throw new Error(err.message);

    return ((models.data ?? []) as PrinterModelRow[]).map((m) => ({
      ...m,
      course_count: (courses.data ?? []).filter((c) => c.printer_model_id === m.id).length,
      member_count: (memberships.data ?? []).filter(
        (x) => x.active && x.printer_model_id === m.id,
      ).length,
    }));
  });

export const savePrinterModel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid().nullable().optional(), values: modelSchema }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { assertAdmin, adminClient } = await import("@/lib/admin-guard.server");
    await assertAdmin(context.supabase, context.userId);
    const db = await adminClient();
    const payload = { ...data.values, updated_at: new Date().toISOString() };
    const { error } = data.id
      ? await db.from("printer_models").update(payload).eq("id", data.id)
      : await db.from("printer_models").insert(payload);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** Cria modelos de impressora a partir dos produtos cadastrados na categoria impressoras. */
export const syncPrinterModelsFromProducts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdmin, adminClient } = await import("@/lib/admin-guard.server");
    await assertAdmin(context.supabase, context.userId);
    const db = await adminClient();

    const [products, models] = await Promise.all([
      db
        .from("products")
        .select("id, slug, name, brand, subtitle")
        .eq("category", "impressoras")
        .eq("active", true)
        .order("name", { ascending: true }),
      db.from("printer_models").select("id, slug, product_id"),
    ]);
    const err = products.error ?? models.error;
    if (err) throw new Error(err.message);

    const existing = models.data ?? [];
    const byProduct = new Set(existing.map((m) => m.product_id).filter(Boolean) as string[]);
    const bySlug = new Set(existing.map((m) => m.slug));

    let order = existing.length;
    const rows = (products.data ?? [])
      .filter((p) => !byProduct.has(p.id))
      .map((p) => {
        const name = [p.brand, p.name].filter(Boolean).join(" ").trim() || p.name;
        return {
          product_id: p.id,
          slug: slugify(p.slug || name),
          name: name.slice(0, 120),
          description: (p.subtitle ?? "").slice(0, 600),
          sort_order: ++order,
          active: true,
        };
      })
      .filter((r) => r.slug.length >= 2 && !bySlug.has(r.slug));

    if (rows.length) {
      const { error } = await db.from("printer_models").insert(rows);
      if (error) throw new Error(error.message);
    }
    return { created: rows.length };
  });

export const deletePrinterModel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { assertAdmin, adminClient } = await import("@/lib/admin-guard.server");
    await assertAdmin(context.supabase, context.userId);
    const db = await adminClient();
    // Cursos e assinaturas ficam sem modelo (ON DELETE SET NULL).
    const { error } = await db.from("printer_models").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
