import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const BUCKET = "course-media";

const courseSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(2)
    .max(120)
    .regex(/^[a-z0-9-]+$/, "Slug inválido"),
  title: z.string().trim().min(2).max(180),
  description: z.string().trim().max(4000).default(""),
  level: z.string().trim().min(2).max(60).default("Iniciante"),
  cover_key: z.string().trim().max(60).default("printer-1"),
  published: z.boolean().default(true),
  sort_order: z.number().int().min(0).max(9999).default(0),
});

const lessonSchema = z.object({
  course_id: z.string().uuid(),
  title: z.string().trim().min(2).max(180),
  description: z.string().trim().max(4000).default(""),
  video_url: z.string().trim().max(2000).nullable().optional(),
  resource_url: z.string().trim().max(2000).nullable().optional(),
  duration_min: z.number().int().min(0).max(1000).default(0),
  sort_order: z.number().int().min(0).max(9999).default(0),
});

export const saveCourse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid().nullable().optional(), values: courseSchema }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { assertAdmin, adminClient } = await import("@/lib/admin-guard.server");
    await assertAdmin(context.supabase, context.userId);
    const db = await adminClient();
    const payload = { ...data.values, updated_at: new Date().toISOString() };
    const { error } = data.id
      ? await db.from("courses").update(payload).eq("id", data.id)
      : await db.from("courses").insert(payload);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteCourse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { assertAdmin, adminClient } = await import("@/lib/admin-guard.server");
    await assertAdmin(context.supabase, context.userId);
    const db = await adminClient();
    await db.from("lessons").delete().eq("course_id", data.id);
    const { error } = await db.from("courses").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const saveLesson = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid().nullable().optional(), values: lessonSchema }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { assertAdmin, adminClient } = await import("@/lib/admin-guard.server");
    await assertAdmin(context.supabase, context.userId);
    const db = await adminClient();
    const v = data.values;
    const payload = {
      course_id: v.course_id,
      title: v.title,
      description: v.description,
      video_url: v.video_url || null,
      resource_url: v.resource_url || null,
      duration_min: v.duration_min,
      sort_order: v.sort_order,
      updated_at: new Date().toISOString(),
    };
    const { error } = data.id
      ? await db.from("lessons").update(payload).eq("id", data.id)
      : await db.from("lessons").insert(payload);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteLesson = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { assertAdmin, adminClient } = await import("@/lib/admin-guard.server");
    await assertAdmin(context.supabase, context.userId);
    const db = await adminClient();
    const { error } = await db.from("lessons").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Gera URL assinada para o admin enviar o arquivo direto ao storage (suporta vídeos grandes). */
export const createMediaUploadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ fileName: z.string().trim().min(1).max(200) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { assertAdmin, adminClient } = await import("@/lib/admin-guard.server");
    await assertAdmin(context.supabase, context.userId);
    const db = await adminClient();

    const ext = (data.fileName.split(".").pop() ?? "mp4").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `lessons/${crypto.randomUUID()}.${ext || "mp4"}`;
    const { data: signed, error } = await db.storage.from(BUCKET).createSignedUploadUrl(path);
    if (error || !signed) throw new Error(error?.message ?? "Falha ao preparar upload.");
    return { bucket: BUCKET, path, token: signed.token };
  });

/** Devolve uma URL temporária de leitura para membros ativos (ou admins). */
export const getLessonMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        lessonId: z.string().uuid(),
        field: z.enum(["video", "resource"]).default("video"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    // RLS garante que só membros ativos (ou admins) leem a aula.
    const { data: lesson, error } = await context.supabase
      .from("lessons")
      .select("video_url, resource_url")
      .eq("id", data.lessonId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!lesson) throw new Error("Aula não encontrada.");

    const raw = data.field === "video" ? lesson.video_url : lesson.resource_url;
    if (!raw) return { url: null };
    if (!raw.startsWith("storage:")) return { url: raw };

    const { adminClient } = await import("@/lib/admin-guard.server");
    const db = await adminClient();
    const path = raw.slice("storage:".length);
    const signed = await db.storage.from(BUCKET).createSignedUrl(path, 60 * 60 * 3);
    if (signed.error || !signed.data) throw new Error(signed.error?.message ?? "Falha ao abrir mídia.");
    return { url: signed.data.signedUrl };
  });
