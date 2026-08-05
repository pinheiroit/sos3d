import { createFileRoute, Link } from "@tanstack/react-router";
import { Clock, FileUp, Gauge, Layers3, Ruler, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { toast } from "sonner";
import { CtaBand } from "@/components/site/CtaBand";
import { useBanner } from "@/lib/site-images";

export const Route = createFileRoute("/impressao-3d")({
  head: () => ({
    meta: [
      { title: "Impressão 3D sob demanda — envie seu projeto | SOS.3D" },
      {
        name: "description",
        content:
          "Serviço de impressão 3D sob demanda: protótipos, gabaritos, peças funcionais e pequenas séries com escolha técnica de material e acabamento.",
      },
      { property: "og:title", content: "Impressão 3D sob demanda | SOS.3D" },
      {
        property: "og:description",
        content: "Envie o arquivo ou a ideia e receba a peça pronta com o material adequado.",
      },
    ],
  }),
  component: PrintingPage,
});

const etapas = [
  { icon: FileUp, t: "Envie o arquivo ou a ideia", d: "STL, STEP, 3MF ou até um esboço com medidas." },
  { icon: Ruler, t: "Análise técnica", d: "Avaliamos geometria, tolerâncias, material e acabamento." },
  { icon: Gauge, t: "Orçamento e prazo", d: "Você recebe valor, prazo e alternativas de material." },
  { icon: Layers3, t: "Produção e entrega", d: "Impressão, pós-processamento, inspeção e envio." },
];

const capacidades = [
  { t: "Protótipos funcionais", d: "Validação de forma, encaixe e função antes da ferramentaria." },
  { t: "Gabaritos e dispositivos", d: "Ferramentas de apoio à linha de produção e ao controle de qualidade." },
  { t: "Peças de reposição", d: "Componentes não críticos fora de linha, reproduzidos sob medida." },
  { t: "Maquetes e modelos", d: "Apresentação de projetos de arquitetura, engenharia e produto." },
  { t: "Personalização e brindes", d: "Pequenas séries com identidade visual e acabamento controlado." },
  { t: "Engenharia reversa", d: "Digitalização e reconstrução de geometrias a partir da peça física." },
];

function PrintingPage() {
  return (
    <>
      <section className="surface-brand grid-tech">
        <div className="container-page grid items-center gap-10 py-16 lg:grid-cols-2 lg:py-20">
          <div>
            <span className="inline-flex rounded-full border border-white/25 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-white/85">
              Serviço
            </span>
            <h1 className="mt-6 text-4xl font-extrabold text-white md:text-5xl">
              Impressão 3D sob demanda
            </h1>
            <p className="mt-5 max-w-xl text-lg text-white/80">
              Não precisa ter máquina para produzir. Envie seu arquivo ou descreva a peça: cuidamos
              da escolha do material, dos parâmetros, do pós-processamento e da inspeção.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild variant="cta" size="lg">
                <a href="#orcamento">Enviar projeto</a>
              </Button>
              <Button asChild variant="onbrand" size="lg">
                <Link to="/impressoras">Prefiro comprar uma impressora</Link>
              </Button>
            </div>
          </div>
          <img
            src={serviceParts}
            alt="Peças impressas em 3D com acabamento técnico"
            loading="lazy"
            width={1400}
            height={900}
            className="w-full rounded-2xl border border-white/15 object-cover"
          />
        </div>
      </section>

      <section className="container-page py-20">
        <div className="max-w-2xl">
          <span className="eyebrow">Como funciona</span>
          <h2 className="mt-2 text-3xl font-bold md:text-4xl">Do arquivo à peça inspecionada</h2>
        </div>
        <ol className="mt-10 grid gap-6 md:grid-cols-4">
          {etapas.map((e, i) => (
            <li key={e.t} className="rounded-xl border border-border bg-card p-6">
              <e.icon className="size-6 text-accent" />
              <p className="mt-4 text-xs font-semibold text-steel">Etapa {i + 1}</p>
              <h3 className="mt-1 text-base font-semibold">{e.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{e.d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="bg-secondary/60 py-20">
        <div className="container-page">
          <div className="max-w-2xl">
            <span className="eyebrow">Capacidades</span>
            <h2 className="mt-2 text-3xl font-bold md:text-4xl">O que produzimos</h2>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {capacidades.map((c) => (
              <div key={c.t} className="rounded-xl border border-border bg-card p-6">
                <Sparkles className="size-5 text-tech" />
                <h3 className="mt-4 font-semibold">{c.t}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{c.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="orcamento" className="container-page py-20">
        <div className="grid gap-12 lg:grid-cols-[1fr_1fr]">
          <div>
            <span className="eyebrow">Orçamento</span>
            <h2 className="mt-2 text-3xl font-bold md:text-4xl">Solicite seu orçamento técnico</h2>
            <p className="mt-4 text-muted-foreground">
              Quanto mais detalhes, mais precisa é a recomendação. Se ainda não tiver arquivo,
              descreva a peça e as medidas aproximadas — nossa equipe apoia a modelagem.
            </p>

            <div className="mt-8 rounded-xl border border-border bg-card p-6">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <Clock className="size-4 text-tech" /> Prazos de referência
              </h3>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                <li>Peças pequenas em PLA/PETG: 2 a 4 dias úteis</li>
                <li>Materiais técnicos (nylon, PA-CF, ASA): 4 a 7 dias úteis</li>
                <li>Pequenas séries e pós-processamento: sob análise</li>
              </ul>
            </div>

            <Accordion type="single" collapsible className="mt-8">
              <AccordionItem value="a">
                <AccordionTrigger>Quais arquivos vocês aceitam?</AccordionTrigger>
                <AccordionContent>
                  STL, OBJ, 3MF e STEP. Também analisamos desenhos técnicos em PDF com cotas.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="b">
                <AccordionTrigger>Vocês assinam acordo de confidencialidade?</AccordionTrigger>
                <AccordionContent>
                  Sim. Projetos sob NDA são tratados com acesso restrito e arquivos removidos após a
                  entrega, quando solicitado.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="c">
                <AccordionTrigger>Qual a tolerância dimensional?</AccordionTrigger>
                <AccordionContent>
                  Em FDM, a referência usual é ±0,3 mm ou ±0,3% da dimensão. Tolerâncias mais
                  estreitas exigem análise específica da geometria.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          <form
            className="h-fit rounded-2xl border border-border bg-card p-6 md:p-8"
            onSubmit={(e) => {
              e.preventDefault();
              (e.currentTarget as HTMLFormElement).reset();
              toast.success("Solicitação enviada", {
                description: "Nossa equipe responde em até 1 dia útil.",
              });
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="p-nome">Nome</Label>
                <Input id="p-nome" required className="mt-2" />
              </div>
              <div>
                <Label htmlFor="p-empresa">Empresa (opcional)</Label>
                <Input id="p-empresa" className="mt-2" />
              </div>
              <div>
                <Label htmlFor="p-email">E-mail</Label>
                <Input id="p-email" type="email" required className="mt-2" />
              </div>
              <div>
                <Label htmlFor="p-tel">Telefone / WhatsApp</Label>
                <Input id="p-tel" required className="mt-2" />
              </div>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="p-material">Material desejado</Label>
                <Select>
                  <SelectTrigger id="p-material" className="mt-2">
                    <SelectValue placeholder="Não sei, preciso de indicação" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="indicacao">Não sei, preciso de indicação</SelectItem>
                    <SelectItem value="pla">PLA</SelectItem>
                    <SelectItem value="petg">PETG</SelectItem>
                    <SelectItem value="abs">ABS / ASA</SelectItem>
                    <SelectItem value="nylon">Nylon / PA-CF</SelectItem>
                    <SelectItem value="tpu">TPU flexível</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="p-qtd">Quantidade de peças</Label>
                <Input id="p-qtd" type="number" min={1} defaultValue={1} className="mt-2" />
              </div>
            </div>

            <div className="mt-4">
              <Label htmlFor="p-arquivo">Arquivo 3D (STL, STEP, 3MF)</Label>
              <Input id="p-arquivo" type="file" className="mt-2" accept=".stl,.step,.stp,.3mf,.obj,.pdf" />
            </div>

            <div className="mt-4">
              <Label htmlFor="p-desc">Descreva a aplicação</Label>
              <Textarea
                id="p-desc"
                required
                rows={5}
                className="mt-2"
                placeholder="Onde a peça será usada, esforços, temperatura, medidas críticas e prazo desejado."
              />
            </div>

            <label className="mt-5 flex items-start gap-2.5 text-sm">
              <Checkbox required className="mt-0.5" />
              <span className="text-muted-foreground">
                Autorizo o contato da SOS.3D sobre esta solicitação (LGPD).
              </span>
            </label>

            <Button type="submit" variant="cta" size="lg" className="mt-6 w-full">
              Enviar solicitação
            </Button>
          </form>
        </div>
      </section>

      <CtaBand
        title="Precisa de produção contínua?"
        text="Se a demanda se repete, avaliamos junto com você quando vale internalizar a produção com equipamento próprio."
        primary="Falar com especialista"
      />
      <div className="pb-4" />
    </>
  );
}
