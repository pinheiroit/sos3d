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
    let courses: PortalCourse[] = [];
    if (isMember) {
      const { data, error } = await context.supabase
        .from("courses")
        .select("id, slug, title, description, level, cover_key, sort_order, lessons(*)")
        .eq("published", true)
        .order("sort_order", { ascending: true });
      if (error) throw new Error(error.message);
      courses = (data ?? []) as PortalCourse[];
    }

    return {
      profile: profile.data ?? null,
      membership: membership.data ?? null,
      isMember,
      isAdmin: (roles.data ?? []).some((r) => r.role === "admin"),
      courses,
    };
  });
