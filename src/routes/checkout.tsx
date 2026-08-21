import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, CreditCard, Lock, MessageCircle, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { formatBRL } from "@/lib/catalog";
import { useCart } from "@/lib/cart";
import { paymentDiscountPercent, shippingFor, usePricing } from "@/lib/pricing";
import { cardUnitPrice } from "@/lib/catalog";
import { createOrder } from "@/lib/orders.functions";
import { useSiteContent } from "@/lib/site-content";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Finalizar pedido | SOS.3D" },
      { name: "description", content: "Conclua seu pedido de equipamentos e materiais SOS.3D." },
      { property: "og:title", content: "Finalizar pedido | SOS.3D" },
      { property: "og:description", content: "Conclua seu pedido com entrega e suporte técnico SOS.3D." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CheckoutPage,
});

type OrderResult = Awaited<ReturnType<typeof createOrder>>;

const paymentLabel: Record<string, string> = {
  pix: "Pix",
  boleto: "Boleto",
  cartao: "Cartão de crédito",
};

function whatsappLink(phone: string, order: OrderResult, customerName: string) {
  const digits = (phone || "").replace(/\D/g, "");
  const number = digits.length <= 11 ? `55${digits}` : digits;
  const linhas = order.items
    .map((i) => `• ${i.qty}x ${i.name} — ${formatBRL(i.unitPrice * i.qty)}`)
    .join("\n");
  const msg =
    `Olá! Acabei de finalizar o pedido *${order.reference}* no site da SOS.3D.\n\n` +
    `Cliente: ${customerName}\n` +
    `Pagamento: ${paymentLabel[order.paymentMethod] ?? order.paymentMethod}\n\n` +
    `${linhas}\n\n` +
    `Subtotal: ${formatBRL(order.subtotal)}\n` +
    `Frete: ${order.shipping > 0 ? formatBRL(order.shipping) : "Grátis"}\n` +
    (order.discount > 0 ? `Desconto: -${formatBRL(order.discount)}\n` : "") +
    `*Total: ${formatBRL(order.total)}*\n\n` +
    `Gostaria de concluir o pagamento.`;
  return `https://wa.me/${number}?text=${encodeURIComponent(msg)}`;
}

