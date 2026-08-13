import { createFileRoute } from "@tanstack/react-router";
import { CatalogView } from "@/components/site/CatalogView";

type LojaSearch = { q?: string };

export const Route = createFileRoute("/loja")({
  validateSearch: (search: Record<string, unknown>): LojaSearch => {
    const q = search['q'];
    return typeof q === "string" && q ? { q } : {};
  },
  head: () => ({
    meta: [
      { title: "Loja SOS.3D — Impressoras 3D, filamentos e acessórios" },
      {
        name: "description",
        content:
          "Catálogo completo da SOS.3D: impressoras 3D, filamentos técnicos, peças e acessórios com filtros por marca, categoria e investimento.",
      },
      { property: "og:title", content: "Loja SOS.3D — catálogo completo" },
      {
        property: "og:description",
        content: "Compre impressoras 3D, filamentos e acessórios com curadoria e suporte técnico.",
      },
    ],
  }),
  component: Loja,
});

function Loja() {
  const { q } = Route.useSearch();
  return (
    <CatalogView
      initialQuery={q ?? ""}
      title="Catálogo completo"
      description="Equipamentos, materiais e acessórios reunidos em uma única experiência. Filtre por categoria, marca e investimento para chegar à solução certa."
    />
  );
}
