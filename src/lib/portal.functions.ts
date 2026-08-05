import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const myPortal = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [profile, membership, roles] = await Promise.all([
      context.supabase.from("profiles").select("*").eq("id", context.userId).maybeSingle(),
      context.supabase.from("memberships").select("*").eq("user_id", context.userId).maybeSingle(),
      context.supabase.from("user_roles").select("role").eq("user_id", context.userId),
    ]);

    const isMember = Boolean(membership.data?.active);
    let courses: unknown[] = [];
    if (isMember) {
      const { data, error } = await context.supabase
        .from("courses")
        .select("id, slug, title, description, level, cover_key, sort_order, lessons(*)")
        .eq("published", true)
        .order("sort_order", { ascending: true });
      if (error) throw new Error(error.message);
      courses = data ?? [];
    }

    return {
      profile: profile.data ?? null,
      membership: membership.data ?? null,
      isMember,
      isAdmin: (roles.data ?? []).some((r) => r.role === "admin"),
      courses,
    };
  });