function CheckoutPage() {
  const { items, subtotal, clear } = useCart();
  const [done, setDone] = useState<OrderResult | null>(null);
  const [pagamento, setPagamento] = useState("pix");
  const [sending, setSending] = useState(false);
  const [f, setF] = useState({
    nome: "",
    email: "",
    doc: "",
    tel: "",
    cep: "",
    rua: "",
    num: "",
    cidade: "",
    uf: "",
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF((prev) => ({ ...prev, [k]: e.target.value }));

  const rules = usePricing();
  const { footer } = useSiteContent();

  const monthOptions = Array.from(
    new Set(items.flatMap(({ product }) => (product.installments ?? []).map((p) => p.months))),
  ).sort((a, b) => a - b);
  const [parcelas, setParcelas] = useState<number | null>(null);
  const parcelasSel = parcelas ?? monthOptions[monthOptions.length - 1] ?? rules.defaultInstallments;

  const isCard = pagamento === "cartao";
  const baseSubtotal = isCard
    ? items.reduce((s, { product, qty }) => s + cardUnitPrice(product, parcelasSel) * qty, 0)
    : subtotal;
  const frete = shippingFor(baseSubtotal, rules);
  const desconto = (baseSubtotal * paymentDiscountPercent(pagamento, rules)) / 100;
  const total = baseSubtotal + frete - desconto;

  if (done) {
    const link = whatsappLink(footer.phone, done, f.nome);
    return (
      <div className="container-page py-24 text-center">
        <CheckCircle2 className="mx-auto size-12 text-success" />
        <h1 className="mt-6 text-3xl font-bold">Pedido registrado com sucesso</h1>
        <p className="mt-4 text-base">
          Número do pedido:{" "}
          <span className="rounded-md bg-muted px-2 py-1 font-mono text-lg font-bold">
            {done.reference}
          </span>
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Total {formatBRL(done.total)} · {paymentLabel[done.paymentMethod] ?? done.paymentMethod}
        </p>
        <p className="mx-auto mt-4 max-w-lg text-muted-foreground">
          Para concluir o pagamento, envie o número do pedido no WhatsApp. Nossa equipe confirma
          estoque, frete e envia os dados de pagamento.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild variant="cta" size="lg">
            <a href={link} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="size-4" /> Finalizar pagamento no WhatsApp
            </a>
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              navigator.clipboard?.writeText(done.reference);
              toast.success("Número do pedido copiado");
            }}
          >
            Copiar número
          </Button>
          <Button asChild variant="ghost">
            <Link to="/loja">Voltar para a loja</Link>
          </Button>
        </div>
      </div>
    );
  }


  if (items.length === 0) {
    return (
      <div className="container-page py-24 text-center">
        <h1 className="text-2xl font-bold">Não há itens para finalizar</h1>
        <Button asChild variant="cta" className="mt-6">
          <Link to="/loja">Ir para a loja</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container-page py-12">
      <h1 className="text-3xl font-bold md:text-4xl">Finalizar pedido</h1>
      <p className="mt-2 text-muted-foreground">
        Etapa 2 de 2 — dados de entrega e pagamento. Compra protegida.
      </p>

      <form
        className="mt-10 grid gap-8 lg:grid-cols-[1fr_360px]"
        onSubmit={async (e) => {
          e.preventDefault();
          setSending(true);
          try {
            const result = await createOrder({
              data: {
                items: items.map((i) => ({ slug: i.product.slug, qty: i.qty })),
                customer: { name: f.nome, email: f.email, phone: f.tel, document: f.doc },
                address: {
                  zip: f.cep,
                  street: f.rua,
                  number: f.num,
                  complement: "",
                  city: f.cidade,
                  state: f.uf,
                },
                paymentMethod: pagamento as "pix" | "boleto" | "cartao",
                installmentMonths: isCard ? parcelasSel : undefined,
                notes: "",
              },
            });
            clear();
            setDone(result);
          } catch (error) {
            toast.error("Não foi possível concluir o pedido", {
              description: error instanceof Error ? error.message : "Tente novamente.",
            });
          } finally {
            setSending(false);
          }
        }}
      >
        <div className="space-y-6">
          <fieldset className="rounded-xl border border-border bg-card p-6">
            <legend className="px-2 text-sm font-semibold uppercase tracking-wide">Identificação</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="nome">Nome completo</Label>
                <Input id="nome" required className="mt-2" autoComplete="name"  value={f.nome} onChange={set("nome")} />
              </div>
              <div>
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" type="email" required className="mt-2" autoComplete="email"  value={f.email} onChange={set("email")} />
              </div>
              <div>
                <Label htmlFor="doc">CPF / CNPJ</Label>
                <Input id="doc" required className="mt-2"  value={f.doc} onChange={set("doc")} />
              </div>
              <div>
                <Label htmlFor="tel">Telefone</Label>
                <Input id="tel" required className="mt-2" autoComplete="tel"  value={f.tel} onChange={set("tel")} />
              </div>
            </div>
          </fieldset>

          <fieldset className="rounded-xl border border-border bg-card p-6">
            <legend className="px-2 text-sm font-semibold uppercase tracking-wide">Entrega</legend>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="sm:col-span-1">
                <Label htmlFor="cep">CEP</Label>
                <Input id="cep" required className="mt-2" autoComplete="postal-code"  value={f.cep} onChange={set("cep")} />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="rua">Endereço</Label>
                <Input id="rua" required className="mt-2" autoComplete="street-address"  value={f.rua} onChange={set("rua")} />
              </div>
              <div>
                <Label htmlFor="num">Número</Label>
                <Input id="num" required className="mt-2"  value={f.num} onChange={set("num")} />
              </div>
              <div>
                <Label htmlFor="cidade">Cidade</Label>
                <Input id="cidade" required className="mt-2"  value={f.cidade} onChange={set("cidade")} />
              </div>
              <div>
                <Label htmlFor="uf">Estado</Label>
                <Input id="uf" required className="mt-2"  value={f.uf} onChange={set("uf")} />
              </div>
            </div>
            <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <Truck className="size-4 text-tech" /> Frete grátis para pedidos acima de {formatBRL(rules.freeShippingFrom)}.
            </p>
          </fieldset>

          <fieldset className="rounded-xl border border-border bg-card p-6">
            <legend className="px-2 text-sm font-semibold uppercase tracking-wide">Pagamento</legend>
            <RadioGroup value={pagamento} onValueChange={setPagamento} className="gap-3">
              {[
                { v: "pix", t: "Pix", d: `${rules.pixDiscountPercent}% de desconto, aprovação imediata` },
                { v: "cartao", t: "Cartão de crédito", d: `Até ${rules.defaultInstallments}x sem juros` },
                { v: "boleto", t: "Boleto / faturamento", d: "Para empresas e instituições" },
              ].map((o) => (
                <label
                  key={o.v}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-4 transition-colors has-[button[data-state=checked]]:border-tech"
                >
                  <RadioGroupItem value={o.v} id={o.v} />
                  <span>
                    <span className="block text-sm font-semibold">{o.t}</span>
                    <span className="block text-xs text-muted-foreground">{o.d}</span>
                  </span>
                </label>
              ))}
            </RadioGroup>
            {isCard && monthOptions.length > 0 && (
              <div className="mt-4 rounded-lg border border-border bg-muted/40 p-4">
                <Label className="text-xs font-semibold uppercase tracking-wide">
                  Número de parcelas
                </Label>
                <div className="mt-3 flex flex-wrap gap-2">
                  {monthOptions.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setParcelas(m)}
                      className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                        m === parcelasSel
                          ? "border-tech bg-tech/10 text-tech"
                          : "border-border hover:border-tech/60"
                      }`}
                    >
                      {m}x
                    </button>
                  ))}
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  O valor total no cartão segue a tabela de parcelamento cadastrada em cada produto.
                </p>
              </div>
            )}
            <label className="mt-5 flex items-start gap-2.5 text-sm">
              <Checkbox required className="mt-0.5" />
              <span className="text-muted-foreground">
                Li e aceito a política de privacidade e autorizo o contato da SOS.3D sobre este
                pedido (LGPD).
              </span>
            </label>
          </fieldset>
        </div>

        <aside className="h-fit rounded-xl border border-border bg-card p-6 lg:sticky lg:top-28">
          <h2 className="text-lg font-semibold">Resumo</h2>
          <ul className="mt-4 space-y-3 text-sm">
            {items.map(({ product, qty }) => (
              <li key={product.slug} className="flex justify-between gap-3">
                <span className="text-muted-foreground">
                  {qty}× {product.name}
                </span>
                <span className="shrink-0 font-medium">
                  {formatBRL((isCard ? cardUnitPrice(product, parcelasSel) : product.price) * qty)}
                </span>
              </li>
            ))}
          </ul>
          <dl className="mt-5 space-y-2.5 border-t border-border pt-5 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Frete</dt>
              <dd>{frete === 0 ? "Grátis" : formatBRL(frete)}</dd>
            </div>
            {desconto > 0 && (
              <div className="flex justify-between text-success">
                <dt>Desconto</dt>
                <dd>-{formatBRL(desconto)}</dd>
              </div>
            )}
            <div className="flex justify-between border-t border-border pt-3">
              <dt className="font-semibold">Total</dt>
              <dd className="text-xl font-extrabold text-brand">{formatBRL(total)}</dd>
            </div>
          </dl>
          <Button type="submit" variant="cta" size="lg" className="mt-6 w-full" disabled={sending}>
            <CreditCard /> Concluir pedido
          </Button>
          <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="size-3.5" /> Ambiente seguro • dados protegidos
          </p>
        </aside>
      </form>
    </div>
  );
}
