import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, FileCode2, Loader2, PackagePlus, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { processNfeStockEntry } from "@/lib/admin.functions";
import { formatBRL } from "@/lib/catalog";
import { useCategories } from "@/lib/categories";
import { useSubcategories } from "@/lib/subcategories";
import { normalizeProductName, parseNfeXml, productSlug, type ParsedNfe } from "@/lib/nfe";

type Product = { id: string; name: string; slug: string; brand: string; category: string; subcategory: string; price: number; stock: number };
type Action = "linked" | "created" | "ignored";
type ItemDecision = { action: Action; productId?: string; name: string; slug: string; brand: string; category: string; subcategory: string; price: number };
type Draft = { id: string; fileName: string; invoice: ParsedNfe; decisions: ItemDecision[] };

type Props = { products: Product[]; onImported?: () => void };

const money = (value: number) => formatBRL(value || 0);

export function NfeImport({ products, onImported }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { categories } = useCategories();
  const { all: subcategories } = useSubcategories();
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [activeId, setActiveId] = useState("");
  const [reading, setReading] = useState(false);

  const { data: links = [] } = useQuery({
    queryKey: ["supplier-product-links"],
    queryFn: async () => {
      const { data, error } = await supabase.from("supplier_product_links").select("supplier_document,supplier_code,ean,product_id");
      if (error) throw error;
      return data;
    },
  });
  const { data: processedKeys = [] } = useQuery({
    queryKey: ["stock-entry-keys"],
    queryFn: async () => {
      const { data, error } = await supabase.from("stock_entries").select("access_key").limit(1000);
      if (error) throw error;
      return data.map((row) => row.access_key);
    },
  });

  const active = drafts.find((draft) => draft.id === activeId) ?? drafts[0];
  const productById = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);

  function suggest(invoice: ParsedNfe): ItemDecision[] {
    return invoice.items.map((item) => {
      const saved = links.find((link) => link.supplier_document === invoice.supplierDocument && link.supplier_code === item.supplierCode);
      const exactName = products.find((product) => normalizeProductName(product.name) === normalizeProductName(item.description));
      const product = (saved && productById.get(saved.product_id)) || exactName;
      if (product) return { action: "linked", productId: product.id, name: item.description, slug: productSlug(item.description), brand: product.brand, category: product.category, subcategory: product.subcategory, price: item.unitCost };
      return { action: "created", name: item.description, slug: productSlug(item.description), brand: "SOS.3D", category: categories[0]?.slug ?? "filamentos", subcategory: "", price: item.unitCost };
    });
  }

  async function loadFiles(files: FileList | null) {
    if (!files?.length) return;
    setReading(true);
    const loaded: Draft[] = [];
    for (const file of Array.from(files)) {
      try {
        const invoice = parseNfeXml(await file.text());
        if (processedKeys.includes(invoice.accessKey)) {
          toast.error(`${file.name}: esta NF-e já foi processada.`);
          continue;
        }
        loaded.push({ id: `${invoice.accessKey}-${Date.now()}`, fileName: file.name, invoice, decisions: suggest(invoice) });
      } catch (error) {
        toast.error(`${file.name}: ${error instanceof Error ? error.message : "Falha ao ler XML."}`);
      }
    }
    if (loaded.length) {
      setDrafts((current) => [...current, ...loaded]);
      setActiveId((current) => current || loaded[0].id);
      toast.success(`${loaded.length} NF-e(s) carregada(s) para conferência.`);
    }
    setReading(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  function updateDecision(index: number, patch: Partial<ItemDecision>) {
    if (!active) return;
    setDrafts((current) => current.map((draft) => draft.id === active.id ? { ...draft, decisions: draft.decisions.map((decision, i) => i === index ? { ...decision, ...patch } : decision) } : draft));
  }

  const mutation = useMutation({
    mutationFn: async (draft: Draft) => processNfeStockEntry({ data: {
      invoice: draft.invoice,
      items: draft.invoice.items.map((item, index) => {
        const decision = draft.decisions[index];
        return {
          supplierCode: item.supplierCode,
          ean: item.ean,
          description: item.description,
          quantity: item.quantity,
          unitCost: item.unitCost,
          totalCost: item.totalCost,
          action: decision.action,
          productId: decision.action === "linked" ? decision.productId : undefined,
          newProduct: decision.action === "created" ? { slug: decision.slug, name: decision.name, brand: decision.brand, category: decision.category, subcategory: decision.subcategory, price: decision.price } : undefined,
        };
      }),
    } }),
    onSuccess: (_, draft) => {
      toast.success(`NF-e ${draft.invoice.number} processada. Estoques atualizados.`);
      const remaining = drafts.filter((item) => item.id !== draft.id);
      setDrafts(remaining);
      setActiveId(remaining[0]?.id ?? "");
      queryClient.invalidateQueries({ queryKey: ["supplier-product-links"] });
      queryClient.invalidateQueries({ queryKey: ["stock-entry-keys"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      onImported?.();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Não foi possível processar a NF-e."),
  });

  const invalid = active?.decisions.some((decision) => decision.action === "linked" ? !decision.productId : decision.action === "created" ? !decision.name || !decision.slug || !decision.category || decision.price < 0 : false);
  const affected = active?.decisions.filter((decision) => decision.action !== "ignored").length ?? 0;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2"><FileCode2 className="size-5 text-tech" /><h2 className="text-xl font-bold">Entrada de estoque por NF-e</h2></div>
            <p className="mt-2 text-sm text-muted-foreground">Envie um ou mais XMLs, confira os vínculos e confirme para somar as quantidades ao estoque.</p>
          </div>
          <input ref={inputRef} type="file" accept=".xml,text/xml,application/xml" multiple className="hidden" onChange={(event) => loadFiles(event.target.files)} />
          <Button variant="cta" onClick={() => inputRef.current?.click()} disabled={reading}>
            {reading ? <Loader2 className="animate-spin" /> : <Upload />} Selecionar XMLs
          </Button>
        </div>
      </div>

      {!active && <Alert><PackagePlus /><AlertTitle>Nenhuma nota carregada</AlertTitle><AlertDescription>Escolha os arquivos XML autorizados das notas de entrada para começar.</AlertDescription></Alert>}

      {drafts.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {drafts.map((draft) => <Button key={draft.id} variant={draft.id === active?.id ? "default" : "outline"} className="shrink-0" onClick={() => setActiveId(draft.id)}>NF {draft.invoice.number}<Badge variant="secondary" className="ml-2">{draft.invoice.items.length}</Badge></Button>)}
        </div>
      )}

      {active && (
        <>
          <section className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-start justify-between gap-4">
              <div><p className="font-semibold">NF-e {active.invoice.number} · Série {active.invoice.series}</p><p className="mt-1 text-sm text-muted-foreground">{active.invoice.supplierName} · {active.invoice.supplierDocument}</p><p className="mt-1 text-xs text-muted-foreground break-all">Chave: {active.invoice.accessKey}</p></div>
              <Button size="icon" variant="ghost" aria-label="Remover arquivo" onClick={() => { const remaining = drafts.filter((draft) => draft.id !== active.id); setDrafts(remaining); setActiveId(remaining[0]?.id ?? ""); }}><X /></Button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2"><Badge variant="outline">{active.invoice.items.length} itens</Badge><Badge variant="outline">Total {money(active.invoice.totalAmount)}</Badge><Badge variant="outline">{affected} afetarão o estoque</Badge></div>
          </section>

          <div className="rounded-2xl border border-border bg-card">
            <Table>
              <TableHeader><TableRow><TableHead className="min-w-64">Item da nota</TableHead><TableHead>Qtd.</TableHead><TableHead>Custo</TableHead><TableHead className="min-w-72">Destino</TableHead><TableHead>Estoque</TableHead></TableRow></TableHeader>
              <TableBody>
                {active.invoice.items.map((item, index) => {
                  const decision = active.decisions[index];
                  const linked = decision.productId ? productById.get(decision.productId) : undefined;
                  return <TableRow key={`${item.line}-${item.supplierCode}`}>
                    <TableCell><p className="font-medium">{item.description}</p><p className="mt-1 text-xs text-muted-foreground">Cód. {item.supplierCode}{item.ean ? ` · EAN ${item.ean}` : " · Sem GTIN"}</p></TableCell>
                    <TableCell className="font-semibold">+{item.quantity}</TableCell>
                    <TableCell>{money(item.unitCost)}</TableCell>
                    <TableCell>
                      <Select value={decision.action} onValueChange={(value: Action) => updateDecision(index, { action: value, productId: value === "linked" ? decision.productId : undefined })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="linked">Vincular existente</SelectItem><SelectItem value="created">Cadastrar novo</SelectItem><SelectItem value="ignored">Ignorar item</SelectItem></SelectContent></Select>
                      {decision.action === "linked" && <Select value={decision.productId ?? ""} onValueChange={(productId) => updateDecision(index, { productId })}><SelectTrigger className="mt-2"><SelectValue placeholder="Escolha o produto" /></SelectTrigger><SelectContent>{products.map((product) => <SelectItem key={product.id} value={product.id}>{product.name} · estoque {product.stock}</SelectItem>)}</SelectContent></Select>}
                      {decision.action === "created" && <div className="mt-2 grid gap-2">
                        <Input value={decision.name} onChange={(event) => updateDecision(index, { name: event.target.value, slug: productSlug(event.target.value) })} placeholder="Nome do produto" />
                        <div className="grid grid-cols-2 gap-2"><Input value={decision.brand} onChange={(event) => updateDecision(index, { brand: event.target.value })} placeholder="Marca" /><Input type="number" min="0" step="0.01" value={decision.price} onChange={(event) => updateDecision(index, { price: Number(event.target.value) })} placeholder="Preço de venda" /></div>
                        <div className="grid grid-cols-2 gap-2"><Select value={decision.category} onValueChange={(category) => updateDecision(index, { category, subcategory: "" })}><SelectTrigger><SelectValue placeholder="Categoria" /></SelectTrigger><SelectContent>{categories.map((category) => <SelectItem key={category.slug} value={category.slug}>{category.name}</SelectItem>)}</SelectContent></Select><Select value={decision.subcategory || "none"} onValueChange={(subcategory) => updateDecision(index, { subcategory: subcategory === "none" ? "" : subcategory })}><SelectTrigger><SelectValue placeholder="Subcategoria" /></SelectTrigger><SelectContent><SelectItem value="none">Sem subcategoria</SelectItem>{subcategories.filter((sub) => sub.category_slug === decision.category).map((sub) => <SelectItem key={sub.id} value={sub.slug}>{sub.name}</SelectItem>)}</SelectContent></Select></div>
                      </div>}
                    </TableCell>
                    <TableCell>{decision.action === "ignored" ? <span className="text-muted-foreground">Sem alteração</span> : linked ? <span>{linked.stock} → <strong>{linked.stock + Math.round(item.quantity)}</strong></span> : <span>0 → <strong>{Math.round(item.quantity)}</strong></span>}</TableCell>
                  </TableRow>;
                })}
              </TableBody>
            </Table>
          </div>

          {invalid && <Alert variant="destructive"><AlertCircle /><AlertTitle>Há itens incompletos</AlertTitle><AlertDescription>Selecione o produto existente ou preencha todos os dados obrigatórios do novo produto.</AlertDescription></Alert>}
          <div className="flex justify-end"><Button size="lg" variant="cta" disabled={Boolean(invalid) || mutation.isPending || affected === 0} onClick={() => mutation.mutate(active)}>{mutation.isPending ? <Loader2 className="animate-spin" /> : <CheckCircle2 />} Confirmar entrada e atualizar estoque</Button></div>
        </>
      )}
    </div>
  );
}
