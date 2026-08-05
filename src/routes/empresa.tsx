import { createFileRoute } from "@tanstack/react-router";
import { CtaBand } from "@/components/site/CtaBand";
import { useBanner } from "@/lib/site-images";

export const Route = createFileRoute("/empresa")({
  head: () => ({
    meta: [
      { title: "Quem somos — SOS.3D | Manufatura aditiva, laser e design" },
      {
        name: "description",
        content:
          "A SOS.3D conecta equipamentos, materiais, conhecimento e suporte em uma experiência completa de manufatura aditiva para empresas, escolas e makers.",
      },
      { property: "og:title", content: "Quem somos | SOS.3D" },
      {
        property: "og:description",
        content: "Missão, visão, valores e diferenciais da SOS.3D em manufatura aditiva.",
      },
    ],
  }),
  component: CompanyPage,
});

const publicos = [
  { t: "Empresas e indústrias", d: "Prototipagem, gabaritos, peças de reposição, pequenas séries e inovação interna." },
  { t: "Arquitetura, engenharia e design", d: "Maquetes, modelos, validação de forma e desenvolvimento de produto." },
  { t: "Comunicação visual e eventos", d: "Peças especiais, cenografia, sinalização e elementos personalizados." },
  { t: "Educação e laboratórios", d: "Escolas, universidades, cursos técnicos, Fab Labs e espaços makers." },
  { t: "Makers e profissionais independentes", d: "Produção criativa, personalização e prestação de serviços." },
  { t: "Agronegócio e manutenção", d: "Soluções sob medida, suportes, organizadores e componentes não críticos." },
];

const servicos = [
  { t: "Consultoria de compra", d: "Analisamos aplicação, dimensões, materiais, frequência de uso, nível de automação e orçamento." },
  { t: "Implantação", d: "Instalação, configuração inicial, boas práticas e validação dos primeiros trabalhos." },
  { t: "Treinamento", d: "Operação, preparação de arquivos, escolha de materiais e cuidados preventivos." },
  { t: "Manutenção", d: "Preventiva e corretiva, com diagnóstico e reposição de componentes." },
  { t: "Impressão sob demanda", d: "Produção de peças, protótipos e pequenas séries com material adequado." },
  { t: "Projetos", d: "Apoio em modelagem, engenharia reversa e adequação de geometria para manufatura." },
];

function CompanyPage() {
  const hero = useBanner("empresa");
  return (
    <>
      <section className="container-page grid items-center gap-12 py-16 lg:grid-cols-2">
        <div>
          <span className="eyebrow">Quem somos</span>
          <h1 className="mt-3 text-4xl font-extrabold md:text-5xl">
            Tecnologia para transformar ideias em soluções concretas.
          </h1>
          <p className="mt-6 text-muted-foreground">
            A SOS.3D atua no ecossistema de manufatura aditiva, conectando equipamentos, materiais,
            conhecimento e suporte em uma experiência completa. Nosso trabalho começa pela
            necessidade do cliente: entender o que será produzido, como a tecnologia será utilizada e
            quais resultados são esperados.
          </p>
          <p className="mt-4 text-muted-foreground">
            Mais do que fornecer máquinas, orientamos a escolha, apoiamos a implantação e
            contribuímos para que cada solução seja utilizada com segurança, consistência e potencial
            de crescimento.
          </p>
        </div>
        <img
          src={hero}
          alt="Equipe SOS.3D acompanhando impressão 3D em operação"
          loading="lazy"
          width={1600}
          height={1008}
          className="w-full rounded-2xl object-cover shadow-lg"
        />
      </section>

      <section className="bg-secondary/60 py-20">
        <div className="container-page grid gap-6 md:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-7">
            <h2 className="text-lg font-semibold">Missão</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Democratizar o acesso à manufatura aditiva por meio de soluções adequadas, orientação
              técnica e suporte próximo.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-7">
            <h2 className="text-lg font-semibold">Visão</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Ser reconhecida como referência em manufatura aditiva, laser e design, pela confiança,
              conhecimento e qualidade do atendimento.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-7">
            <h2 className="text-lg font-semibold">Valores</h2>
            <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
              <li>Transparência nas recomendações</li>
              <li>Conhecimento compartilhado</li>
              <li>Qualidade e consistência</li>
              <li>Compromisso com o resultado</li>
              <li>Relacionamento de longo prazo</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="container-page py-20">
        <div className="max-w-2xl">
          <span className="eyebrow">Serviços</span>
          <h2 className="mt-2 text-3xl font-bold md:text-4xl">Do primeiro contato ao pós-venda</h2>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {servicos.map((s) => (
            <div key={s.t} className="rounded-xl border border-border bg-card p-6">
              <h3 className="font-semibold">{s.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container-page pb-20">
        <div className="max-w-2xl">
          <span className="eyebrow">Públicos atendidos</span>
          <h2 className="mt-2 text-3xl font-bold md:text-4xl">Para quem trabalhamos</h2>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {publicos.map((p) => (
            <div key={p.t} className="rounded-xl border border-border bg-card p-6">
              <h3 className="font-semibold">{p.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{p.d}</p>
            </div>
          ))}
        </div>
      </section>

      <CtaBand />
      <div className="pb-4" />
    </>
  );
}
