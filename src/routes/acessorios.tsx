import { createFileRoute } from "@tanstack/react-router";
import { CatalogView } from "@/components/site/CatalogView";

export const Route = createFileRoute("/acessorios")({
  head: () => ({
    meta: [
      { title: "Peças e acessórios para impressão 3D | SOS.3D" },
      {
        name: "description",
        content:
          "Bicos, hotends, correias, mesas, kits de manutenção e acessórios para manter sua impressora 3D produzindo com qualidade.",
      },
      { property: "og:title", content: "Peças e acessórios | SOS.3D" },
      {
        property: "og:description",
        content: "Peças de reposição, kits de manutenção e acessórios com envio para todo o Brasil.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <CatalogView
      fixedCategory="acessorios"
      title="Peças e acessórios"
      description="Reposição, upgrades e kits de manutenção para manter a produção rodando. Filtre por marca e faixa de preço para achar a peça certa."
    />
  ),
});
