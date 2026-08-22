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
      db.from("courses").select("printer_model_id"),
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
