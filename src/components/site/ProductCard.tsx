import { Link } from "@tanstack/react-router";
import { ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { bestPlan, formatBRL, type Product } from "@/lib/catalog";
import { useCart } from "@/lib/cart";

export function ProductCard({ product }: { product: Product }) {
  const { add } = useCart();
  const pix = product.price * 0.95;
  const plan = bestPlan(product.installments);
  const installment = plan ? plan.installment : product.price / 12;
  const months = plan ? plan.months : 12;
  const off = product.oldPrice
    ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)
    : 0;

  return (
    <article className="card-lift group flex flex-col overflow-hidden rounded-xl border border-border bg-card">
      <Link
        to="/produto/$slug"
        params={{ slug: product.slug }}
        className="relative block aspect-square overflow-hidden bg-secondary"
      >
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          width={900}
          height={900}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />
        <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
          {off > 0 && (
            <Badge className="bg-accent text-accent-foreground">-{off}%</Badge>
          )}
          {product.badge && (
            <Badge className="bg-brand text-brand-foreground">{product.badge}</Badge>
          )}
        </div>
        {product.stock === 0 && (
          <span className="absolute inset-x-0 bottom-0 bg-brand/85 py-1.5 text-center text-xs font-semibold text-brand-foreground">
            Sob consulta
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <span className="eyebrow">{product.brand}</span>
        <h3 className="mt-1.5 line-clamp-2 text-sm font-semibold leading-snug">
          <Link
            to="/produto/$slug"
            params={{ slug: product.slug }}
            className="transition-colors hover:text-tech"
          >
            {product.name}
          </Link>
        </h3>

        <div className="mt-auto pt-4">
          {product.oldPrice && (
            <p className="text-xs text-muted-foreground line-through">
              {formatBRL(product.oldPrice)}
            </p>
          )}
          <p className="text-xl font-bold text-brand">{formatBRL(product.price)}</p>
          <p className="text-xs font-medium text-success">
            {formatBRL(pix)} à vista no Pix (5% off)
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            ou até {months}x de {formatBRL(installment)}
            {plan ? ` (total ${formatBRL(plan.total)})` : " sem juros"}
          </p>

          <div className="mt-4 flex gap-2">
            <Button
              variant="cta"
              className="flex-1"
              onClick={() => {
                add(product.slug);
                toast.success("Adicionado ao carrinho", { description: product.name });
              }}
            >
              <ShoppingCart /> Comprar
            </Button>
            <Button asChild variant="outline" size="icon" aria-label="Ver detalhes">
              <Link to="/produto/$slug" params={{ slug: product.slug }}>
                +
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}
