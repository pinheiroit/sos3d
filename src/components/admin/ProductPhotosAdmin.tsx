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
import { importProductImage, updateProductImage } from "@/lib/admin.functions";

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
  const [selectedImageUrl, setSelectedImageUrl] = useState("");
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");
  const [importingImage, setImportingImage] = useState(false);

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
    const name = product.name.trim();
    const brandAlreadyPresent = normalize(name).includes(normalize(product.brand.trim()));
    const suggestedQuery = `${name}${brandAlreadyPresent ? "" : ` ${product.brand.trim()}`}`.trim();
    setWebProduct(product);
    setWebQuery(suggestedQuery);
    setSelectedImageUrl("");
    setImagePreviewUrl("");
  }

  function searchOnGoogle() {
    if (!webQuery.trim()) return;
    const googleUrl = new URL("https://www.google.com/search");
    googleUrl.searchParams.set("q", webQuery.trim());
    googleUrl.searchParams.set("udm", "2");
    googleUrl.searchParams.set("hl", "pt-BR");
    googleUrl.searchParams.set("gl", "br");
    googleUrl.searchParams.set("safe", "active");
    window.open(googleUrl.toString(), "_blank", "noopener,noreferrer");
  }

  async function useWebImage() {
    if (!webProduct) return;
    const imageUrl = selectedImageUrl.trim();
    if (!imageUrl) return;
    setImportingImage(true);
    try {
      await importProductImage({
        data: { id: webProduct.id, imageUrl },
      } as never);
      toast.success("Foto da internet vinculada ao produto");
      setWebProduct(null);
      setSelectedImageUrl("");
      setImagePreviewUrl("");
      onUpdated();
    } catch (error) {
      toast.error("Não foi possível usar esta foto", { description: (error as Error).message });
    } finally {
      setImportingImage(false);
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
              Pesquise pelo nome exato no Google e confira a foto antes de vinculá-la.
            </DialogDescription>
          </DialogHeader>
          <form
            className="flex flex-col gap-2 sm:flex-row"
            onSubmit={(event) => {
              event.preventDefault();
              searchOnGoogle();
            }}
          >
            <Input
              value={webQuery}
              onChange={(event) => setWebQuery(event.target.value)}
              aria-label="Nome para pesquisar na internet"
              placeholder="Nome e marca do produto"
            />
            <Button type="submit" disabled={!webQuery.trim()}>
              <Search /> Pesquisar no Google
            </Button>
          </form>

          <div className="grid gap-4 border-t border-border pt-4 md:grid-cols-[minmax(0,1fr)_220px]">
            <div className="space-y-2">
              <Label htmlFor="selected-product-image">Endereço da imagem escolhida</Label>
              <Input
                id="selected-product-image"
                type="url"
                inputMode="url"
                value={selectedImageUrl}
                onChange={(event) => {
                  setSelectedImageUrl(event.target.value);
                  setImagePreviewUrl("");
                }}
                placeholder="https://site.com/foto-do-produto.jpg"
              />
              <p className="text-xs text-muted-foreground">
                No Google, abra a imagem, copie o endereço da imagem e cole aqui.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  disabled={!selectedImageUrl.trim()}
                  onClick={() => setImagePreviewUrl(selectedImageUrl.trim())}
                >
                  <ImageIcon /> Conferir foto
                </Button>
                <Button
                  type="button"
                  disabled={!imagePreviewUrl || importingImage}
                  onClick={() => void useWebImage()}
                >
                  {importingImage ? <Loader2 className="animate-spin" /> : <SearchCheck />}
                  Usar esta foto
                </Button>
              </div>
            </div>
            <div className="grid aspect-square place-items-center overflow-hidden rounded-lg border border-border bg-secondary">
              {imagePreviewUrl ? (
                <img
                  src={imagePreviewUrl}
                  alt={`Prévia para ${webProduct?.name ?? "produto"}`}
                  className="size-full object-contain"
                  onError={() => {
                    setImagePreviewUrl("");
                    toast.error("Não foi possível abrir a prévia desta imagem.");
                  }}
                />
              ) : (
                <div className="px-4 text-center text-sm text-muted-foreground">
                  <ImageIcon className="mx-auto mb-2 size-7" />
                  A prévia aparecerá aqui
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}