import { useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Check, ChevronRight, Minus, Plus, ShieldCheck, ShoppingCart, Truck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProductCard } from "@/components/site/ProductCard";
import { bestPlan, formatBRL, type Product } from "@/lib/catalog";
import { usePricing } from "@/lib/pricing";
import { listProducts } from "@/lib/catalog.functions";
import { useCart } from "@/lib/cart";

export const Route = createFileRoute("/produto/$slug")({
  loader: async ({ params }) => {
    const all = await listProducts();
    const product = all.find((p) => p.slug === params.slug);
    if (!product) throw notFound();
    return { product, all };
  },
  head: ({ loaderData }) => {
    const product = loaderData?.product;
    if (!product) {
      return {
        meta: [{ title: "Produto indisponível | SOS.3D" }, { name: "robots", content: "noindex" }],
      };
    }
    return {
      meta: [
        { title: `${product.name} — ${product.brand} | SOS.3D` },
        { name: "description", content: product.subtitle },
        { property: "og:title", content: `${product.name} | SOS.3D` },
        { property: "og:description", content: product.subtitle },
      ],
    };
  },
  component: ProductPage,
});

function ProductPage() {
  const { product, all } = Route.useLoaderData() as { product: Product; all: Product[] };
  const { add } = useCart();
  const [qty, setQty] = useState(1);
  const plans = product.installments;
  const best = bestPlan(plans);
  const rules = usePricing();


  const related = all.filter((p) => p.slug !== product.slug && p.category === product.category).slice(0, 3);

  return (
    <>
      <div className="border-b border-border bg-secondary/50">
        <nav className="container-page flex items-center gap-1.5 py-3 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-tech">
            Home
          </Link>
          <ChevronRight className="size-3.5" />
          <Link to="/loja" className="hover:text-tech">
            Loja
          </Link>
          <ChevronRight className="size-3.5" />
          <span className="text-foreground">{product.name}</span>
        </nav>
      </div>

      <div className="container-page grid gap-12 py-12 lg:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border border-border bg-secondary">
          <img
            src={product.image}
            alt={product.name}
            width={900}
            height={900}
            className="w-full object-cover"
          />
        </div>

        <div>
          <span className="eyebrow">{product.brand}</span>
          <h1 className="mt-2 text-3xl font-bold md:text-4xl">{product.name}</h1>
          <p className="mt-3 text-lg text-muted-foreground">{product.subtitle}</p>

          <div className="mt-5 flex flex-wrap gap-2">
            {product.badge && <Badge className="bg-accent text-accent-foreground">{product.badge}</Badge>}
            <Badge variant="secondary">
              {product.stock > 0 ? `${product.stock} em estoque` : "Sob consulta"}
            </Badge>
            {product.useCases.map((u) => (
              <Badge key={u} variant="secondary">
                {u}
              </Badge>
            ))}
          </div>

          <div className="mt-8 rounded-xl border border-border bg-card p-6">
            {product.oldPrice && (
              <p className="text-sm text-muted-foreground line-through">{formatBRL(product.oldPrice)}</p>
            )}
            <p className="text-4xl font-extrabold text-brand">{formatBRL(product.price)}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {best
                ? `ou até ${best.months}x de ${formatBRL(best.installment)}`
                : `ou ${rules.defaultInstallments}x de ${formatBRL(product.price / rules.defaultInstallments)} sem juros`}{" "}
              • à vista com {rules.pixDiscountPercent}% de desconto
            </p>

            {plans.length > 0 && (
              <div className="mt-5 overflow-hidden rounded-lg border border-border">
                <table className="w-full text-sm">
                  <caption className="sr-only">Opções de parcelamento</caption>
                  <thead className="bg-secondary/60 text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold">Parcelamento</th>
                      <th className="px-3 py-2 text-right font-semibold">Valor da parcela</th>
                      <th className="px-3 py-2 text-right font-semibold">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-border">
                      <td className="px-3 py-2 font-medium">À vista (Pix)</td>
                      <td className="px-3 py-2 text-right text-muted-foreground">—</td>
                      <td className="px-3 py-2 text-right font-semibold text-success">
                        {formatBRL(product.price * (1 - rules.pixDiscountPercent / 100))}
                      </td>
                    </tr>
                    {plans.map((p) => (
                      <tr key={p.months} className="border-t border-border">
                        <td className="px-3 py-2 font-medium">{p.months}x</td>
                        <td className="px-3 py-2 text-right">{formatBRL(p.installment)}</td>
                        <td className="px-3 py-2 text-right font-semibold text-brand">
                          {formatBRL(p.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="border-t border-border bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
                  Valores de parcelamento já incluem acréscimos do prazo escolhido.
                </p>
              </div>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <div className="flex h-12 items-center rounded-lg border border-border">
                <button
                  className="grid h-full w-11 place-items-center text-muted-foreground hover:text-foreground"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  aria-label="Diminuir quantidade"
                >
                  <Minus className="size-4" />
                </button>
                <span className="w-8 text-center text-sm font-semibold">{qty}</span>
                <button
                  className="grid h-full w-11 place-items-center text-muted-foreground hover:text-foreground"
                  onClick={() => setQty((q) => q + 1)}
                  aria-label="Aumentar quantidade"
                >
                  <Plus className="size-4" />
                </button>
              </div>
              <Button
                variant="cta"
                size="lg"
                className="flex-1"
                onClick={() => {
                  add(product.slug, qty);
                  toast.success("Adicionado ao carrinho", { description: `${qty}× ${product.name}` });
                }}
              >
                <ShoppingCart /> Adicionar ao carrinho
              </Button>
            </div>

            <Button asChild variant="outline" size="lg" className="mt-3 w-full">
              <Link to="/contato">Falar com especialista antes de comprar</Link>
            </Button>

            <ul className="mt-6 space-y-2.5 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Truck className="size-4 text-tech" /> Envio para todo o Brasil com embalagem técnica
              </li>
              <li className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-tech" /> Garantia e suporte técnico SOS.3D
              </li>
              <li className="flex items-center gap-2">
                <Check className="size-4 text-tech" /> Orientação de instalação e primeiros testes
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="container-page pb-16">
        <Tabs defaultValue="descricao">
          <TabsList>
            <TabsTrigger value="descricao">Descrição</TabsTrigger>
            <TabsTrigger value="specs">Especificações</TabsTrigger>
            <TabsTrigger value="entrega">Entrega e suporte</TabsTrigger>
          </TabsList>
          <TabsContent value="descricao" className="mt-6 max-w-3xl text-muted-foreground">
            <p className="leading-relaxed">{product.description}</p>
          </TabsContent>
          <TabsContent value="specs" className="mt-6">
            <dl className="max-w-3xl divide-y divide-border rounded-xl border border-border">
              {product.specs.map((s) => (
                <div key={s.label} className="grid gap-1 p-4 sm:grid-cols-[240px_1fr]">
                  <dt className="text-sm font-semibold">{s.label}</dt>
                  <dd className="text-sm text-muted-foreground">{s.value}</dd>
                </div>
              ))}
            </dl>
          </TabsContent>
          <TabsContent value="entrega" className="mt-6 max-w-3xl text-muted-foreground">
            <p className="leading-relaxed">
              Prazo de envio de 2 a 5 dias úteis para itens em estoque. Equipamentos incluem
              orientação de instalação, checklist de primeiros testes e canal direto de suporte para
              dúvidas técnicas. Consulte condições de garantia no ato da compra.
            </p>
          </TabsContent>
        </Tabs>
      </div>

      {related.length > 0 && (
        <div className="container-page pb-20">
          <h2 className="text-2xl font-bold">Produtos relacionados</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((p) => (
              <ProductCard key={p.slug} product={p} />
            ))}
          </div>
        </div>
      )}
    </>
  );
}
