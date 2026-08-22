import { useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { ChevronLeft, ChevronRight, CheckCircle2, Loader2 } from "lucide-react";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

type Props = {
  url: string;
  initialPage?: number;
  completed?: boolean;
  onProgress?: (page: number, totalPages: number, completed: boolean) => void;
};

export default function PdfLessonViewer({ url, initialPage = 1, completed = false, onProgress }: Props) {
  const [numPages, setNumPages] = useState(0);
  const [page, setPage] = useState(Math.max(1, initialPage));
  const [width, setWidth] = useState(760);
  const [done, setDone] = useState(completed);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(Math.min(el.clientWidth - 24, 900)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  function go(next: number) {
    if (!numPages) return;
    const target = Math.min(Math.max(next, 1), numPages);
    setPage(target);
    const isDone = done || target >= numPages;
    if (target >= numPages) setDone(true);
    onProgress?.(target, numPages, isDone);
  }

  const pct = numPages ? Math.round((page / numPages) * 100) : 0;

  return (
    <div ref={boxRef} className="rounded-lg border border-border bg-muted/30 p-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {done ? (
            <span className="inline-flex items-center gap-1 font-medium text-tech">
              <CheckCircle2 className="size-4" /> Aula concluída
            </span>
          ) : (
            <span>Progresso da leitura</span>
          )}
        </div>
        <span className="text-xs text-muted-foreground">
          Página {page} de {numPages || "…"} · {pct}%
        </span>
      </div>
      <Progress value={pct} className="mb-4 h-2" />

      <div className="flex justify-center overflow-auto">
        <Document
          file={url}
          onLoadSuccess={({ numPages: n }) => {
            setNumPages(n);
            onProgress?.(Math.min(page, n), n, done || page >= n);
          }}
          loading={
            <div className="flex items-center gap-2 py-16 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Carregando PDF…
            </div>
          }
          error={<p className="py-10 text-sm text-destructive">Não foi possível abrir o PDF.</p>}
        >
          <Page
            pageNumber={page}
            width={width > 200 ? width : 320}
            renderAnnotationLayer={false}
            className="shadow-sm"
          />
        </Document>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => go(page - 1)}>
          <ChevronLeft /> Anterior
        </Button>
        <div className="flex flex-wrap items-center justify-center gap-1">
          {Array.from({ length: Math.min(numPages, 12) }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              onClick={() => go(n)}
              className={`size-7 rounded-md border text-xs transition-colors ${
                n === page
                  ? "border-tech bg-tech text-tech-foreground"
                  : "border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              {n}
            </button>
          ))}
          {numPages > 12 && <span className="px-1 text-xs text-muted-foreground">…</span>}
        </div>
        <Button
          size="sm"
          variant="tech"
          disabled={numPages > 0 && page >= numPages}
          onClick={() => go(page + 1)}
        >
          Próxima <ChevronRight />
        </Button>
      </div>
    </div>
  );
}
