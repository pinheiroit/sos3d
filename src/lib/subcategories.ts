import { queryOptions, useQuery } from "@tanstack/react-query";
import { listSubcategories, type SubcategoryRow } from "@/lib/subcategories.functions";

export const subcategoriesQueryOptions = queryOptions({
  queryKey: ["subcategories"],
  queryFn: () => listSubcategories(),
  staleTime: 60_000,
});

export function useSubcategories(categorySlug?: string) {
  const { data, isLoading } = useQuery(subcategoriesQueryOptions);
  const all = data ?? [];
  const subcategories = categorySlug ? all.filter((s) => s.category_slug === categorySlug) : all;
  const labelOf = (slug: string, category?: string) =>
    all.find((s) => s.slug === slug && (!category || s.category_slug === category))?.name ?? slug;
  const forCategories = (slugs: string[]) =>
    slugs.length === 0 ? all : all.filter((s) => slugs.includes(s.category_slug));
  return { subcategories, all, labelOf, forCategories, isLoading };
}

export type { SubcategoryRow };
