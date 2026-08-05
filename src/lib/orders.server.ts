import { createClient } from "@supabase/supabase-js";

/** Resolve o usuário autenticado a partir do header Authorization (opcional em checkout convidado). */
export async function resolveOptionalUserId(
  authorization: string | undefined,
): Promise<string | null> {
  const token = authorization?.replace(/^Bearer\s+/i, "");
  if (!token) return null;

  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  const url = process.env["SUPABASE_URL"]!;
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.getUser(token);
  if (error) return null;
  return data.user?.id ?? null;
}
