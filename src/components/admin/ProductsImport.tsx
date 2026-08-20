import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Download, FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { importProducts } from "@/lib/admin.functions";

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

const TEMPLATE_ROWS = [
  [
    "impressora-exemplo-x1",
    "Impressora Exemplo X1",
    "Bambu Lab",
    "impressoras",
    "Alta velocidade com AMS",
    "Impressora core XY com câmara fechada e nivelamento automático.",
    "6499.90",
    "6999.90",
    "",
    "Novidade",
    "5",
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
    "119,90",
    "",
    "",
    "",
    "40",
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

function csvEscape(value: string) {
  return /[";\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function buildTemplate() {
  return [
    COLUMNS.join(";"),
    ...TEMPLATE_ROWS.map((row) => row.map(csvEscape).join(";")),
  ].join("\r\n");
}

function splitLines(text: string) {
  const rows: string[][] = [];
  let cell = "";
  let row: string[] = [];
  let quoted = false;
  const delimiter = text.split("\n")[0]?.includes(";") ? ";" : ",";

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else quoted = false;
      } else cell += char;
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === delimiter) {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      cell = "";
    } else cell += char;
  }
  row.push(cell.replace(/\r$/, ""));
  if (row.some((v) => v.trim() !== "")) rows.push(row);
  return rows;
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

export function ProductsImport() {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);

  const valid = rows.filter((r) => !r.error);
  const invalid = rows.filter((r) => r.error);

  const run = useMutation({
    mutationFn: async () => {
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
          category: v["category"] as "impressoras" | "filamentos" | "acessorios",
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
      return (await importProducts({ data: { rows: payload } } as never)) as {
        created: number;
        updated: number;
        errors: string[];
      };
    },
    onSuccess: (res) => {
      void queryClient.invalidateQueries();
      setRows([]);
      setFileName(null);
      if (res.errors.length) {
        toast.warning(`Importação parcial: ${res.created} criados, ${res.updated} atualizados`, {
          description: res.errors.slice(0, 3).join(" • "),
        });
      } else {
        toast.success(`Importação concluída`, {
          description: `${res.created} produtos criados e ${res.updated} atualizados.`,
        });
      }
    },
    onError: (e: Error) => toast.error("Falha na importação", { description: e.message }),
  });

  function downloadTemplate() {
    const blob = new Blob(["\uFEFF" + buildTemplate()], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "modelo-produtos-sos3d.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleFile(file: File) {
    const text = await file.text();
    const matrix = splitLines(text.replace(/^\uFEFF/, ""));
    if (matrix.length < 2) {
      toast.error("Planilha vazia", { description: "Use o modelo com cabeçalho e ao menos 1 linha." });
      return;
    }
    const header = matrix[0]!.map((h) => h.trim().toLowerCase());
    const parsed: ParsedRow[] = matrix.slice(1).map((cells, i) => {
      const values: Record<string, string> = {};
      header.forEach((key, idx) => {
        values[key] = (cells[idx] ?? "").trim();
      });
      if (!values["slug"] && values["name"]) values["slug"] = slugify(values["name"]);

      let error: string | undefined;
      if (!values["name"]) error = "Nome obrigatório";
      else if (!values["slug"] || !/^[a-z0-9-]+$/.test(values["slug"]))
        error = "Slug inválido (use apenas letras minúsculas, números e hífen)";
      else if (!["impressoras", "filamentos", "acessorios"].includes(values["category"] ?? ""))
        error = "Categoria deve ser impressoras, filamentos ou acessorios";
      else if (toNumber(values["price"] ?? "") === null) error = "Preço inválido";

      return error ? { line: i + 2, values, error } : { line: i + 2, values };
    });

    setRows(parsed);
    setFileName(file.name);
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="flex items-center gap-2 font-semibold">
              <FileSpreadsheet className="size-4" /> Importação em massa
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Baixe o modelo, preencha no Excel ou Google Planilhas e salve como CSV. Produtos com o
              mesmo <strong>slug</strong> são atualizados; os demais são criados.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Download /> Baixar modelo (CSV)
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
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
            <strong>Formatos:</strong> preço 1234.90 ou 1.234,90 • ativo sim/não • use_cases e specs
            separados por | (specs no formato <code>Rótulo: valor</code>)
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
                {rows.map((r) => (
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
        </div>
      )}
    </div>
  );
}
