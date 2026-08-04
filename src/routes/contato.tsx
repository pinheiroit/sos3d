import { createFileRoute } from "@tanstack/react-router";
import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
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

export const Route = createFileRoute("/contato")({
  head: () => ({
    meta: [
      { title: "Contato e orçamento | SOS.3D" },
      {
        name: "description",
        content:
          "Fale com um especialista da SOS.3D: orçamento de equipamentos, materiais, impressão sob demanda e serviços técnicos.",
      },
      { property: "og:title", content: "Contato e orçamento | SOS.3D" },
      {
        property: "og:description",
        content: "Conte o que você precisa produzir e receba uma recomendação adequada.",
      },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  return (
    <div className="container-page grid gap-12 py-16 lg:grid-cols-[1fr_400px]">
      <div>
        <span className="eyebrow">Contato</span>
        <h1 className="mt-3 text-4xl font-extrabold md:text-5xl">Solicitar orçamento</h1>
        <p className="mt-4 max-w-xl text-lg text-muted-foreground">
          A solução certa começa pelo que você precisa produzir. Preencha os campos abaixo e nossa
          equipe retorna com uma recomendação técnica e comercial.
        </p>

        <form
          className="mt-10 rounded-2xl border border-border bg-card p-6 md:p-8"
          onSubmit={(e) => {
            e.preventDefault();
            (e.currentTarget as HTMLFormElement).reset();
            toast.success("Solicitação enviada", {
              description: "Retornamos em até 1 dia útil.",
            });
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="c-nome">Nome</Label>
              <Input id="c-nome" required className="mt-2" autoComplete="name" />
            </div>
            <div>
              <Label htmlFor="c-empresa">Empresa / instituição</Label>
              <Input id="c-empresa" className="mt-2" autoComplete="organization" />
            </div>
            <div>
              <Label htmlFor="c-email">E-mail</Label>
              <Input id="c-email" type="email" required className="mt-2" autoComplete="email" />
            </div>
            <div>
              <Label htmlFor="c-tel">Telefone / WhatsApp</Label>
              <Input id="c-tel" required className="mt-2" autoComplete="tel" />
            </div>
            <div>
              <Label htmlFor="c-cidade">Cidade / estado</Label>
              <Input id="c-cidade" className="mt-2" />
            </div>
            <div>
              <Label htmlFor="c-interesse">Interesse principal</Label>
              <Select>
                <SelectTrigger id="c-interesse" className="mt-2">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="impressora">Compra de impressora 3D</SelectItem>
                  <SelectItem value="filamento">Filamentos e insumos</SelectItem>
                  <SelectItem value="servico">Impressão sob demanda</SelectItem>
                  <SelectItem value="laser">Laser e CNC</SelectItem>
                  <SelectItem value="educacao">Projeto educacional / Fab Lab</SelectItem>
                  <SelectItem value="suporte">Serviços e manutenção</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-4">
            <Label htmlFor="c-msg">O que você pretende produzir?</Label>
            <Textarea
              id="c-msg"
              required
              rows={5}
              className="mt-2"
              placeholder="Aplicação, material, tamanho da peça, volume mensal e prazo desejado."
            />
          </div>

          <label className="mt-5 flex items-start gap-2.5 text-sm">
            <Checkbox required className="mt-0.5" />
            <span className="text-muted-foreground">
              Li e aceito a política de privacidade e autorizo o contato da SOS.3D (LGPD).
            </span>
          </label>

          <Button type="submit" variant="cta" size="lg" className="mt-6 w-full sm:w-auto">
            Enviar solicitação
          </Button>
        </form>
      </div>

      <aside className="h-fit space-y-4 rounded-2xl border border-border bg-card p-7 lg:sticky lg:top-28">
        <h2 className="text-lg font-semibold">Canais de atendimento</h2>
        <ul className="space-y-4 text-sm">
          <li className="flex gap-3">
            <Phone className="mt-0.5 size-4 shrink-0 text-tech" />
            <span>
              <span className="block font-medium">Telefone</span>
              <span className="text-muted-foreground">(00) 0000-0000</span>
            </span>
          </li>
          <li className="flex gap-3">
            <MessageCircle className="mt-0.5 size-4 shrink-0 text-tech" />
            <span>
              <span className="block font-medium">WhatsApp</span>
              <span className="text-muted-foreground">Atendimento comercial e técnico</span>
            </span>
          </li>
          <li className="flex gap-3">
            <Mail className="mt-0.5 size-4 shrink-0 text-tech" />
            <span>
              <span className="block font-medium">E-mail</span>
              <span className="text-muted-foreground">contato@sos3d.com.br</span>
            </span>
          </li>
          <li className="flex gap-3">
            <Clock className="mt-0.5 size-4 shrink-0 text-tech" />
            <span>
              <span className="block font-medium">Horário</span>
              <span className="text-muted-foreground">Segunda a sexta, 8h às 18h</span>
            </span>
          </li>
          <li className="flex gap-3">
            <MapPin className="mt-0.5 size-4 shrink-0 text-tech" />
            <span>
              <span className="block font-medium">Atendimento</span>
              <span className="text-muted-foreground">Envio e suporte para todo o Brasil</span>
            </span>
          </li>
        </ul>
        <p className="rounded-lg bg-secondary p-4 text-xs text-muted-foreground">
          Para chamados técnicos de equipamentos já adquiridos, use a Central de suporte — assim seu
          atendimento entra na fila com protocolo.
        </p>
      </aside>
    </div>
  );
}
