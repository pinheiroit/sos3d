import { queryOptions, useQuery } from "@tanstack/react-query";
import { listProducts } from "@/lib/catalog.functions";
import type { Product } from "@/lib/catalog";

export const productsQueryOptions = queryOptions({
  queryKey: ["products"],
  queryFn: () => listProducts(),
  staleTime: 60_000,
});

export function useProducts(): { products: Product[]; isLoading: boolean } {
  const { data, isLoading } = useQuery(productsQueryOptions);
  return { products: data ?? [], isLoading };
}
