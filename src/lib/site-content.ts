import { queryOptions, useQuery } from "@tanstack/react-query";
import { getSiteContent, type FooterContent } from "@/lib/site-content.functions";

export type PartnerBrand = {
  id: string;
  name: string;
  logo_url: string | null;
  website_url: string | null;
};

export const defaultFooter: FooterContent = {
  tagline:
    "Da ideia à peça pronta. Equipamentos de manufatura aditiva, soluções a laser, materiais e suporte técnico para empresas, escolas, profissionais e makers.",
  phone: "(68) 9 9948-4082",
  email: "contato@sos3d.com.br",
  address: "Impressoras a pronta entrega em Rio Branco/AC",
  legal: "Marcas de terceiros exibidas conforme os guias oficiais de cada fornecedor.",
  copyright: "SOS.3D — Tecnologia em manufatura aditiva, laser e design.",
  columns: [
    {
      title: "Produtos",
      links: [
        { to: "/impressoras", label: "Impressoras 3D" },
        { to: "/filamentos", label: "Filamentos e insumos" },
        { to: "/loja", label: "Peças e acessórios" },
      ],
    },
    {
      title: "Serviços",
      links: [
        { to: "/impressao-3d", label: "Impressão sob demanda" },
        { to: "/suporte", label: "Implantação e treinamento" },
      ],
    },
    {
      title: "Institucional",
      links: [
        { to: "/empresa", label: "Quem somos" },
        { to: "/makers", label: "Área Maker" },
        { to: "/contato", label: "Contato" },
      ],
    },
  ],
};

export const siteContentQueryOptions = queryOptions({
  queryKey: ["site-content"],
  queryFn: () => getSiteContent(),
  staleTime: 60_000,
});

export function useSiteContent() {
  const { data } = useQuery(siteContentQueryOptions);
  return {
    footer: (data?.footer ?? defaultFooter) as FooterContent,
    brands: (data?.brands ?? []) as PartnerBrand[],
    debug: (data as { debug?: string } | undefined)?.debug,
  };
}

export type { FooterContent };
