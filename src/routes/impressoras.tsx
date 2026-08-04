import { createFileRoute } from "@tanstack/react-router";
import { CatalogView } from "@/components/site/CatalogView";

export const Route = createFileRoute("/impressoras")({
  head: () => ({
    meta: [
      { title: "Impressoras 3D — venda com consultoria | SOS.3D" },
      {
        name: "description",
        content:
          "Impressoras 3D FDM, multifuncionais e industriais para prototipagem, produção, educação e engenharia, com implantação e treinamento.",
      },
      { property: "og:title", content: "Impressoras 3D | SOS.3D" },
      {
        property: "og:description",
        content: "Da impressora de bancada à industrial, com indicação técnica pela sua aplicação.",
      },
    ],
  }),
  component: () => (
    <CatalogView
      fixedCategory="impressoras"
      title="Impressoras 3D"
      description="Da bancada à produção industrial. Indicamos o equipamento a partir da sua aplicação, material, volume de produção e nível de experiência da equipe."
    />
  ),
});
