import type { Product } from "@/lib/catalog";

export type ProductColor = {
  key: string;
  label: string;
  swatchClass: string;
  terms: string[];
};

export const productColors: ProductColor[] = [
  { key: "amarelo", label: "Amarelo", swatchClass: "bg-color-yellow", terms: ["amarelo"] },
  { key: "azul", label: "Azul", swatchClass: "bg-color-blue", terms: ["azul", "blue"] },
  { key: "bege", label: "Bege", swatchClass: "bg-color-beige", terms: ["bege", "caucasiano"] },
  { key: "branco", label: "Branco", swatchClass: "bg-color-white", terms: ["branco", "off white", "gesso"] },
  { key: "bronze", label: "Bronze", swatchClass: "bg-color-bronze", terms: ["bronze"] },
  { key: "cinza", label: "Cinza", swatchClass: "bg-color-gray", terms: ["cinza", "fossil", "fóssil"] },
  { key: "dourado", label: "Dourado", swatchClass: "bg-color-gold", terms: ["dourado"] },
  { key: "laranja", label: "Laranja", swatchClass: "bg-color-orange", terms: ["laranja"] },
  { key: "marrom", label: "Marrom", swatchClass: "bg-color-brown", terms: ["marrom", "terra"] },
  { key: "prata", label: "Prata", swatchClass: "bg-color-silver", terms: ["prata"] },
  { key: "preto", label: "Preto", swatchClass: "bg-color-black", terms: ["preto"] },
  { key: "rosa", label: "Rosa", swatchClass: "bg-color-pink", terms: ["rosa", "sakura"] },
  { key: "verde", label: "Verde", swatchClass: "bg-color-green", terms: ["verde", "oliva"] },
  { key: "vermelho", label: "Vermelho", swatchClass: "bg-color-red", terms: ["vermelho", "marsala"] },
];

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function colorsOfProduct(product: Product): string[] {
  const searchable = normalize(`${product.name} ${product.subtitle} ${product.description}`);
  return productColors
    .filter((color) => color.terms.some((term) => searchable.includes(normalize(term))))
    .map((color) => color.key);
}

export function colorsOfProducts(products: Product[]): ProductColor[] {
  const used = new Set(products.flatMap(colorsOfProduct));
  return productColors.filter((color) => used.has(color.key));
}