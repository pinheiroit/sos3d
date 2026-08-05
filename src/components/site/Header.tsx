import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, ShoppingCart, Headset, X, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/site/Logo";
import { useCart } from "@/lib/cart";
import { useSession } from "@/lib/session";

const nav = [
  { to: "/loja", label: "Loja" },
  { to: "/impressoras", label: "Impressoras 3D" },
  { to: "/filamentos", label: "Filamentos" },
  { to: "/impressao-3d", label: "Impressão sob demanda" },
  { to: "/makers", label: "Área Maker" },
  { to: "/suporte", label: "Suporte" },
  { to: "/empresa", label: "Empresa" },
] as const;

export function Header() {
  const [open, setOpen] = useState(false);
  const { count } = useCart();
  const { session } = useSession();

  return (
    <header className="sticky top-0 z-50 w-full">
      <div className="hidden bg-brand text-brand-foreground md:block">
        <div className="container-page flex h-9 items-center justify-between text-xs">
          <p className="text-white/80">
            Atendimento especializado • Equipamentos, materiais e suporte técnico
          </p>
          <div className="flex items-center gap-5">
            <Link to="/suporte" className="text-white/80 transition-colors hover:text-white">
              Abrir chamado
            </Link>
            <Link to="/contato" className="text-white/80 transition-colors hover:text-white">
              Falar com especialista
            </Link>
            <Link
              to={session ? "/portal" : "/auth"}
              className="text-white/80 transition-colors hover:text-white"
            >
              {session ? "Portal de membros" : "Entrar"}
            </Link>
          </div>
        </div>
      </div>

      <div className="border-b border-border bg-background/95 backdrop-blur">
        <div className="container-page flex h-[70px] items-center justify-between gap-4">
          <Logo />

          <nav className="hidden items-center gap-1 lg:flex">
            {nav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeProps={{ className: "text-tech bg-secondary" }}
                className="rounded-md px-3 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-secondary hover:text-tech"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="icon" className="relative" aria-label="Carrinho">
              <Link to="/carrinho">
                <ShoppingCart />
                {count > 0 && (
                  <Badge className="absolute -right-1 -top-1 h-5 min-w-5 justify-center bg-accent px-1 text-[11px] text-accent-foreground">
                    {count}
                  </Badge>
                )}
              </Link>
            </Button>
            <Button asChild variant="ghost" size="icon" aria-label="Minha conta">
              <Link to={session ? "/portal" : "/auth"}>
                <UserRound />
              </Link>
            </Button>
            <Button asChild variant="cta" className="hidden sm:inline-flex">
              <Link to="/contato">
                <Headset /> Solicitar orçamento
              </Link>
            </Button>
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

        {open && (
          <nav className="border-t border-border bg-background px-5 py-3 lg:hidden">
            {nav.map((item) => (
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
              {session ? "Portal de membros" : "Entrar / criar conta"}
            </Link>
            <Button asChild variant="cta" className="mt-3 w-full">
              <Link to="/contato" onClick={() => setOpen(false)}>
                Solicitar orçamento
              </Link>
            </Button>
          </nav>
        )}
      </div>
    </header>
  );
}
