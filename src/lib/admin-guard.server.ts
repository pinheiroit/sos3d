import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/** Confirma que o usuário autenticado possui o papel de admin (RLS-safe). */
export async function assertAdmin(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<void> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Acesso restrito a administradores.");
}

export async function adminClient() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as SupabaseClient<Database>;
}

/** Papéis do usuário autenticado (lidos com RLS do próprio usuário). */
export async function getRoles(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<{ isAdmin: boolean; isSeller: boolean }> {
  const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  if (error) throw new Error(error.message);
  const roles = new Set((data ?? []).map((r) => r.role as string));
  return { isAdmin: roles.has("admin"), isSeller: roles.has("seller") };
}
