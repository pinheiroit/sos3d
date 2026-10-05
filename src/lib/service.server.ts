import type { SupabaseClient } from "@supabase/supabase-js";

export const SERVICE_BUCKET = "service-files";

// Cliente sem tipagem estrita para colunas jsonb do módulo de O.S.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Db = SupabaseClient<any, "public", any>;

export async function serviceDb(): Promise<Db> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as Db;
}

let bucketReady = false;
export async function ensureBucket(db: Db) {
  if (bucketReady) return;
  const { error } = await db.storage.createBucket(SERVICE_BUCKET, { public: false });
  if (error && !/exist/i.test(error.message)) throw new Error(error.message);
  bucketReady = true;
}

export async function actorName(db: Db, userId: string) {
  const { data } = await db.from("profiles").select("full_name, email").eq("id", userId).maybeSingle();
  return (data?.full_name as string) || (data?.email as string) || "Usuário";
}

export async function isStaff(db: Db, userId: string) {
  const { data } = await db.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  return Boolean(data);
}

export async function logEvent(
  db: Db,
  ev: {
    request_id?: string | null;
    order_id?: string | null;
    kind?: string;
    description: string;
    field?: string;
    old_value?: string | null;
    new_value?: string | null;
    visible_to_client?: boolean;
    actor_id: string;
  },
) {
  const name = await actorName(db, ev.actor_id);
  const { error } = await db.from("service_events").insert({ ...ev, actor_name: name });
  if (error) throw new Error(error.message);
}

export async function signFiles<T extends { path: string }>(db: Db, files: T[]) {
  if (!files.length) return [] as (T & { url: string | null })[];
  const { data } = await db.storage.from(SERVICE_BUCKET).createSignedUrls(
    files.map((f) => f.path),
    60 * 60,
  );
  return files.map((f, i) => ({ ...f, url: data?.[i]?.signedUrl ?? null }));
}

/** Dados do cliente (perfil + último documento/telefone informado em pedidos). */
export async function customerInfo(db: Db, userId: string | null) {
  if (!userId) return { name: "", email: "", phone: "", document: "" };
  const [profile, order] = await Promise.all([
    db.from("profiles").select("full_name, email, phone").eq("id", userId).maybeSingle(),
    db
      .from("orders")
      .select("customer_name, customer_phone, customer_document")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  return {
    name: (profile.data?.full_name as string) || (order.data?.customer_name as string) || "",
    email: (profile.data?.email as string) || "",
    phone: (profile.data?.phone as string) || (order.data?.customer_phone as string) || "",
    document: (order.data?.customer_document as string) || "",
  };
}
