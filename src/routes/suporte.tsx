import { createFileRoute } from "@tanstack/react-router";
import { LifeBuoy, MessagesSquare, Timer } from "lucide-react";
import { toast } from "sonner";
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

export const Route = createFileRoute("/suporte")({
  head: () => ({
    meta: [
      { title: "Central de suporte — abrir chamado | SOS.3D" },
      {
        name: "description",
        content:
          "Abra um chamado técnico, consulte a base de conhecimento e tire dúvidas sobre garantia, manutenção e treinamento com a SOS.3D.",
      },
      { property: "og:title", content: "Central de suporte | SOS.3D" },
      {
        property: "og:description",
        content: "Chamado técnico, base de conhecimento, garantia e treinamento.",
      },
    ],
  }),
  component: SupportPage,
});

const faqs = [
  {
    q: "Qual o prazo de resposta do suporte?",
    a: "Chamados abertos em dias úteis recebem primeira resposta em até 1 dia útil. Casos com parada de produção têm prioridade na fila.",
  },
  {
    q: "Vocês fazem instalação e treinamento presencial?",
    a: "Sim, para equipamentos de médio e grande porte. Para modelos de bancada, oferecemos implantação remota guiada com checklist de validação.",
  },
  {
    q: "Como funciona a garantia dos equipamentos?",
    a: "A garantia segue as condições do fabricante. Registramos o número de série na compra e conduzimos o processo junto à marca, incluindo diagnóstico prévio.",
  },
  {
    q: "Posso comprar peças de reposição avulsas?",
    a: "Sim. Informe o modelo e o componente no chamado que enviamos disponibilidade, prazo e valor.",
  },
  {
    q: "Vocês ajudam a definir parâmetros de impressão?",
    a: "Sim. Compartilhamos perfis testados por material e apoiamos ajustes finos conforme sua aplicação.",
  },
];

function SupportPage() {
  return (
    <>
      <section className="surface-brand grid-tech">
        <div className="container-page py-16">
          <span className="inline-flex rounded-full border border-white/25 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-white/85">
            Suporte
          </span>
          <h1 className="mt-6 max-w-2xl text-4xl font-extrabold text-white md:text-5xl">
            Tecnologia acompanhada do início ao resultado
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-white/80">
            Abra um chamado, acompanhe o protocolo e conte com orientação técnica para manter sua
            produção rodando.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {[
              { icon: Timer, t: "1 dia útil", d: "Primeira resposta em chamados" },
              { icon: MessagesSquare, t: "Canal direto", d: "Suporte por e-mail e WhatsApp" },
              { icon: LifeBuoy, t: "Diagnóstico guiado", d: "Análise por foto, vídeo ou log" },
            ].map((i) => (
              <div key={i.t} className="rounded-xl border border-white/15 bg-white/5 p-5">
                <i.icon className="size-5 text-accent" />
                <p className="mt-3 font-semibold text-white">{i.t}</p>
                <p className="text-sm text-white/70">{i.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container-page grid gap-12 py-20 lg:grid-cols-[1fr_1fr]">
        <div>
          <span className="eyebrow">Abrir chamado</span>
          <h2 className="mt-2 text-3xl font-bold">Conte o que está acontecendo</h2>
          <p className="mt-3 text-muted-foreground">
            Quanto mais contexto (modelo, material, parâmetros e fotos), mais rápido chegamos à
            causa. Você recebe um número de protocolo por e-mail.
          </p>

          <form
            className="mt-8 rounded-2xl border border-border bg-card p-6 md:p-8"
            onSubmit={(e) => {
              e.preventDefault();
              (e.currentTarget as HTMLFormElement).reset();
              toast.success("Chamado registrado", {
                description: "Protocolo enviado para o seu e-mail.",
              });
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="s-nome">Nome</Label>
                <Input id="s-nome" required className="mt-2" />
              </div>
              <div>
                <Label htmlFor="s-email">E-mail</Label>
                <Input id="s-email" type="email" required className="mt-2" />
              </div>
              <div>
                <Label htmlFor="s-equip">Equipamento</Label>
                <Input id="s-equip" required placeholder="Modelo e marca" className="mt-2" />
              </div>
              <div>
                <Label htmlFor="s-serie">Número de série</Label>
                <Input id="s-serie" className="mt-2" />
              </div>
            </div>

            <div className="mt-4">
              <Label htmlFor="s-urg">Impacto na operação</Label>
              <Select>
                <SelectTrigger id="s-urg" className="mt-2">
                  <SelectValue placeholder="Selecione o impacto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="parada">Produção parada</SelectItem>
                  <SelectItem value="parcial">Produção parcial</SelectItem>
                  <SelectItem value="duvida">Dúvida técnica</SelectItem>
                  <SelectItem value="peca">Peça de reposição</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="mt-4">
              <Label htmlFor="s-desc">Descrição do problema</Label>
              <Textarea id="s-desc" required rows={5} className="mt-2" />
            </div>

            <div className="mt-4">
              <Label htmlFor="s-anexo">Anexos (fotos, vídeo ou arquivo)</Label>
              <Input id="s-anexo" type="file" className="mt-2" />
            </div>

            <label className="mt-5 flex items-start gap-2.5 text-sm">
              <Checkbox required className="mt-0.5" />
              <span className="text-muted-foreground">
                Autorizo o contato da SOS.3D sobre este chamado (LGPD).
              </span>
            </label>

            <Button type="submit" variant="cta" size="lg" className="mt-6 w-full">
              Abrir chamado
            </Button>
          </form>
        </div>

        <div>
          <span className="eyebrow">Base de conhecimento</span>
          <h2 className="mt-2 text-3xl font-bold">Perguntas frequentes</h2>
          <Accordion type="single" collapsible className="mt-6">
            {faqs.map((f) => (
              <AccordionItem key={f.q} value={f.q}>
                <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
                <AccordionContent>{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>
    </>
  );
}
