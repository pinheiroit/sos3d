import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type LessonProgress = {
  lesson_id: string;
  last_page: number;
  total_pages: number;
  completed: boolean;
};

/** Lista o progresso do usuário logado em todas as aulas. */
export const myLessonProgress = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("lesson_progress")
      .select("lesson_id, last_page, total_pages, completed")
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return (data ?? []) as LessonProgress[];
  });

/** Salva a página atual / conclusão de uma aula para o usuário logado. */
export const saveLessonProgress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        lessonId: z.string().uuid(),
        lastPage: z.number().int().min(1).max(10000),
        totalPages: z.number().int().min(0).max(10000).default(0),
        completed: z.boolean().default(false),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("lesson_progress").upsert(
      {
        user_id: context.userId,
        lesson_id: data.lessonId,
        last_page: data.lastPage,
        total_pages: data.totalPages,
        completed: data.completed,
        completed_at: data.completed ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,lesson_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });
