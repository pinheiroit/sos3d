import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, Download, Hammer, Percent, Users, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ProductCard } from "@/components/site/ProductCard";
import { useProducts } from "@/lib/products";
import { useBanner } from "@/lib/site-images";

export const Route = createFileRoute("/makers")({
  head: () => ({
    meta: [
      { title: "Área Maker — comunidade, kits e conteúdo técnico | SOS.3D" },
      {
        name: "description",
        content:
          "Área maker da SOS.3D: guias práticos, downloads, kits de manutenção, condições especiais e comunidade para quem cria com impressão 3D.",
      },
      { property: "og:title", content: "Área Maker | SOS.3D" },
      {
        property: "og:description",
        content: "Conteúdo técnico, kits, downloads e comunidade para makers e criadores.",
      },
    ],
  }),
  component: MakersPage,
});

const beneficios = [
  { icon: Percent, t: "Condições de maker", d: "Preços especiais em filamento e peças de reposição para quem produz com frequência." },
  { icon: BookOpen, t: "Guias práticos", d: "Perfis de fatiamento, calibração, primeira camada e correção de defeitos comuns." },
  { icon: Wrench, t: "Clínica técnica", d: "Diagnóstico de falhas de impressão com nossa equipe, por foto ou vídeo." },
  { icon: Users, t: "Comunidade", d: "Encontros, desafios de projeto e troca de experiências entre criadores." },
];

const guias = [
  { t: "Calibração de fluxo em 20 minutos", tag: "Calibração", d: "Passo a passo com torres de teste e leitura de resultados." },
  { t: "PETG sem fios e sem bolhas", tag: "Materiais", d: "Secagem, retração e temperatura por tipo de bico." },
  { t: "Primeira camada perfeita", tag: "Básico", d: "Nivelamento, offset de Z e preparação da superfície." },
  { t: "Imprimindo com fibra de carbono", tag: "Avançado", d: "Bicos endurecidos, cuidados e limites do material." },
  { t: "Design para impressão FDM", tag: "Projeto", d: "Ângulos, suportes, tolerâncias de encaixe e furos." },
  { t: "Manutenção preventiva mensal", tag: "Manutenção", d: "Checklist rápido para manter repetibilidade." },
];

function MakersPage() {
  const makersImg = useBanner("makers");
  const { products } = useProducts();
  const kits = products.filter((p) => p.category === "acessorios" || p.slug === "bambu-lab-a1-mini");

  return (
    <>
      <section className="border-b border-border bg-secondary/60">
        <div className="container-page grid items-center gap-10 py-16 lg:grid-cols-2">
          <div>
            <span className="eyebrow">Área Maker</span>
            <h1 className="mt-3 text-4xl font-extrabold md:text-5xl">
              Espaço para quem cria, testa e coloca a mão na massa.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground">
              Conteúdo técnico direto ao ponto, kits de manutenção, condições especiais em insumos e
              uma comunidade para destravar seus projetos.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild variant="cta" size="lg">
                <a href="#comunidade">Entrar na comunidade</a>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/filamentos">Ver filamentos</Link>
              </Button>
            </div>
          </div>
          <img
            src={makersImg}
            alt="Espaço maker com impressoras 3D e pessoas trabalhando em protótipos"
            loading="lazy"
            width={1400}
            height={900}
            className="w-full rounded-2xl object-cover shadow-lg"
          />
        </div>
      </section>

      <section className="container-page py-20">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {beneficios.map((b) => (
            <div key={b.t} className="rounded-xl border border-border bg-card p-6">
              <b.icon className="size-6 text-accent" />
              <h2 className="mt-4 text-base font-semibold">{b.t}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{b.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container-page pb-20">
        <div className="max-w-2xl">
          <span className="eyebrow">Conteúdo</span>
          <h2 className="mt-2 text-3xl font-bold md:text-4xl">Guias e materiais para download</h2>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {guias.map((g) => (
            <article key={g.t} className="card-lift rounded-xl border border-border bg-card p-6">
              <Badge variant="secondary">{g.tag}</Badge>
              <h3 className="mt-4 text-lg font-semibold leading-snug">{g.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{g.d}</p>
              <Button
                variant="link"
                className="mt-4 h-auto p-0"
                onClick={() => toast.info("Material em preparação", { description: g.t })}
              >
                <Download className="size-4" /> Baixar guia
              </Button>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-secondary/60 py-20">
        <div className="container-page">
          <div className="max-w-2xl">
            <span className="eyebrow">Kit do maker</span>
            <h2 className="mt-2 text-3xl font-bold md:text-4xl">
              O essencial para manter a produção rodando
            </h2>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {kits.map((p) => (
              <ProductCard key={p.slug} product={p} />
            ))}
          </div>
        </div>
      </section>

      <section id="comunidade" className="container-page py-20">
        <div className="surface-brand grid-tech grid items-center gap-10 rounded-2xl px-8 py-14 md:px-14 lg:grid-cols-2">
          <div>
            <Hammer className="size-7 text-accent" />
            <h2 className="mt-5 text-3xl font-bold">Comunidade Maker SOS.3D</h2>
            <p className="mt-4 max-w-lg text-white/75">
              Receba desafios de projeto, perfis de fatiamento testados por nós, avisos de encontros
              e condições exclusivas em insumos. Sem spam — só o que ajuda a imprimir melhor.
            </p>
          </div>
          <form
            className="flex flex-col gap-3 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              (e.currentTarget as HTMLFormElement).reset();
              toast.success("Inscrição confirmada", { description: "Bem-vindo à comunidade maker." });
            }}
          >
            <Input
              type="email"
              required
              placeholder="seu@email.com"
              aria-label="Seu e-mail"
              className="h-12 border-white/25 bg-white/10 text-white placeholder:text-white/50"
            />
            <Button type="submit" variant="cta" size="lg">
              Quero participar
            </Button>
          </form>
        </div>
      </section>
    </>
  );
}
