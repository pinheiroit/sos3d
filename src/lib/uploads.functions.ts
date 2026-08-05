import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const BUCKET = "site-images";

const uploadSchema = z.object({
  fileName: z.string().trim().min(1).max(180),
  contentType: z.enum(["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"]),
  /** Conteúdo do arquivo em base64 (sem prefixo data:). Máx. ~6MB. */
  dataBase64: z.string().min(16).max(9_000_000),
});

function decodeBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Envia uma imagem para o bucket privado e devolve a URL pública servida pelo site. */
export const uploadImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => uploadSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { assertAdmin, adminClient } = await import("@/lib/admin-guard.server");
    await assertAdmin(context.supabase, context.userId);
    const db = await adminClient();

    const bytes = decodeBase64(data.dataBase64);
    if (bytes.byteLength > 6_000_000) throw new Error("Imagem maior que 6MB.");

    const ext = (data.fileName.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `uploads/${crypto.randomUUID()}.${ext || "jpg"}`;

    const { error } = await db.storage
      .from(BUCKET)
      .upload(path, bytes, { contentType: data.contentType, upsert: false });
    if (error) throw new Error(error.message);

    return { url: `/api/public/img/${path}` };
  });

/** Define (ou limpa) a imagem de um banner do site. */
export const setSiteImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        key: z.string().trim().min(2).max(60),
        url: z.string().trim().max(600).nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { assertAdmin, adminClient } = await import("@/lib/admin-guard.server");
    await assertAdmin(context.supabase, context.userId);
    const db = await adminClient();

    if (!data.url) {
      const { error } = await db.from("site_images").delete().eq("key", data.key);
      if (error) throw new Error(error.message);
      return { ok: true };
    }

    const { error } = await db
      .from("site_images")
      .upsert({ key: data.key, url: data.url, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Lista as imagens configuradas para os banners (leitura pública). */
export const listSiteImages = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.from("site_images").select("key, url");
  if (error) throw new Error(error.message);
  return (data ?? []) as { key: string; url: string }[];
});
