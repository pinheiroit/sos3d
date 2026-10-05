import { useRef, useState } from "react";
import { FileText, Film, ImageIcon, Lock, Paperclip, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { FILE_CATEGORIES, ORDER_FLOW, ORDER_STATUS, STAGES, fmtDateTime } from "@/lib/service";
import { uploadServiceFile } from "@/lib/service-client";
import { deleteServiceFile } from "@/lib/service.functions";

export type ServiceFile = {
  id: string;
  name: string;
  mime: string;
  category: string;
  stage: string;
  locked: boolean;
  visible_to_client: boolean;
  created_at: string;
  url: string | null;
};

export type ServiceEvent = {
  id: string;
  description: string;
  kind: string;
  actor_name: string;
  visible_to_client: boolean;
  created_at: string;
  old_value?: string | null;
  new_value?: string | null;
};

/** Barra de progresso do fluxo principal da O.S. */
export function OrderProgress({ status }: { status: string }) {
  const idx = ORDER_FLOW.indexOf(status as (typeof ORDER_FLOW)[number]);
  return (
    <div className="overflow-x-auto pb-1">
      <ol className="flex min-w-[720px] items-center gap-1">
        {ORDER_FLOW.map((s, i) => {
          const done = idx >= 0 && i < idx;
          const current = i === idx;
          return (
            <li key={s} className="flex flex-1 flex-col items-center gap-1.5 text-center">
              <span
                className={cn(
                  "h-1.5 w-full rounded-full",
                  done ? "bg-tech" : current ? "bg-accent" : "bg-secondary",
                )}
              />
              <span className={cn("text-[11px] leading-tight", current ? "font-semibold text-foreground" : "text-muted-foreground")}>
                {ORDER_STATUS[s]}
              </span>
            </li>
          );
        })}
      </ol>
      {idx < 0 && (
        <p className="mt-2 text-xs font-medium text-tech">Situação especial: {ORDER_STATUS[status] ?? status}</p>
      )}
    </div>
  );
}

export function EventTimeline({ events, staff }: { events: ServiceEvent[]; staff?: boolean }) {
  if (!events.length) return <p className="text-sm text-muted-foreground">Nenhum registro ainda.</p>;
  return (
    <ol className="relative space-y-4 border-l border-border pl-5">
      {[...events].reverse().map((ev) => (
        <li key={ev.id} className="relative">
          <span className={cn("absolute -left-[25px] top-1.5 size-2.5 rounded-full ring-4 ring-background", ev.kind === "status" ? "bg-accent" : "bg-tech")} />
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{fmtDateTime(ev.created_at)}</span>
            <span>· {ev.actor_name}</span>
            {staff && !ev.visible_to_client && (
              <Badge variant="outline" className="gap-1 text-[10px]"><Lock className="size-3" /> Interno</Badge>
            )}
          </div>
          <p className="mt-0.5 whitespace-pre-line text-sm">{ev.description}</p>
        </li>
      ))}
    </ol>
  );
}

function FileIcon({ mime }: { mime: string }) {
  if (mime.startsWith("image/")) return <ImageIcon className="size-4" />;
  if (mime.startsWith("video/")) return <Film className="size-4" />;
  return <FileText className="size-4" />;
}

export function FileGrid({
  files,
  staff,
  canDelete,
  onChanged,
}: {
  files: ServiceFile[];
  staff?: boolean;
  canDelete?: boolean;
  onChanged?: () => void;
}) {
  if (!files.length) return <p className="text-sm text-muted-foreground">Nenhum arquivo anexado.</p>;
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {files.map((f) => (
        <li key={f.id} className="overflow-hidden rounded-lg border border-border bg-card">
          {f.url && f.mime.startsWith("image/") ? (
            <a href={f.url} target="_blank" rel="noreferrer">
              <img src={f.url} alt={f.name} className="h-32 w-full bg-muted object-cover" />
            </a>
          ) : f.url && f.mime.startsWith("video/") ? (
            <video src={f.url} controls className="h-32 w-full bg-muted object-cover" />
          ) : (
            <div className="grid h-32 place-items-center bg-muted text-muted-foreground">
              <FileText className="size-8" />
            </div>
          )}
          <div className="space-y-1 p-3">
            <a href={f.url ?? "#"} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 truncate text-sm font-medium hover:text-tech">
              <FileIcon mime={f.mime} /> <span className="truncate">{f.name}</span>
            </a>
            <div className="flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
              <span>{FILE_CATEGORIES[f.category] ?? f.category}</span>·<span>{STAGES[f.stage] ?? f.stage}</span>·<span>{fmtDateTime(f.created_at)}</span>
            </div>
            <div className="flex items-center gap-1">
              {f.locked && <Badge variant="outline" className="gap-1 text-[10px]"><Lock className="size-3" /> Registrado</Badge>}
              {staff && !f.visible_to_client && <Badge variant="outline" className="text-[10px]">Interno</Badge>}
              {canDelete && !f.locked && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="ml-auto size-7"
                  aria-label={`Remover ${f.name}`}
                  onClick={async () => {
                    try {
                      await deleteServiceFile({ data: { id: f.id } } as never);
                      onChanged?.();
                    } catch (e) {
                      toast.error((e as Error).message);
                    }
                  }}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              )}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function FileDrop({
  scope,
  id,
  stage,
  staff,
  onDone,
  hint,
}: {
  scope: "equipment" | "request" | "order";
  id: string;
  stage?: string;
  staff?: boolean;
  onDone?: () => void;
  hint?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [category, setCategory] = useState("auto");
  const [internal, setInternal] = useState(false);

  async function handle(list: FileList | null) {
    if (!list?.length) return;
    setBusy(true);
    try {
      for (const file of Array.from(list)) {
        await uploadServiceFile(file, {
          scope,
          id,
          ...(stage ? { stage } : {}),
          ...(category === "auto" ? {} : { category }),
          visible_to_client: !internal,
        });
      }
      toast.success(list.length > 1 ? `${list.length} arquivos enviados` : "Arquivo enviado");
      onDone?.();
    } catch (e) {
      toast.error("Falha no envio", { description: (e as Error).message });
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = "";
    }
  }

  return (
    <div
      className="rounded-xl border border-dashed border-border bg-secondary/40 p-5 text-center"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        void handle(e.dataTransfer.files);
      }}
    >
      <Paperclip className="mx-auto size-6 text-tech" />
      <p className="mt-2 text-sm font-medium">Arraste arquivos ou clique para anexar</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint ?? "Fotos, vídeos, nota fiscal, capturas de tela ou documentos (até 200 MB cada)."}</p>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <select
          aria-label="Tipo do arquivo"
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="auto">Tipo automático</option>
          {Object.entries(FILE_CATEGORIES).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        {staff && (
          <label className="flex items-center gap-1.5 text-xs">
            <input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} /> Somente interno
          </label>
        )}
        <Button type="button" variant="tech" size="sm" disabled={busy} onClick={() => ref.current?.click()}>
          <Upload /> {busy ? "Enviando…" : "Escolher arquivos"}
        </Button>
      </div>
      <input
        ref={ref}
        type="file"
        multiple
        className="hidden"
        accept="image/*,video/*,application/pdf,.txt,.log,.gcode,.3mf,.zip"
        onChange={(e) => void handle(e.target.files)}
      />
    </div>
  );
}
