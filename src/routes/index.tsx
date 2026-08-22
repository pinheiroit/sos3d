import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Boxes, Layers, Printer, Scan, Tag, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BenefitsStrip } from "@/components/site/BenefitsStrip";
import { CatalogView } from "@/components/site/CatalogView";
import { CtaBand } from "@/components/site/CtaBand";
import { useBanner } from "@/lib/site-images";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SOS.3D — Loja de impressoras 3D, filamentos e acessórios" },
      {
        name: "description",
        content:
          "Compre impressoras 3D, filamentos técnicos e acessórios com 12x sem juros, 5% off no Pix, garantia e suporte técnico especializado.",
      },
      { property: "og:title", content: "SOS.3D — Loja de impressão 3D" },
      {
        property: "og:description",
        content:
          "Impressoras 3D, filamentos e acessórios com envio para todo o Brasil, parcelamento e suporte técnico real.",
      },
    ],
  }),
  component: Index,
});

const atalhos = [
  { icon: Printer, label: "Impressoras 3D", to: "/impressoras" as const },
  { icon: Layers, label: "Filamentos", to: "/filamentos" as const },
  { icon: Wrench, label: "Peças e acessórios", to: "/loja" as const },
  { icon: Scan, label: "Impressão sob demanda", to: "/impressao-3d" as const },
  { icon: Boxes, label: "Área Maker", to: "/portal" as const },
  { icon: Tag, label: "Ofertas", to: "/loja" as const },
];

function Index() {
  const hero = useBanner("home-hero");
  const serviceParts = useBanner("home-aplicacoes");


  return (
    <>
      {/* Atalhos de categoria */}
      <section className="container-page pt-6">
        <div className="grid grid-cols-3 gap-4 md:grid-cols-6">
          {atalhos.map((a) => (
            <Link
              key={a.label}
              to={a.to}
              className="group flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-4 text-center transition-colors hover:border-tech"
            >
              <span className="grid size-12 place-items-center rounded-full bg-secondary text-tech transition-colors group-hover:bg-tech group-hover:text-tech-foreground">
                <a.icon className="size-5" />
              </span>
              <span className="text-xs font-semibold leading-tight">{a.label}</span>
            </Link>
          ))}
        </div>
      </section>

      <BenefitsStrip />

      <CatalogView
        embedded
        title="Catálogo completo"
        description="Todos os produtos em um só lugar. Use os filtros para encontrar impressoras, filamentos e acessórios do seu jeito."
      />

      {/* Bloco institucional com foto — mais abaixo */}
      <section className="container-page py-14">
        <div className="surface-brand grid-tech relative overflow-hidden rounded-2xl">
          <div className="grid items-center gap-6 p-8 md:grid-cols-2 md:p-12">
            <div>
              <span className="inline-flex rounded-full bg-accent px-3 py-1 text-xs font-bold uppercase tracking-wider text-accent-foreground">
                SOS.3D
              </span>
              <h2 className="mt-5 text-3xl font-extrabold leading-tight text-white md:text-4xl">
                Impressoras 3D e filamentos com pronta entrega
              </h2>
              <p className="mt-4 max-w-md text-white/80">
                Até 12x sem juros, 5% de desconto no Pix e suporte técnico de quem usa impressão 3D
                todos os dias. Indicamos o equipamento certo e acompanhamos a operação depois da venda.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Button asChild variant="cta" size="lg">
                  <Link to="/loja">
                    Comprar agora <ArrowRight />
                  </Link>
                </Button>
                <Button asChild variant="onbrand" size="lg">
                  <Link to="/impressoras">Ver impressoras</Link>
                </Button>
              </div>
            </div>
            <img
              src={hero}
              alt="Impressoras 3D em operação na loja SOS.3D"
              loading="lazy"
              width={1600}
              height={1008}
              className="hidden w-full rounded-xl border border-white/15 object-cover md:block"
            />
          </div>
        </div>
      </section>

      {/* Serviços resumidos */}
      <section className="container-page py-14">
        <div className="grid items-center gap-10 rounded-2xl border border-border bg-card p-8 lg:grid-cols-2 lg:p-12">
          <div>
            <span className="eyebrow">Além da loja</span>
            <h2 className="mt-2 text-2xl font-bold md:text-3xl">
              Impressão sob demanda, treinamento e suporte
            </h2>
            <p className="mt-4 text-muted-foreground">
              Compramos junto com você: indicamos o equipamento certo, entregamos a peça pronta
              quando precisar e acompanhamos a operação depois da venda.
            </p>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {[
                "Peças sob demanda em poucos dias",
                "Implantação e treinamento prático",
                "Reposição de materiais e peças",
                "Área maker com conteúdo técnico",
              ].map((i) => (
                <li key={i} className="flex gap-2.5 text-sm text-foreground/85">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />
                  {i}
                </li>
              ))}
            </ul>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild variant="cta">
                <Link to="/impressao-3d">Solicitar impressão</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/portal">Área Maker</Link>
              </Button>
            </div>
          </div>
          <img
            src={serviceParts}
            alt="Peças técnicas impressas em 3D sobre bancada com paquímetro"
            loading="lazy"
            width={1400}
            height={900}
            className="w-full rounded-xl object-cover"
          />
        </div>
      </section>

      <CtaBand />
      <div className="pb-4" />
    </>
  );
}
