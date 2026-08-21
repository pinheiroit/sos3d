import { useMemo, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProductCard } from "@/components/site/ProductCard";
import { brandsOf, formatBRL, type Category } from "@/lib/catalog";
import { useProducts } from "@/lib/products";
import { useCategories } from "@/lib/categories";

type Props = {
  fixedCategory?: Category;
  title: string;
  description: string;
  initialQuery?: string;
  /** Renders the heading as an h2 (for use inside a page that already has an h1) */
  embedded?: boolean;
};

export function CatalogView({
  fixedCategory,
  title,
  description,
  initialQuery = "",
  embedded = false,
}: Props) {
  const { products, isLoading } = useProducts();
  const { categories: allCategories } = useCategories();
  const base = useMemo(
    () => (fixedCategory ? products.filter((p) => p.category === fixedCategory) : products),
    [fixedCategory, products],
  );
  const maxPrice = useMemo(() => (base.length ? Math.max(...base.map((p) => p.price)) : 100000), [base]);

  const [query, setQuery] = useState(initialQuery);
  const [lastInitial, setLastInitial] = useState(initialQuery);
  if (initialQuery !== lastInitial) {
    setLastInitial(initialQuery);
    setQuery(initialQuery);
  }
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [priceCap, setPriceCap] = useState(maxPrice);
  const [sort, setSort] = useState("relevancia");

  const results = useMemo(() => {
    const list = base.filter((p) => {
      const q = query.trim().toLowerCase();
      const matchesQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.subtitle.toLowerCase().includes(q);
      const matchesBrand = selectedBrands.length === 0 || selectedBrands.includes(p.brand);
      const matchesCat = categories.length === 0 || categories.includes(p.category);
      return matchesQuery && matchesBrand && matchesCat && p.price <= priceCap;
    });

    if (sort === "menor") return [...list].sort((a, b) => a.price - b.price);
    if (sort === "maior") return [...list].sort((a, b) => b.price - a.price);
    if (sort === "nome") return [...list].sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [base, query, selectedBrands, categories, priceCap, sort]);

  const availableBrands = brandsOf(base);

  function toggle<T>(value: T, list: T[], set: (v: T[]) => void) {
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  const clearAll = () => {
    setQuery("");
    setSelectedBrands([]);
    setCategories([]);
    setPriceCap(maxPrice);
    setSort("relevancia");
  };

  return (
    <div className="container-page py-12">
      <header className="max-w-2xl">
        <span className="eyebrow">Loja SOS.3D</span>
        {embedded ? (
          <h2 className="mt-2 text-3xl font-bold md:text-4xl">{title}</h2>
        ) : (
          <h1 className="mt-2 text-4xl font-bold md:text-5xl">{title}</h1>
        )}
        <p className="mt-4 text-lg text-muted-foreground">{description}</p>
      </header>

      <div className="mt-10 grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside className="h-fit rounded-xl border border-border bg-card p-5 lg:sticky lg:top-28">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <SlidersHorizontal className="size-4 text-tech" /> Filtros
            </h2>
            <Button variant="link" className="h-auto p-0 text-xs" onClick={clearAll}>
              Limpar
            </Button>
          </div>

          <div className="mt-5 space-y-6">
            <div>
              <Label htmlFor="busca" className="text-xs font-semibold uppercase tracking-wide">
                Buscar
              </Label>
              <Input
                id="busca"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Modelo, marca ou aplicação"
                className="mt-2"
              />
            </div>

            {!fixedCategory && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide">Categoria</p>
                <div className="mt-3 space-y-2.5">
                  {allCategories.map((cat) => (
                    <label
                      key={cat.slug}
                      className="flex cursor-pointer items-center gap-2.5 text-sm"
                    >
                      <Checkbox
                        checked={categories.includes(cat.slug)}
                        onCheckedChange={() => toggle(cat.slug, categories, setCategories)}
                      />
                      {cat.name}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide">Marca</p>
              <div className="mt-3 space-y-2.5">
                {availableBrands.map((b) => (
                  <label key={b} className="flex cursor-pointer items-center gap-2.5 text-sm">
                    <Checkbox
                      checked={selectedBrands.includes(b)}
                      onCheckedChange={() => toggle(b, selectedBrands, setSelectedBrands)}
                    />
                    {b}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide">Investimento até</p>
              <Slider
                className="mt-4"
                value={[priceCap]}
                min={100}
                max={maxPrice}
                step={100}
                onValueChange={(v) => setPriceCap(v[0] ?? maxPrice)}
              />
              <p className="mt-2 text-sm font-medium text-tech">{formatBRL(priceCap)}</p>
            </div>
          </div>
        </aside>

        <section>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {results.length} {results.length === 1 ? "produto encontrado" : "produtos encontrados"}
            </p>
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Ordenar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relevancia">Ordenar por relevância</SelectItem>
                <SelectItem value="menor">Menor preço</SelectItem>
                <SelectItem value="maior">Maior preço</SelectItem>
                <SelectItem value="nome">Nome (A–Z)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {results.length === 0 ? (
            <div className="mt-10 rounded-xl border border-dashed border-border p-12 text-center">
              <p className="font-semibold">Nenhum produto com esses filtros.</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Ajuste os filtros ou fale com um especialista para uma indicação sob medida.
              </p>
              <Button variant="cta" className="mt-5" onClick={clearAll}>
                Limpar filtros
              </Button>
            </div>
          ) : (
            <div className="mt-6 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {isLoading && base.length === 0
                ? Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-[430px] animate-pulse rounded-xl border border-border bg-secondary" />
                  ))
                : null}
              {results.map((p) => (
                <ProductCard key={p.slug + p.name} product={p} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
