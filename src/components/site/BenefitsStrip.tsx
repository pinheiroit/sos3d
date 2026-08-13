import { CreditCard, Headset, ShieldCheck, Truck } from "lucide-react";

const items = [
  { icon: Truck, title: "Envio para todo o Brasil", text: "Embalagem reforçada e rastreio" },
  { icon: CreditCard, title: "Até 12x sem juros", text: "5% de desconto no Pix" },
  { icon: ShieldCheck, title: "Garantia e nota fiscal", text: "Produtos originais e homologados" },
  { icon: Headset, title: "Suporte técnico real", text: "Ajuda na instalação e no uso" },
];

export function BenefitsStrip() {
  return (
    <section className="border-y border-border bg-secondary/40">
      <div className="container-page grid gap-5 py-6 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((i) => (
          <div key={i.title} className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-background text-tech">
              <i.icon className="size-5" />
            </span>
            <div className="leading-tight">
              <p className="text-sm font-semibold">{i.title}</p>
              <p className="text-xs text-muted-foreground">{i.text}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
