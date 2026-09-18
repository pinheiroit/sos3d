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
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ProductCard } from "@/components/site/ProductCard";
import { brandsOf, formatBRL, type Category } from "@/lib/catalog";
import { colorsOfProduct, colorsOfProducts } from "@/lib/product-colors";
import { useProducts } from "@/lib/products";
import { useCategories } from "@/lib/categories";
import { useSubcategories } from "@/lib/subcategories";

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
  const { all: allSubcategories } = useSubcategories();
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
  const [subcategories, setSubcategories] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [priceCap, setPriceCap] = useState(maxPrice);
  const [sort, setSort] = useState("relevancia");
  const [filtersOpen, setFiltersOpen] = useState(false);

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
      const matchesSub = subcategories.length === 0 || subcategories.includes(p.subcategory);
      const matchesColor =
        selectedColors.length === 0 || colorsOfProduct(p).some((color) => selectedColors.includes(color));
      return matchesQuery && matchesBrand && matchesCat && matchesSub && matchesColor && p.price <= priceCap;
    });

    if (sort === "menor") return [...list].sort((a, b) => a.price - b.price);
    if (sort === "maior") return [...list].sort((a, b) => b.price - a.price);
    if (sort === "nome") return [...list].sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [base, query, selectedBrands, categories, subcategories, selectedColors, priceCap, sort]);

  // Subcategorias exibidas: da categoria fixa da página ou das categorias marcadas.
  const scopeCategories = fixedCategory ? [fixedCategory] : categories;
  const visibleSubcategories = useMemo(() => {
    const inScope =
      scopeCategories.length === 0
        ? allSubcategories
        : allSubcategories.filter((s) => scopeCategories.includes(s.category_slug));
    const used = new Set(base.map((p) => p.subcategory).filter(Boolean));
    return inScope.filter((s) => used.has(s.slug));
  }, [allSubcategories, base, scopeCategories.join(",")]);

  const availableBrands = brandsOf(base);
  const availableColors = useMemo(() => colorsOfProducts(base), [base]);

  function toggle<T>(value: T, list: T[], set: (v: T[]) => void) {
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  const clearAll = () => {
    setQuery("");
    setSelectedBrands([]);
    setCategories([]);
    setSubcategories([]);
    setSelectedColors([]);
    setPriceCap(maxPrice);
    setSort("relevancia");
  };

  const activeFilterCount =
    (query.trim() ? 1 : 0) +
    selectedBrands.length +
    categories.length +
    subcategories.length +
    selectedColors.length +
    (priceCap < maxPrice ? 1 : 0);

  const renderFilters = (idPrefix: string) => (
    <div className="space-y-6">
      <div>
        <Label htmlFor={`${idPrefix}-busca`} className="text-xs font-semibold uppercase tracking-wide">
          Buscar
        </Label>
        <Input
          id={`${idPrefix}-busca`}
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
              <label key={cat.slug} className="flex cursor-pointer items-center gap-2.5 text-sm">
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

      {visibleSubcategories.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide">Subcategoria</p>
          <div className="mt-3 space-y-2.5">
            {visibleSubcategories.map((sub) => (
              <label key={sub.id} className="flex cursor-pointer items-center gap-2.5 text-sm">
                <Checkbox
                  checked={subcategories.includes(sub.slug)}
                  onCheckedChange={() => toggle(sub.slug, subcategories, setSubcategories)}
                />
                {sub.name}
              </label>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide">Marca</p>
        <div className="mt-3 space-y-2.5">
          {availableBrands.map((brand) => (
            <label key={brand} className="flex cursor-pointer items-center gap-2.5 text-sm">
              <Checkbox
                checked={selectedBrands.includes(brand)}
                onCheckedChange={() => toggle(brand, selectedBrands, setSelectedBrands)}
              />
              {brand}
            </label>
          ))}
        </div>
      </div>

      {availableColors.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide">Cor</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {availableColors.map((color) => {
              const selected = selectedColors.includes(color.key);
              return (
                <Button
                  key={color.key}
                  type="button"
                  variant={selected ? "secondary" : "ghost"}
                  className="h-9 justify-start gap-2 px-2 text-xs"
                  aria-pressed={selected}
                  onClick={() => toggle(color.key, selectedColors, setSelectedColors)}
                >
                  <span
                    aria-hidden="true"
                    className={`size-4 shrink-0 rounded-full border border-border shadow-sm ${color.swatchClass}`}
                  />
                  {color.label}
                </Button>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide">Investimento até</p>
        <Slider
          className="mt-4"
          value={[priceCap]}
          min={100}
          max={maxPrice}
          step={100}
          onValueChange={(value) => setPriceCap(value[0] ?? maxPrice)}
        />
        <p className="mt-2 text-sm font-medium text-tech">{formatBRL(priceCap)}</p>
      </div>
    </div>
  );

  return (
    <div className="container-page py-8 md:py-12">
      <header className="max-w-2xl">
        <span className="eyebrow">Loja SOS.3D</span>
        {embedded ? (
          <h2 className="mt-2 text-2xl font-bold md:text-4xl">{title}</h2>
        ) : (
          <h1 className="mt-2 text-3xl font-bold md:text-5xl">{title}</h1>
        )}
        <p className="mt-3 text-sm text-muted-foreground md:mt-4 md:text-lg">{description}</p>
      </header>

      <div className="mt-6 grid gap-8 md:mt-10 lg:grid-cols-[260px_1fr]">
        <aside className="hidden h-fit rounded-xl border border-border bg-card p-5 lg:sticky lg:top-28 lg:block">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <SlidersHorizontal className="size-4 text-tech" /> Filtros
            </h2>
            <Button variant="link" className="h-auto p-0 text-xs" onClick={clearAll}>
              Limpar
            </Button>
          </div>

          <div className="mt-5">{renderFilters("desktop")}</div>
        </aside>

        <section className="min-w-0">
          <div className="sticky top-[132px] z-30 -mx-5 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2 border-y border-border bg-background/95 px-5 py-2 backdrop-blur lg:static lg:mx-0 lg:flex lg:border-0 lg:bg-transparent lg:px-0 lg:py-0">
            <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" className="relative h-10 px-3 lg:hidden">
                  <SlidersHorizontal /> Filtros
                  {activeFilterCount > 0 && (
                    <span className="grid size-5 place-items-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground">
                      {activeFilterCount}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="flex h-[85dvh] w-full flex-col gap-0 rounded-t-xl p-0">
                <SheetHeader className="border-b border-border px-5 py-4 text-left">
                  <SheetTitle>Filtrar produtos</SheetTitle>
                  <SheetDescription>{results.length} produtos encontrados</SheetDescription>
                </SheetHeader>
                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{renderFilters("mobile")}</div>
                <SheetFooter className="grid grid-cols-2 gap-2 border-t border-border bg-background p-4">
                  <Button variant="outline" onClick={clearAll}>Limpar</Button>
                  <SheetClose asChild>
                    <Button variant="cta">Ver {results.length} produtos</Button>
                  </SheetClose>
                </SheetFooter>
              </SheetContent>
            </Sheet>

            <p className="text-sm text-muted-foreground">
              {results.length} {results.length === 1 ? "produto encontrado" : "produtos encontrados"}
            </p>
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="col-span-2 w-full lg:col-span-1 lg:ml-auto lg:w-56">
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
            <div className="mt-4 grid grid-cols-2 gap-3 sm:mt-6 sm:gap-6 xl:grid-cols-3">
              {isLoading && base.length === 0
                ? Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-[330px] animate-pulse rounded-xl border border-border bg-secondary sm:h-[430px]" />
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
