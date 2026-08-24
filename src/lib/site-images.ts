import { queryOptions, useQuery } from "@tanstack/react-query";
import { listSiteImages } from "@/lib/uploads.functions";
import heroWorkshop from "@/assets/hero-workshop.jpg";
import serviceParts from "@/assets/service-parts.jpg";
import makersImg from "@/assets/makers.jpg";

export type BannerKey = "home-hero" | "home-aplicacoes" | "impressao-3d" | "makers" | "empresa";

export const bannerDefinitions: { key: BannerKey; label: string; hint: string; fallback: string }[] =
  [
    {
      key: "home-hero",
      label: "Home — banner principal",
      hint: "Imagem grande ao lado do título na página inicial.",
      fallback: heroWorkshop,
    },
    {
      key: "home-aplicacoes",
      label: "Home — bloco de aplicações",
      hint: "Imagem da seção “Onde a manufatura aditiva gera valor”.",
      fallback: serviceParts,
    },
    {
      key: "impressao-3d",
      label: "Impressão 3D — banner",
      hint: "Imagem da página de impressão sob demanda.",
      fallback: serviceParts,
    },
    { key: "makers", label: "Área Maker — banner", hint: "Imagem da página maker.", fallback: makersImg },
    { key: "empresa", label: "Empresa — banner", hint: "Imagem da página institucional.", fallback: heroWorkshop },
  ];

export const siteImagesQueryOptions = queryOptions({
  queryKey: ["site-images"],
  queryFn: () => listSiteImages(),
  staleTime: 60_000,
});

/** Devolve a URL do banner configurado no painel ou a imagem padrão. */
export function useBanner(key: BannerKey): string {
  const { data } = useQuery(siteImagesQueryOptions);
  const fallback = bannerDefinitions.find((b) => b.key === key)?.fallback ?? heroWorkshop;
  return data?.find((i) => i.key === key)?.url ?? fallback;
}

export type LogoKey = "logo-principal" | "logo-clara";

export const logoDefinitions: { key: LogoKey; label: string; hint: string }[] = [
  {
    key: "logo-principal",
    label: "Logomarca — fundo claro",
    hint: "Usada no cabeçalho e em áreas com fundo claro.",
  },
  {
    key: "logo-clara",
    label: "Logomarca — fundo escuro",
    hint: "Versão clara usada no rodapé e faixas escuras. Se vazia, usa a principal.",
  },
];

/** URL de uma imagem do site cadastrada no painel (ou null). */
export function useSiteImage(key: string): string | null {
  const { data } = useQuery(siteImagesQueryOptions);
  return data?.find((i) => i.key === key)?.url ?? null;
}
