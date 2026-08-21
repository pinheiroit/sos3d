import printer1 from "@/assets/printer-1.jpg";
import printer2 from "@/assets/printer-2.jpg";
import printer3 from "@/assets/printer-3.jpg";
import filament1 from "@/assets/filament-1.jpg";
import filament2 from "@/assets/filament-2.jpg";
import filament3 from "@/assets/filament-3.jpg";

export type Category = "impressoras" | "filamentos" | "acessorios" | (string & {});

export type Spec = { label: string; value: string };

export type Product = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  category: Category;
  subtitle: string;
  price: number;
  oldPrice?: number;
  image: string;
  imageKey: string;
  imageUrl?: string;
  badge?: string;
  stock: number;
  active: boolean;
  useCases: string[];
  description: string;
  specs: Spec[];
};

/** Rótulos de fallback; a fonte oficial é a tabela de categorias. */
export const categoryLabels: Record<string, string> = {
  impressoras: "Impressoras 3D",
  filamentos: "Filamentos e insumos",
  acessorios: "Peças e acessórios",
};

export const imageOptions = [
  { key: "printer-1", label: "Impressora 1", src: printer1 },
  { key: "printer-2", label: "Impressora 2", src: printer2 },
  { key: "printer-3", label: "Impressora 3", src: printer3 },
  { key: "filament-1", label: "Filamento 1", src: filament1 },
  { key: "filament-2", label: "Filamento 2", src: filament2 },
  { key: "filament-3", label: "Filamento 3", src: filament3 },
] as const;

export function imageFor(key: string | null | undefined, url?: string | null) {
  if (url) return url;
  return imageOptions.find((o) => o.key === key)?.src ?? printer1;
}

/** Linha crua vinda do banco (Data API). */
export type ProductRow = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  category: string;
  subtitle: string;
  description: string;
  price: number | string;
  old_price: number | string | null;
  image_key: string;
  image_url: string | null;
  badge: string | null;
  stock: number;
  active: boolean;
  use_cases: string[] | null;
  specs: unknown;
};

export function mapProduct(row: ProductRow): Product {
  const specs = Array.isArray(row.specs) ? (row.specs as Spec[]) : [];
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    brand: row.brand,
    category: (row.category as Category) ?? "acessorios",
    subtitle: row.subtitle ?? "",
    description: row.description ?? "",
    price: Number(row.price),
    ...(row.old_price != null ? { oldPrice: Number(row.old_price) } : {}),
    image: imageFor(row.image_key, row.image_url),
    imageKey: row.image_key,
    ...(row.image_url ? { imageUrl: row.image_url } : {}),
    ...(row.badge ? { badge: row.badge } : {}),
    stock: row.stock ?? 0,
    active: row.active ?? true,
    useCases: row.use_cases ?? [],
    specs,
  };
}

export function brandsOf(list: Product[]) {
  return Array.from(new Set(list.map((p) => p.brand))).sort();
}

export function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
