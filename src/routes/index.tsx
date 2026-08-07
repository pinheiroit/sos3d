import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Boxes,
  GraduationCap,
  Layers,
  LifeBuoy,
  Printer,
  Scan,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/site/ProductCard";
import { CtaBand } from "@/components/site/CtaBand";
import { useProducts } from "@/lib/products";
import { useBanner } from "@/lib/site-images";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SOS.3D — Da ideia à peça pronta | Impressão 3D, filamentos e suporte" },
      {
        name: "description",
        content:
          "Loja e centro técnico de manufatura aditiva: impressoras 3D, filamentos, acessórios, impressão sob demanda e área maker com suporte especializado.",
      },
      { property: "og:title", content: "SOS.3D — Da ideia à peça pronta" },
      {
        property: "og:description",
        content:
          "Impressoras 3D, filamentos, impressão sob demanda e suporte técnico para empresas, escolas, profissionais e makers.",
      },
    ],
  }),
  component: Index,
});

const categorias = [
  {
    icon: Printer,
    title: "Impressoras 3D",
    text: "Equipamentos para prototipagem, produção, educação e projetos profissionais.",
    cta: "Ver impressoras",
    to: "/impressoras" as const,
  },
  {
    icon: Layers,
    title: "Filamentos e insumos",
    text: "Materiais selecionados para qualidade, repetibilidade e acabamento.",
    cta: "Ver materiais",
    to: "/filamentos" as const,
  },
  {
    icon: Scan,
    title: "Impressão sob demanda",
    text: "Envie o arquivo ou a ideia: produzimos a peça com o material adequado.",
    cta: "Enviar projeto",
    to: "/impressao-3d" as const,
  },
  {
    icon: Boxes,
    title: "Área Maker",
    text: "Kits, modelos, conteúdo técnico e comunidade para criar com autonomia.",
    cta: "Entrar na área maker",
    to: "/makers" as const,
  },
];

const diferenciais = [
  {
    icon: ShieldCheck,
    title: "Venda consultiva",
    text: "A indicação parte da sua aplicação, do material, do volume de produção e do nível de experiência.",
  },
  {
    icon: Wrench,
    title: "Implantação orientada",
    text: "Configuração inicial, boas práticas e validação dos primeiros trabalhos.",
  },
  {
    icon: GraduationCap,
    title: "Treinamento prático",
    text: "Capacitação para operação, preparação de arquivos, materiais e cuidados preventivos.",
  },
  {
    icon: LifeBuoy,
    title: "Pós-venda próximo",
    text: "Canal de suporte para dúvidas, diagnóstico e continuidade da produção.",
  },
];

const passos = [
  { n: "01", t: "Conte sua necessidade", d: "Aplicação, material, tamanho, volume e prazo." },
  { n: "02", t: "Receba a recomendação", d: "Equipamento, acessórios, insumos e serviços adequados." },
  { n: "03", t: "Implante com segurança", d: "Instalação, configuração, treinamento e primeiros testes." },
  { n: "04", t: "Produza com acompanhamento", d: "Suporte, manutenção e reposição de materiais." },
];

