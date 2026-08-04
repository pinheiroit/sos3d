import { createFileRoute } from "@tanstack/react-router";
import { CatalogView } from "@/components/site/CatalogView";

export const Route = createFileRoute("/filamentos")({
  head: () => ({
    meta: [
      { title: "Filamentos e insumos para impressão 3D | SOS.3D" },
      {
        name: "description",
        content:
          "PLA, PETG, ABS, nylon com fibra de carbono e insumos selecionados para qualidade, repetibilidade e acabamento consistente.",
      },
      { property: "og:title", content: "Filamentos e insumos | SOS.3D" },
      {
        property: "og:description",
        content: "Materiais selecionados, com orientação de parâmetros e secagem para cada aplicação.",
      },
    ],
  }),
  component: () => (
    <CatalogView
      fixedCategory="filamentos"
      title="Filamentos e insumos"
      description="Materiais selecionados por consistência entre lotes. Cada ficha traz parâmetros recomendados de bico, mesa e secagem para você produzir com repetibilidade."
    />
  ),
});
