import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Download, FileSpreadsheet, Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { importProducts } from "@/lib/admin.functions";
import { useCategories } from "@/lib/categories";

const COLUMNS = [
  "slug",
  "name",
  "brand",
  "category",
  "subtitle",
  "description",
  "price",
  "old_price",
  "image_url",
  "badge",
  "stock",
  "active",
  "use_cases",
  "specs",
] as const;

type ProductRow = {
  slug: string;
  name: string;
  brand: string | null;
  category: string;
  subtitle: string | null;
  description: string | null;
  price: number;
  old_price: number | null;
  image_url: string | null;
  badge: string | null;
  stock: number;
  active: boolean;
  use_cases: unknown;
  specs: unknown;
};

const TEMPLATE_ROWS = [
  [
    "impressora-exemplo-x1",
    "Impressora Exemplo X1",
    "Bambu Lab",
    "impressoras",
    "Alta velocidade com AMS",
    "Impressora core XY com câmara fechada e nivelamento automático.",
    6499.9,
    6999.9,
    "",
    "Novidade",
    5,
    "sim",
    "Prototipagem|Peças técnicas",
    "Volume: 256x256x256mm|Bico: 0.4mm",
  ],
  [
    "filamento-pla-exemplo",
    "Filamento PLA Exemplo 1kg",
    "SOS.3D",
    "filamentos",
    "PLA premium 1,75mm",
    "Rolo de 1kg com tolerância de ±0,02mm.",
    119.9,
    "",
    "",
    "",
    40,
    "sim",
    "Uso geral",
    "Diâmetro: 1,75mm|Peso: 1kg",
  ],
];

type ParsedRow = {
  line: number;
  values: Record<string, string>;
  error?: string;
};

const MAX_ROWS = 5000;
const PREVIEW_LIMIT = 200;

function readSpreadsheet(
  file: File,
  onProgress: (pct: number) => void,
  registerWorker: (w: Worker | null) => void,
): Promise<string[][]> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("../../workers/products-import.worker.ts", import.meta.url), {
      type: "module",
    });
    registerWorker(worker);
    const finish = () => {
      window.clearTimeout(timer);
      worker.terminate();
      registerWorker(null);
    };
    const timer = window.setTimeout(() => {
      finish();
      reject(new Error("A leitura excedeu o tempo limite. Remova linhas vazias formatadas e tente novamente."));
    }, 120_000);

    worker.onmessage = (
      event: MessageEvent<{ matrix?: string[][]; error?: string; progress?: number }>,
    ) => {
      if (typeof event.data.progress === "number" && !event.data.matrix && !event.data.error) {
        onProgress(Math.min(99, Math.round(event.data.progress * 100)));
        return;
      }
      finish();
      if (event.data.error) reject(new Error(event.data.error));
      else resolve(event.data.matrix ?? []);
    };
    worker.onerror = () => {
      finish();
      reject(new Error("O navegador não conseguiu processar este arquivo."));
    };

    void file.arrayBuffer().then(
      (buffer) => worker.postMessage(buffer, [buffer]),
      (error: unknown) => reject(error instanceof Error ? error : new Error("Falha ao abrir o arquivo")),
    );
  });
}

function formatEta(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "calculando...";
  if (seconds < 60) return `~${Math.ceil(seconds)}s restantes`;
  return `~${Math.ceil(seconds / 60)} min restantes`;
}