function Index() {
  const { products } = useProducts();
  const hero = useBanner("home-hero");
  const serviceParts = useBanner("home-aplicacoes");
  const destaques = products.filter((p) => p.badge).slice(0, 4);

  return (
    <>
      <section className="surface-brand grid-tech relative overflow-hidden">
        <div className="container-page grid items-center gap-12 py-16 lg:grid-cols-[1.05fr_1fr] lg:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/25 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-white/85">
              Da ideia à peça pronta
            </span>
            <h1 className="mt-6 text-4xl font-extrabold leading-[1.05] text-white md:text-6xl">
              Tecnologia 3D para produzir mais, inovar e crescer.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/80">
              Equipamentos de manufatura aditiva, soluções a laser, materiais e suporte técnico para
              empresas, escolas, profissionais e makers.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Button asChild variant="cta" size="lg">
                <Link to="/contato">
                  Falar com um especialista <ArrowRight />
                </Link>
              </Button>
              <Button asChild variant="onbrand" size="lg">
                <Link to="/loja">Conhecer as soluções</Link>
              </Button>
            </div>
            <p className="mt-5 max-w-md text-sm text-white/60">
              Conte o que você pretende produzir e receba uma recomendação adequada à sua aplicação.
            </p>
          </div>

          <div className="relative">
            <img
              src={hero}
              alt="Oficina de manufatura aditiva com impressoras 3D em operação"
              width={1600}
              height={1008}
              className="w-full rounded-2xl border border-white/15 object-cover shadow-2xl"
            />
          </div>
        </div>

      </section>

      <section className="container-page py-20">
        <div className="max-w-2xl">
          <span className="eyebrow">Soluções</span>
          <h2 className="mt-2 text-3xl font-bold md:text-4xl">
            Soluções para cada etapa da sua produção
          </h2>
        </div>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {categorias.map((c) => (
            <Link
              key={c.title}
              to={c.to}
              className="card-lift group rounded-xl border border-border bg-card p-6"
            >
              <span className="grid size-11 place-items-center rounded-lg bg-secondary text-tech">
                <c.icon className="size-5" />
              </span>
              <h3 className="mt-5 text-lg font-semibold">{c.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{c.text}</p>
              <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-tech">
                {c.cta}
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="bg-secondary/60 py-20">
        <div className="container-page">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-xl">
              <span className="eyebrow">Loja SOS.3D</span>
              <h2 className="mt-2 text-3xl font-bold md:text-4xl">Destaques do catálogo</h2>
            </div>
            <Button asChild variant="outline">
              <Link to="/loja">
                Ver loja completa <ArrowRight />
              </Link>
            </Button>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {destaques.map((p) => (
              <ProductCard key={p.slug} product={p} />
            ))}
          </div>
        </div>
      </section>

      <section className="container-page py-20">
        <div className="max-w-2xl">
          <span className="eyebrow">Por que escolher a SOS.3D</span>
          <h2 className="mt-2 text-3xl font-bold md:text-4xl">
            Tecnologia acompanhada do início ao resultado
          </h2>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {diferenciais.map((d) => (
            <div key={d.title} className="rounded-xl border border-border bg-card p-6">
              <d.icon className="size-6 text-accent" />
              <h3 className="mt-4 text-base font-semibold">{d.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{d.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container-page pb-20">
        <div className="grid items-center gap-12 rounded-2xl border border-border bg-card p-8 lg:grid-cols-2 lg:p-12">
          <div>
            <span className="eyebrow">Aplicações</span>
            <h2 className="mt-2 text-3xl font-bold">Onde a manufatura aditiva gera valor</h2>
            <p className="mt-4 text-muted-foreground">
              Da validação de uma ideia à produção de peças personalizadas, a tecnologia 3D reduz
              etapas, acelera testes e abre novas possibilidades para diferentes setores.
            </p>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {[
                "Prototipagem e desenvolvimento de produto",
                "Gabaritos, suportes e organização de processos",
                "Maquetes, modelos e apresentação de projetos",
                "Educação tecnológica e laboratórios makers",
                "Personalização, brindes e pequenas séries",
                "Manutenção e reposição de componentes",
              ].map((i) => (
                <li key={i} className="flex gap-2.5 text-sm text-foreground/85">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />
                  {i}
                </li>
              ))}
            </ul>
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

      <section className="container-page pb-20">
        <div className="max-w-2xl">
          <span className="eyebrow">Como funciona</span>
          <h2 className="mt-2 text-3xl font-bold md:text-4xl">Quatro passos até a peça pronta</h2>
        </div>
        <ol className="mt-10 grid gap-6 md:grid-cols-4">
          {passos.map((p) => (
            <li key={p.n} className="rounded-xl border border-border bg-card p-6">
              <span className="text-3xl font-extrabold text-mist">{p.n}</span>
              <h3 className="mt-3 text-base font-semibold">{p.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{p.d}</p>
            </li>
          ))}
        </ol>
      </section>

      <CtaBand />
      <div className="pb-4" />
    </>
  );
}
