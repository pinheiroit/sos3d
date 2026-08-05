import { useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { uploadImage } from "@/lib/uploads.functions";

const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"];

async function fileToBase64(file: File): Promise<string> {
  const buffer = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  for (let i = 0; i < buffer.length; i += 8192) {
    binary += String.fromCharCode(...buffer.subarray(i, i + 8192));
  }
  return btoa(binary);
}

export function ImageUploader({
  value,
  onChange,
  fallback,
  label = "Enviar imagem",
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  fallback?: string;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handleFile(file: File) {
    if (!ACCEPTED.includes(file.type)) {
      toast.error("Formato não suportado", { description: "Use JPG, PNG, WEBP, AVIF ou GIF." });
      return;
    }
    if (file.size > 6_000_000) {
      toast.error("Imagem muito grande", { description: "O limite é 6MB." });
      return;
    }
    setBusy(true);
    try {
      const dataBase64 = await fileToBase64(file);
      const res = await uploadImage({
        data: { fileName: file.name, contentType: file.type, dataBase64 },
      } as never);
      onChange((res as { url: string }).url);
      toast.success("Imagem enviada");
    } catch (e) {
      toast.error("Falha no envio", { description: (e as Error).message });
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const preview = value ?? fallback ?? null;

  return (
    <div className="flex items-center gap-4">
      <div className="size-20 shrink-0 overflow-hidden rounded-lg border border-border bg-secondary">
        {preview ? (
          <img src={preview} alt="Pré-visualização da imagem" className="size-full object-cover" />
        ) : (
          <div className="grid size-full place-items-center text-muted-foreground">
            <ImagePlus className="size-5" />
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED.join(",")}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? <Loader2 className="animate-spin" /> : <ImagePlus />} {label}
        </Button>
        {value && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
            <Trash2 /> Remover
          </Button>
        )}
      </div>
    </div>
  );
}
