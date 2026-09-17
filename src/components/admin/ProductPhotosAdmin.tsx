import { useMemo, useState } from "react";
import { ExternalLink, ImageIcon, Loader2, Search, SearchCheck } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImageUploader } from "@/components/site/ImageUploader";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { findProductImages, importProductImage, updateProductImage } from "@/lib/admin.functions";

type PhotoProduct = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  category: string;
  subcategory: string;
  image_url: string | null;
  active: boolean;
};

type Props = {
  products: PhotoProduct[];
  onUpdated: () => void;
};

type WebImage = {
  title: string;
  imageUrl: string;
  thumbnailUrl: string;
  sourceUrl: string;
};

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
}

export function ProductPhotosAdmin({ products, onUpdated }: Props) {
  const [search, setSearch] = useState("");
  const [view, setView] = useState("missing");
  const [brand, setBrand] = useState("all");
  const [savingIds, setSavingIds] = useState<string[]>([]);
  const [webProduct, setWebProduct] = useState<PhotoProduct | null>(null);
  const [webQuery, setWebQuery] = useState("");
  const [webResults, setWebResults] = useState<WebImage[]>([]);
  const [searchingWeb, setSearchingWeb] = useState(false);
  const [importingUrl, setImportingUrl] = useState<string | null>(null);

  const missingCount = products.filter((product) => !product.image_url).length;
  const brands = useMemo(
    () => Array.from(new Set(products.map((product) => product.brand).filter(Boolean))).sort(),
    [products],
  );
  const filtered = useMemo(() => {
    const term = normalize(search.trim());
    return products.filter((product) => {
      if (view === "missing" && product.image_url) return false;
      if (view === "with-photo" && !product.image_url) return false;
      if (brand !== "all" && product.brand !== brand) return false;
      if (!term) return true;
      return normalize(
        `${product.name} ${product.slug} ${product.brand} ${product.category} ${product.subcategory}`,
      ).includes(term);
    });
  }, [brand, products, search, view]);

  async function saveImage(product: PhotoProduct, imageUrl: string | null) {
    setSavingIds((current) => [...current, product.id]);
    try {
      await updateProductImage({ data: { id: product.id, imageUrl } } as never);
      toast.success(imageUrl ? "Foto vinculada ao produto" : "Foto removida");
      onUpdated();
    } catch (error) {
      toast.error("Não foi possível atualizar a foto", { description: (error as Error).message });
    } finally {
      setSavingIds((current) => current.filter((id) => id !== product.id));
    }
  }

  function openWebSearch(product: PhotoProduct) {
    const suggestedQuery = `${product.name} ${product.brand}`.trim();
    setWebProduct(product);
    setWebQuery(suggestedQuery);
    setWebResults([]);
  }

  async function searchWeb() {
    if (!webQuery.trim()) return;
    setSearchingWeb(true);
    try {
      const response = await findProductImages({ data: { query: webQuery.trim() } } as never);
      const results = (response as { results: WebImage[] }).results;
      setWebResults(results);
      if (results.length === 0) toast.info("Nenhuma imagem encontrada. Tente ajustar o nome.");
    } catch (error) {
      toast.error("Não foi possível pesquisar as imagens", { description: (error as Error).message });
    } finally {
      setSearchingWeb(false);
    }
  }

  async function useWebImage(image: WebImage) {
    if (!webProduct) return;
    setImportingUrl(image.imageUrl);
    try {
      await importProductImage({
        data: { id: webProduct.id, query: webQuery.trim(), imageUrl: image.imageUrl },
      } as never);
      toast.success("Foto da internet vinculada ao produto");
      setWebProduct(null);
      setWebResults([]);
      onUpdated();
    } catch (error) {
      toast.error("Não foi possível usar esta foto", { description: (error as Error).message });
    } finally {
      setImportingUrl(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Fotos dos produtos</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {missingCount === 0
              ? "Todos os produtos já possuem foto."
              : `${missingCount} produto${missingCount === 1 ? "" : "s"} aguardando foto.`}
          </p>
        </div>
        <Badge variant={missingCount ? "destructive" : "secondary"}>
          {missingCount} pendente{missingCount === 1 ? "" : "s"}
        </Badge>
      </div>

      <div className="grid gap-3 rounded-lg border border-border bg-card p-4 md:grid-cols-[minmax(0,1fr)_220px_220px]">
        <div>
          <Label htmlFor="photo-product-search" className="text-xs">Buscar produto</Label>
          <div className="relative mt-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="photo-product-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nome, código, categoria..."
              className="pl-9"
            />
          </div>
        </div>
        <div>
          <Label className="text-xs">Fotos</Label>
          <Select value={view} onValueChange={setView}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="missing">Sem foto</SelectItem>
              <SelectItem value="with-photo">Com foto</SelectItem>
              <SelectItem value="all">Todos</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Marca</Label>
          <Select value={brand} onValueChange={setBrand}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as marcas</SelectItem>
              {brands.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">{filtered.length} produto{filtered.length === 1 ? "" : "s"} nesta lista</p>

      {filtered.length === 0 ? (
        <div className="grid min-h-48 place-items-center rounded-lg border border-dashed border-border p-8 text-center">
          <div>
            <ImageIcon className="mx-auto size-8 text-muted-foreground" />
            <p className="mt-3 font-medium">Nenhum produto encontrado</p>
            <p className="mt-1 text-sm text-muted-foreground">Altere a busca ou os filtros acima.</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {filtered.map((product) => {
            const saving = savingIds.includes(product.id);
            return (
              <div key={product.id} className="grid gap-4 rounded-lg border border-border bg-card p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-semibold">{product.name}</p>
                    {!product.active && <Badge variant="secondary">Inativo</Badge>}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{product.brand} · {product.category}{product.subcategory ? ` / ${product.subcategory}` : ""}</p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">Código: {product.slug}</p>
                  {saving && <p className="mt-2 text-xs font-medium text-tech">Salvando no produto...</p>}
                </div>
                <div className="flex flex-col items-start gap-2 sm:items-end">
                  <ImageUploader
                    value={product.image_url}
                    label={product.image_url ? "Trocar foto" : "Do computador"}
                    onChange={(url) => void saveImage(product, url)}
                  />
                  <Button type="button" variant="outline" size="sm" onClick={() => openWebSearch(product)}>
                    <SearchCheck /> Buscar na internet
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={Boolean(webProduct)} onOpenChange={(open) => !open && setWebProduct(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Buscar foto do produto</DialogTitle>
            <DialogDescription>
              Confira se a foto corresponde exatamente ao produto antes de selecionar.
            </DialogDescription>
          </DialogHeader>
          <form
            className="flex flex-col gap-2 sm:flex-row"
            onSubmit={(event) => {
              event.preventDefault();
              void searchWeb();
            }}
          >
            <Input
              value={webQuery}
              onChange={(event) => setWebQuery(event.target.value)}
              aria-label="Nome para pesquisar na internet"
              placeholder="Nome e marca do produto"
            />
            <Button type="submit" disabled={searchingWeb || !webQuery.trim()}>
              {searchingWeb ? <Loader2 className="animate-spin" /> : <Search />} Pesquisar
            </Button>
          </form>

          {webResults.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              {webResults.map((image) => (
                <div key={image.imageUrl} className="overflow-hidden rounded-lg border border-border bg-card">
                  <div className="aspect-square bg-secondary p-2">
                    <img
                      src={image.thumbnailUrl}
                      alt={image.title}
                      className="size-full object-contain"
                      loading="lazy"
                    />
                  </div>
                  <div className="space-y-2 p-3">
                    <p className="line-clamp-2 min-h-10 text-xs font-medium">{image.title}</p>
                    <div className="flex items-center justify-between gap-2">
                      <Button asChild type="button" variant="ghost" size="icon" title="Abrir fonte da imagem">
                        <a href={image.sourceUrl} target="_blank" rel="noreferrer">
                          <ExternalLink />
                        </a>
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        disabled={Boolean(importingUrl)}
                        onClick={() => void useWebImage(image)}
                      >
                        {importingUrl === image.imageUrl && <Loader2 className="animate-spin" />}
                        Usar foto
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}