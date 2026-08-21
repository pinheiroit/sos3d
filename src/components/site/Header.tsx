import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Menu,
  ShoppingCart,
  Search,
  X,
  UserRound,
  Truck,
  CreditCard,
  Headset,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/site/Logo";
import { useCart } from "@/lib/cart";
import { useSession } from "@/lib/session";
import { formatBRL } from "@/lib/catalog";

const departments = [
  { to: "/loja", label: "Todos os produtos" },
  { to: "/impressoras", label: "Impressoras 3D" },
  { to: "/filamentos", label: "Filamentos" },
  { to: "/impressao-3d", label: "Impressão sob demanda" },
  { to: "/makers", label: "Área Maker" },
  { to: "/suporte", label: "Suporte" },
  { to: "/empresa", label: "Empresa" },
] as const;

export function Header() {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const { count, subtotal } = useCart();
  const { session } = useSession();
  const navigate = useNavigate();

  function submitSearch(e: FormEvent) {
    e.preventDefault();
    setOpen(false);
    const q = term.trim();
    navigate({ to: "/loja", search: q ? { q } : {} });
  }

  return (
    <header className="sticky top-0 z-50 w-full">
      <div className="bg-brand text-brand-foreground">
        <div className="container-page flex h-9 items-center justify-between gap-4 text-xs">
          <p className="flex items-center gap-2 text-white/85">
            <Truck className="size-3.5 shrink-0" />
            <span className="hidden sm:inline">Envio para todo o Brasil</span>
            <span className="sm:hidden">Envio nacional</span>
            
          </p>
          <div className="flex items-center gap-5">
            <Link to="/suporte" className="hidden text-white/80 hover:text-white md:inline">
              Rastrear / Suporte
            </Link>
            <Link to={session ? "/portal" : "/auth"} className="text-white/80 hover:text-white">
              {session ? "Minha conta" : "Entrar"}
            </Link>
          </div>
        </div>
      </div>

      <div className="border-b border-border bg-background/95 backdrop-blur">
        <div className="container-page flex h-[74px] items-center gap-4">
          <Logo />

          <form
            onSubmit={submitSearch}
            role="search"
            className="relative hidden flex-1 md:block"
            aria-label="Buscar produtos"
          >
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Busque por impressora, filamento, marca..."
              className="h-11 rounded-full pl-10 pr-28"
            />
            <Button
              type="submit"
              variant="cta"
              className="absolute right-1 top-1 h-9 rounded-full px-5"
            >
              Buscar
            </Button>
          </form>

          <div className="ml-auto flex items-center gap-2">
            <Button asChild variant="ghost" size="icon" aria-label="Minha conta">
              <Link to={session ? "/portal" : "/auth"}>
                <UserRound />
              </Link>
            </Button>

            <Link
              to="/carrinho"
              className="relative flex items-center gap-2.5 rounded-full border border-border px-3 py-2 transition-colors hover:bg-secondary"
            >
              <span className="relative">
                <ShoppingCart className="size-5 text-tech" />
                {count > 0 && (
                  <Badge className="absolute -right-2.5 -top-2 h-4.5 min-w-4.5 justify-center bg-accent px-1 text-[10px] text-accent-foreground">
                    {count}
                  </Badge>
                )}
              </span>
              <span className="hidden text-left leading-tight lg:block">
                <span className="block text-[11px] text-muted-foreground">Carrinho</span>
                <span className="block text-sm font-semibold">{formatBRL(subtotal)}</span>
              </span>
            </Link>

            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              aria-label={open ? "Fechar menu" : "Abrir menu"}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <X /> : <Menu />}
            </Button>
          </div>
        </div>

        <nav className="hidden border-t border-border bg-secondary/40 lg:block">
          <div className="container-page flex h-11 items-center gap-1">
            {departments.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeProps={{ className: "text-tech" }}
                className="rounded-md px-3 py-1.5 text-sm font-medium text-foreground/80 transition-colors hover:bg-background hover:text-tech"
              >
                {item.label}
              </Link>
            ))}
            <span className="ml-auto flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <CreditCard className="size-3.5 text-tech" /> Parcele em até 12x
              </span>
              <Link to="/contato" className="flex items-center gap-1.5 hover:text-tech">
                <Headset className="size-3.5 text-tech" /> Orçamento para empresas
              </Link>
            </span>
          </div>
        </nav>

        {open && (
          <div className="border-t border-border bg-background px-5 py-3 lg:hidden">
            <form onSubmit={submitSearch} role="search" className="relative mb-3">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="O que você procura?"
                className="h-11 rounded-full pl-9"
              />
            </form>
            {departments.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className="block rounded-md px-2 py-3 text-sm font-medium text-foreground/85 hover:bg-secondary"
              >
                {item.label}
              </Link>
            ))}
            <Link
              to={session ? "/portal" : "/auth"}
              onClick={() => setOpen(false)}
              className="block rounded-md px-2 py-3 text-sm font-medium text-foreground/85 hover:bg-secondary"
            >
              {session ? "Minha conta" : "Entrar / criar conta"}
            </Link>
            <Button asChild variant="cta" className="mt-3 w-full">
              <Link to="/loja" onClick={() => setOpen(false)}>
                Ver ofertas
              </Link>
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