function downloadWorkbook(rows: (string | number)[][], filename: string, sheetName: string) {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = (rows[0] ?? []).map(() => ({ wch: 22 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, filename);
}

function toNumber(raw: string): number | null {
  const clean = raw.trim().replace(/[R$\s]/g, "");
  if (!clean) return null;
  const normalized = clean.includes(",")
    ? clean.replace(/\./g, "").replace(",", ".")
    : clean;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

function toBool(raw: string) {
  const v = raw.trim().toLowerCase();
  if (["não", "nao", "false", "0", "n", "inativo"].includes(v)) return false;
  return true;
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function specsToText(specs: unknown) {
  if (!Array.isArray(specs)) return "";
  return specs
    .map((s) => {
      const item = s as { label?: string; value?: string };
      return item?.label ? `${item.label}: ${item.value ?? ""}` : "";
    })
    .filter(Boolean)
    .join("|");
}

export function ProductsImport({ products = [] }: { products?: ProductRow[] }) {
  const { categories: categoryList } = useCategories();
  const categorySlugs = categoryList.map((c) => c.slug);
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const cancelRef = useRef(false);
  const startRef = useRef(0);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parseProgress, setParseProgress] = useState(0);
  const [parseEta, setParseEta] = useState<number>(0);
  const [serverErrors, setServerErrors] = useState<string[]>([]);

  const valid = rows.filter((r) => !r.error);
  const invalid = rows.filter((r) => r.error);

  function cancelParsing() {
    workerRef.current?.terminate();
    workerRef.current = null;
    cancelRef.current = true;
    setParsing(false);
    setParseProgress(0);
    toast.info("Leitura cancelada");
  }

  function cancelImport() {
    cancelRef.current = true;
    toast.info("Cancelando importação...", {
      description: "Os lotes já enviados foram salvos.",
    });
  }

  function downloadErrorReport() {
    const failed = invalid.map((r) => [
      r.line,
      r.error ?? "",
      ...COLUMNS.map((c) => r.values[c] ?? ""),
    ]);
    if (failed.length === 0) {
      toast.error("Nenhuma linha com erro para exportar");
      return;
    }
    downloadWorkbook(
      [["linha", "erro", ...COLUMNS], ...failed],
      `falhas-importacao-${new Date().toISOString().slice(0, 10)}.xlsx`,
      "Falhas",
    );
    toast.success(`${failed.length} linhas com erro exportadas`);
  }

  function downloadServerErrorReport() {
    if (serverErrors.length === 0) return;
    downloadWorkbook(
      [["erro"], ...serverErrors.map((e) => [e])],
      `falhas-servidor-${new Date().toISOString().slice(0, 10)}.xlsx`,
      "Falhas",
    );
  }

  const run = useMutation({
    mutationFn: async () => {
      cancelRef.current = false;
      startRef.current = Date.now();
      setProgress({ done: 0, total: valid.length });

      const payload = valid.map((r) => {
        const v = r.values;
        const useCases = (v["use_cases"] ?? "")
          .split(/[|;]/)
          .map((s) => s.trim())
          .filter(Boolean)
          .slice(0, 12);
        const specs = (v["specs"] ?? "")
          .split("|")
          .map((s) => s.trim())
          .filter(Boolean)
          .map((s) => {
            const [label, ...rest] = s.split(":");
            return { label: (label ?? "").trim().slice(0, 120), value: rest.join(":").trim().slice(0, 400) };
          })
          .filter((s) => s.label && s.value)
          .slice(0, 30);
        const oldPrice = toNumber(v["old_price"] ?? "");
        const imageUrl = (v["image_url"] ?? "").trim();
        return {
          slug: v["slug"]!,
          name: v["name"]!.trim(),
          brand: (v["brand"] ?? "").trim() || "SOS.3D",
          category: v["category"]!,
          subtitle: (v["subtitle"] ?? "").trim().slice(0, 300),
          description: (v["description"] ?? "").trim().slice(0, 4000),
          price: toNumber(v["price"] ?? "") ?? 0,
          old_price: oldPrice,
          image_url: imageUrl || null,
          badge: (v["badge"] ?? "").trim() || null,
          stock: Math.max(0, Math.round(toNumber(v["stock"] ?? "") ?? 0)),
          active: toBool(v["active"] ?? "sim"),
          use_cases: useCases,
          specs,
        };
      });

      const CHUNK = 50;
      const total = { created: 0, updated: 0, errors: [] as string[], canceled: false };
      for (let i = 0; i < payload.length; i += CHUNK) {
        if (cancelRef.current) {
          total.canceled = true;
          break;
        }
        const chunk = payload.slice(i, i + CHUNK);
        const res = (await importProducts({ data: { rows: chunk } } as never)) as {
          created: number;
          updated: number;
          errors: string[];
        };
        total.created += res.created;
        total.updated += res.updated;
        total.errors.push(...res.errors);
        setProgress({ done: Math.min(i + CHUNK, payload.length), total: payload.length });
      }
      return total;
    },
    onSuccess: (res) => {
      void queryClient.invalidateQueries();
      setServerErrors(res.errors);
      setRows((prev) => prev.filter((r) => r.error));
      if (res.canceled) {
        toast.warning("Importação cancelada", {
          description: `${res.created} criados e ${res.updated} atualizados antes do cancelamento.`,
        });
        return;
      }
      if (res.errors.length) {
        toast.warning(`Importação parcial: ${res.created} criados, ${res.updated} atualizados`, {
          description: res.errors.slice(0, 3).join(" • "),
        });
      } else {
        setFileName(null);
        toast.success(`Importação concluída`, {
          description: `${res.created} produtos criados e ${res.updated} atualizados.`,
        });
      }
    },
    onError: (e: Error) => toast.error("Falha na importação", { description: e.message }),
    onSettled: () => {
      setProgress(null);
      cancelRef.current = false;
    },
  });



  function downloadTemplate() {
    downloadWorkbook([[...COLUMNS], ...TEMPLATE_ROWS], "modelo-produtos-sos3d.xlsx", "Produtos");
  }

  function exportProducts() {
    if (products.length === 0) {
      toast.error("Nenhum produto para exportar");
      return;
    }
    const data = products.map((p) => [
      p.slug,
      p.name,
      p.brand ?? "",
      p.category,
      p.subtitle ?? "",
      p.description ?? "",
      p.price,
      p.old_price ?? "",
      p.image_url ?? "",
      p.badge ?? "",
      p.stock,
      p.active ? "sim" : "não",
      Array.isArray(p.use_cases) ? (p.use_cases as string[]).join("|") : "",
      specsToText(p.specs),
    ]);
    const stamp = new Date().toISOString().slice(0, 10);
    downloadWorkbook([[...COLUMNS], ...data], `produtos-sos3d-${stamp}.xlsx`, "Produtos");
    toast.success(`${products.length} produtos exportados`);
  }

  async function handleFile(file: File) {
    cancelRef.current = false;
    setServerErrors([]);
    setParseProgress(0);
    setParseEta(0);
    setParsing(true);
    const startedAt = Date.now();
    let matrix: string[][];
    try {
      matrix = await readSpreadsheet(
        file,
        (pct) => {
          setParseProgress(pct);
          const elapsed = (Date.now() - startedAt) / 1000;
          setParseEta(pct > 3 ? (elapsed / pct) * (100 - pct) : 0);
        },
        (w) => {
          workerRef.current = w;
        },
      );
    } catch (e) {
      setParsing(false);
      if (!cancelRef.current)
        toast.error("Não foi possível ler a planilha", { description: (e as Error).message });
      return;
    }
    if (cancelRef.current) {
      setParsing(false);
      return;
    }

    if (matrix.length < 2) {
      setParsing(false);
      toast.error("Planilha vazia", { description: "Use o modelo com cabeçalho e ao menos 1 linha." });
      return;
    }
    if (matrix.length > MAX_ROWS) {
      toast.warning(`Planilha grande`, {
        description: `Apenas as primeiras ${MAX_ROWS} linhas serão consideradas.`,
      });
    }
    const header = matrix[0]!.map((h) => h.trim().toLowerCase());
    const parsed: ParsedRow[] = matrix
      .slice(1, MAX_ROWS + 1)
      .filter((cells) => cells.some((c) => c && c.trim()))
      .map((cells, i) => {
      const values: Record<string, string> = {};
      header.forEach((key, idx) => {
        values[key] = (cells[idx] ?? "").trim();
      });
       if ((!values["slug"] || values["slug"].startsWith("=")) && values["name"])
         values["slug"] = slugify(values["name"]);

      let error: string | undefined;
      if (!values["name"]) error = "Nome obrigatório";
      else if (!values["slug"] || !/^[a-z0-9-]+$/.test(values["slug"]))
        error = "Slug inválido (use apenas letras minúsculas, números e hífen)";
      else if (!categorySlugs.includes(values["category"] ?? ""))
        error = `Categoria deve ser uma destas: ${categorySlugs.join(", ")}`;
      else if (toNumber(values["price"] ?? "") === null) error = "Preço inválido";

      return error ? { line: i + 2, values, error } : { line: i + 2, values };
    });

    setRows(parsed);
    setFileName(file.name);
    setParsing(false);
  }

  const pct = progress && progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;
  const importEta =
    progress && progress.done > 0
      ? ((Date.now() - startRef.current) / 1000 / progress.done) * (progress.total - progress.done)
      : 0;

  return (
    <div className="space-y-6">
      <Dialog open={parsing}>
        <DialogContent className="sm:max-w-md [&>button]:hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" /> Lendo planilha
            </DialogTitle>
            <DialogDescription>
              Processando o arquivo em segundo plano. Você pode cancelar a qualquer momento.
            </DialogDescription>
          </DialogHeader>
          <Progress value={parseProgress} />
          <p className="text-sm text-muted-foreground">
            {parseProgress}% concluído • {formatEta(parseEta)}
          </p>
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={cancelParsing}>
              <X /> Cancelar leitura
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={run.isPending}>
        <DialogContent className="sm:max-w-md [&>button]:hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" /> Importando produtos
            </DialogTitle>
            <DialogDescription>
              Não feche esta janela. Enviando os dados da planilha em lotes.
            </DialogDescription>
          </DialogHeader>
          <Progress value={pct} />
          <p className="text-sm text-muted-foreground">
            {progress?.done ?? 0} de {progress?.total ?? 0} produtos processados ({pct}%) •{" "}
            {formatEta(importEta)}
          </p>
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={cancelImport}>
              <X /> Cancelar importação
            </Button>
          </div>
        </DialogContent>
      </Dialog>


      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="flex items-center gap-2 font-semibold">
              <FileSpreadsheet className="size-4" /> Importação e exportação em massa
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Baixe o modelo em Excel, preencha e envie de volta. Produtos com o mesmo{" "}
              <strong>slug</strong> são atualizados; os demais são criados. Você também pode exportar
              o catálogo atual, editar na planilha e reimportar.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Download /> Baixar modelo (Excel)
            </Button>
            <Button variant="outline" size="sm" onClick={exportProducts}>
              <Download /> Exportar produtos ({products.length})
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFile(file);
                e.target.value = "";
              }}
            />
            <Button size="sm" onClick={() => inputRef.current?.click()}>
              <Upload /> Selecionar planilha
            </Button>
          </div>
        </div>

        <div className="mt-4 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
          <p>
            <strong>Colunas:</strong> {COLUMNS.join(", ")}
          </p>
          <p>
            <strong>Formatos:</strong> aceita .xlsx, .xls e .csv • preço 1234.90 ou 1.234,90 • ativo
            sim/não • use_cases e specs separados por | (specs no formato <code>Rótulo: valor</code>)
          </p>
        </div>
      </div>

      {rows.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium">{fileName}</p>
              <Badge variant="secondary">{valid.length} prontos</Badge>
              {invalid.length > 0 && <Badge variant="destructive">{invalid.length} com erro</Badge>}
            </div>
            <div className="flex gap-2">
              {invalid.length > 0 && (
                <Button variant="outline" size="sm" onClick={downloadErrorReport}>
                  <Download /> Baixar erros ({invalid.length})
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => setRows([])}>
                Cancelar
              </Button>
              <Button
                size="sm"
                disabled={valid.length === 0 || run.isPending}
                onClick={() => run.mutate()}
              >
                {run.isPending ? <Loader2 className="animate-spin" /> : <Upload />} Importar{" "}
                {valid.length} produtos
              </Button>
            </div>
          </div>

          {invalid.length > 0 && (
            <div className="mt-4 rounded-lg border border-destructive/40 bg-destructive/5 p-4">
              <p className="flex items-center gap-2 text-sm font-medium text-destructive">
                <AlertTriangle className="size-4" /> {invalid.length} linhas com erro (de{" "}
                {rows.length})
              </p>
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                {Object.entries(
                  invalid.reduce<Record<string, number>>((acc, r) => {
                    const key = r.error ?? "Erro desconhecido";
                    acc[key] = (acc[key] ?? 0) + 1;
                    return acc;
                  }, {}),
                ).map(([msg, count]) => (
                  <li key={msg}>
                    <strong>{count}x</strong> {msg} — ex.: linha{" "}
                    {invalid.find((r) => r.error === msg)?.line}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {serverErrors.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-secondary/40 p-4">
              <p className="text-sm text-muted-foreground">
                O servidor recusou {serverErrors.length} registros durante a importação.
              </p>
              <Button variant="outline" size="sm" onClick={downloadServerErrorReport}>
                <Download /> Baixar relatório do servidor
              </Button>
            </div>
          )}


          <div className="mt-4 max-h-[420px] overflow-auto rounded-lg border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-secondary text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Linha</th>
                  <th className="px-3 py-2">Slug</th>
                  <th className="px-3 py-2">Nome</th>
                  <th className="px-3 py-2">Categoria</th>
                  <th className="px-3 py-2">Preço</th>
                  <th className="px-3 py-2">Estoque</th>
                  <th className="px-3 py-2">Situação</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, PREVIEW_LIMIT).map((r) => (
                  <tr key={r.line} className="border-t border-border">
                    <td className="px-3 py-2 text-muted-foreground">{r.line}</td>
                    <td className="px-3 py-2">{r.values["slug"]}</td>
                    <td className="px-3 py-2">{r.values["name"]}</td>
                    <td className="px-3 py-2">{r.values["category"]}</td>
                    <td className="px-3 py-2">{r.values["price"]}</td>
                    <td className="px-3 py-2">{r.values["stock"]}</td>
                    <td className="px-3 py-2">
                      {r.error ? (
                        <span className="text-destructive">{r.error}</span>
                      ) : (
                        <span className="text-muted-foreground">OK</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length > PREVIEW_LIMIT && (
            <p className="mt-2 text-xs text-muted-foreground">
              Exibindo as primeiras {PREVIEW_LIMIT} linhas de {rows.length}. A importação considera
              todas as linhas válidas.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
