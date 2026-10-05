import { supabase } from "@/integrations/supabase/client";
import { requestServiceUpload } from "@/lib/service.functions";

export function guessCategory(file: File) {
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("image/")) return "foto";
  if (file.type === "application/pdf") return "nota_fiscal";
  return "outro";
}

export async function uploadServiceFile(
  file: File,
  opts: { scope: "equipment" | "request" | "order"; id: string; category?: string; stage?: string; visible_to_client?: boolean },
) {
  if (file.size > 200 * 1024 * 1024) throw new Error(`${file.name}: limite de 200 MB por arquivo.`);
  const res = (await requestServiceUpload({
    data: {
      scope: opts.scope,
      id: opts.id,
      name: file.name,
      mime: file.type,
      size: file.size,
      category: opts.category ?? guessCategory(file),
      ...(opts.stage ? { stage: opts.stage } : {}),
      visible_to_client: opts.visible_to_client ?? true,
    },
  } as never)) as { path: string; token: string; bucket: string };
  const { error } = await supabase.storage.from(res.bucket).uploadToSignedUrl(res.path, res.token, file, file.type ? { contentType: file.type } : {});
  if (error) throw new Error(error.message);
}
