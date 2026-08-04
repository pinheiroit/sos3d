import { Link } from "@tanstack/react-router";
import { ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatBRL, type Product } from "@/lib/catalog";
import { useCart } from "@/lib/cart";

export function ProductCard({ product }: { product: Product }) {
  const { add } = useCart();

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
        {product.badge && (
          <Badge className="absolute left-3 top-3 bg-accent text-accent-foreground">
            {product.badge}
          </Badge>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <span className="eyebrow">{product.brand}</span>
        <h3 className="mt-1.5 text-base font-semibold leading-snug">
          <Link
            to="/produto/$slug"
            params={{ slug: product.slug }}
            className="transition-colors hover:text-tech"
          >
            {product.name}
          </Link>
        </h3>
        <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{product.subtitle}</p>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {product.useCases.slice(0, 2).map((u) => (
            <span
              key={u}
              className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-muted-foreground"
            >
              {u}
            </span>
          ))}
        </div>

        <div className="mt-auto pt-5">
          {product.oldPrice && (
            <p className="text-xs text-muted-foreground line-through">
              {formatBRL(product.oldPrice)}
            </p>
          )}
          <p className="text-xl font-bold text-brand">{formatBRL(product.price)}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            até 12x • {product.stock > 0 ? `${product.stock} em estoque` : "sob consulta"}
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
            <Button asChild variant="outline">
              <Link to="/produto/$slug" params={{ slug: product.slug }}>
                Detalhes
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}
