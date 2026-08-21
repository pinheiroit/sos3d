import { queryOptions, useQuery } from "@tanstack/react-query";
import { listCategories, type CategoryRow } from "@/lib/categories.functions";

export const defaultCategories: CategoryRow[] = [
  {
    id: "impressoras",
    slug: "impressoras",
    name: "Impressoras 3D",
    description: "",
    sort_order: 1,
    active: true,
  },
  {
    id: "filamentos",
    slug: "filamentos",
    name: "Filamentos e insumos",
    description: "",
    sort_order: 2,
    active: true,
  },
  {
    id: "acessorios",
    slug: "acessorios",
    name: "Peças e acessórios",
    description: "",
    sort_order: 3,
    active: true,
  },
];

export const categoriesQueryOptions = queryOptions({
  queryKey: ["categories"],
  queryFn: () => listCategories(),
  staleTime: 60_000,
});

export function useCategories() {
  const { data, isLoading } = useQuery(categoriesQueryOptions);
  const categories = data && data.length > 0 ? data : defaultCategories;
  const labelOf = (slug: string) => categories.find((c) => c.slug === slug)?.name ?? slug;
  return { categories, labelOf, isLoading };
}

export type { CategoryRow };
