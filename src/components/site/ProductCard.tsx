import { Link } from "@tanstack/react-router";
import { ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatBRL, type Product } from "@/lib/catalog";
import { useCart } from "@/lib/cart";
import { maxQuote, usePricing } from "@/lib/pricing";

export function ProductCard({ product }: { product: Product }) {
  const { add } = useCart();
  const rules = usePricing();
  const pix = product.price * (1 - rules.pixDiscountPercent / 100);
  const plan = maxQuote(product, rules);
  const installment = plan ? plan.installment : product.price / rules.defaultInstallments;
  const months = plan ? plan.months : rules.defaultInstallments;

  return (
    <article className="card-lift group flex min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-card sm:rounded-xl">
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
        <div className="absolute left-2 top-2 flex flex-col items-start gap-1.5 sm:left-3 sm:top-3">
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

      <div className="flex min-w-0 flex-1 flex-col p-2.5 sm:p-4">
        <span className="truncate text-[10px] font-semibold uppercase text-tech sm:text-xs">{product.brand}</span>
        <h3 className="mt-1 line-clamp-2 min-h-10 text-xs font-semibold leading-5 sm:mt-1.5 sm:text-sm sm:leading-snug">
          <Link
            to="/produto/$slug"
            params={{ slug: product.slug }}
            className="transition-colors hover:text-tech"
          >
            {product.name}
          </Link>
        </h3>

        <div className="mt-auto min-w-0 pt-2.5 sm:pt-4">
          {product.oldPrice && (
            <p className="text-xs text-muted-foreground line-through">
              {formatBRL(product.oldPrice)}
            </p>
          )}
          <p className="truncate text-base font-bold text-brand sm:text-xl">{formatBRL(product.price)}</p>
          {rules.pixDiscountPercent > 0 && (
            <p className="text-xs font-medium text-success">
              {formatBRL(pix)} à vista no Pix ({rules.pixDiscountPercent}% off)
            </p>
          )}
          <p className="mt-0.5 line-clamp-2 min-h-8 text-[10px] leading-4 text-muted-foreground sm:text-xs">
            ou até {months}x de {formatBRL(installment)}
            {plan ? ` (total ${formatBRL(plan.total)})` : " com juros"}
          </p>


          <div className="mt-2.5 flex gap-2 sm:mt-4">
            <Button
              variant="cta"
              className="h-9 min-w-0 flex-1 gap-1 px-2 text-xs sm:h-10 sm:gap-2 sm:px-4 sm:text-sm"
              onClick={() => {
                add(product.slug);
                toast.success("Adicionado ao carrinho", { description: product.name });
              }}
            >
              <ShoppingCart /> Comprar
            </Button>
            <Button asChild variant="outline" size="icon" className="hidden sm:inline-flex" aria-label="Ver detalhes">
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
