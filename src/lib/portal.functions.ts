import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type PortalCourse = {
  id: string;
  slug: string;
  title: string;
  description: string;
  level: string;
  cover_key: string;
  sort_order: number;
  printer_model_id?: string | null;
  lessons: {
    id: string;
    title: string;
    description: string;
    duration_min: number;
    sort_order: number;
    video_url: string | null;
    resource_url: string | null;
  }[];
};

export const myPortal = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [profile, membership, roles] = await Promise.all([
      context.supabase.from("profiles").select("*").eq("id", context.userId).maybeSingle(),
      context.supabase.from("memberships").select("*").eq("user_id", context.userId).maybeSingle(),
      context.supabase.from("user_roles").select("role").eq("user_id", context.userId),
    ]);

    const isMember = Boolean(membership.data?.active);

    const links = await context.supabase
      .from("membership_printer_models")
      .select("printer_model_id")
      .eq("user_id", context.userId);
    const linkedIds = (links.data ?? []).map((l) => l.printer_model_id);
    const modelIds = linkedIds.length
      ? linkedIds
      : membership.data?.printer_model_id
        ? [membership.data.printer_model_id]
        : [];

    const models = await context.supabase
      .from("printer_models")
      .select("id, slug, name, description")
      .order("sort_order", { ascending: true });
    const printerModels = (models.data ?? []).filter((m) => modelIds.includes(m.id));

    let courses: PortalCourse[] = [];
    if (isMember && modelIds.length) {
      const { data, error } = await context.supabase
        .from("courses")
        .select("id, slug, title, description, level, cover_key, sort_order, printer_model_id, lessons(*)")
        .eq("published", true)
        .in("printer_model_id", modelIds)
        .order("sort_order", { ascending: true });
      if (error) throw new Error(error.message);
      courses = (data ?? []) as PortalCourse[];
    }

    return {
      profile: profile.data ?? null,
      membership: membership.data ?? null,
      isMember,
      printerModels,
      printerModel: printerModels[0] ?? null,
      needsPrinterModel: isMember && modelIds.length === 0,
      isAdmin: (roles.data ?? []).some((r) => r.role === "admin"),
      courses,
    };
  });
