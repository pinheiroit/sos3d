import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatBRL } from "@/lib/catalog";
import { useCart } from "@/lib/cart";
import { shippingFor, usePricing } from "@/lib/pricing";

export const Route = createFileRoute("/carrinho")({
  head: () => ({
    meta: [
      { title: "Carrinho | SOS.3D" },
      { name: "description", content: "Revise os itens selecionados antes de finalizar seu pedido na SOS.3D." },
      { property: "og:title", content: "Carrinho | SOS.3D" },
      { property: "og:description", content: "Revise seus itens e finalize o pedido com suporte técnico SOS.3D." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const { items, subtotal, setQty, remove } = useCart();
  const rules = usePricing();
  const frete = shippingFor(subtotal, rules);

  return (
    <div className="container-page py-12">
      <h1 className="text-3xl font-bold md:text-4xl">Seu carrinho</h1>

      {items.length === 0 ? (
        <div className="mt-10 rounded-xl border border-dashed border-border p-14 text-center">
          <ShoppingBag className="mx-auto size-8 text-steel" />
          <p className="mt-4 text-lg font-semibold">Seu carrinho está vazio</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Explore o catálogo de impressoras, filamentos e acessórios.
          </p>
          <Button asChild variant="cta" className="mt-6">
            <Link to="/loja">Ir para a loja</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_360px]">
          <ul className="space-y-4">
            {items.map(({ product, qty }) => (
              <li
                key={product.slug}
                className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 sm:flex-row"
              >
                <img
                  src={product.image}
                  alt={product.name}
                  loading="lazy"
                  width={900}
                  height={900}
                  className="size-28 shrink-0 rounded-lg object-cover"
                />
                <div className="flex flex-1 flex-col">
                  <span className="eyebrow">{product.brand}</span>
                  <Link
                    to="/produto/$slug"
                    params={{ slug: product.slug }}
                    className="mt-1 font-semibold hover:text-tech"
                  >
                    {product.name}
                  </Link>
                  <p className="mt-1 text-sm text-muted-foreground">{product.subtitle}</p>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex h-10 items-center rounded-lg border border-border">
                      <button
                        className="grid h-full w-9 place-items-center text-muted-foreground hover:text-foreground"
                        onClick={() => setQty(product.slug, qty - 1)}
                        aria-label="Diminuir quantidade"
                      >
                        <Minus className="size-4" />
                      </button>
                      <span className="w-8 text-center text-sm font-semibold">{qty}</span>
                      <button
                        className="grid h-full w-9 place-items-center text-muted-foreground hover:text-foreground"
                        onClick={() => setQty(product.slug, qty + 1)}
                        aria-label="Aumentar quantidade"
                      >
                        <Plus className="size-4" />
                      </button>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-bold text-brand">{formatBRL(product.price * qty)}</span>
                      <button
                        onClick={() => remove(product.slug)}
                        className="text-muted-foreground transition-colors hover:text-destructive"
                        aria-label={`Remover ${product.name}`}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <aside className="h-fit rounded-xl border border-border bg-card p-6 lg:sticky lg:top-28">
            <h2 className="text-lg font-semibold">Resumo do pedido</h2>
            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd className="font-medium">{formatBRL(subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Frete estimado</dt>
                <dd className="font-medium">{frete === 0 ? "Grátis" : formatBRL(frete)}</dd>
              </div>
              <div className="flex justify-between border-t border-border pt-3 text-base">
                <dt className="font-semibold">Total</dt>
                <dd className="text-xl font-extrabold text-brand">{formatBRL(subtotal + frete)}</dd>
              </div>
            </dl>
            <Button asChild variant="cta" size="lg" className="mt-6 w-full">
              <Link to="/checkout">
                Finalizar compra <ArrowRight />
              </Link>
            </Button>
            <Button asChild variant="ghost" className="mt-2 w-full">
              <Link to="/loja">Continuar comprando</Link>
            </Button>
          </aside>
        </div>
      )}
    </div>
  );
}
