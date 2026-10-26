import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { type Product } from "@/lib/catalog";
import { useProducts } from "@/lib/products";
import { captureVisit, currentDevice, getCartSessionId, resetCartSessionId } from "@/lib/cart-tracking";
import { trackCart } from "@/lib/cart-tracking.functions";

type CheckoutContact = { name: string; email: string; phone: string };

export type CartLine = { slug: string; qty: number };

type CartContextValue = {
  lines: CartLine[];
  items: { product: Product; qty: number }[];
  count: number;
  subtotal: number;
  add: (slug: string, qty?: number) => void;
  setQty: (slug: string, qty: number) => void;
  remove: (slug: string) => void;
  clear: () => void;
  /** Informa que o visitante chegou ao checkout e os contatos digitados. */
  trackCheckout: (contact?: CheckoutContact) => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "sos3d.cart.v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [syncTick, setSyncTick] = useState(0);
  const contactRef = useRef<CheckoutContact | null>(null);
  const checkoutRef = useRef(false);
  const { products } = useProducts();

  useEffect(() => {
    captureVisit();
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setLines(JSON.parse(raw) as CartLine[]);
    } catch {
      /* ignora storage indisponível */
    }
    setLoaded(true);
  }, []);

  // Sincroniza o carrinho com o servidor (carrinhos abandonados), com atraso para agrupar mudanças.
  useEffect(() => {
    if (!loaded) return;
    const timer = window.setTimeout(() => {
      const contact = contactRef.current;
      trackCart({
        data: {
          id: getCartSessionId(),
          items: lines.slice(0, 50).map((l) => ({ slug: l.slug, qty: Math.min(999, Math.max(1, l.qty)) })),
          contact: contact ?? undefined,
          visit: captureVisit(),
          lastPage: `${window.location.pathname}`.slice(0, 300),
          device: currentDevice(),
          reachedCheckout: checkoutRef.current,
        },
      })
        .then((r) => {
          if (r?.converted) resetCartSessionId();
        })
        .catch(() => undefined);
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [lines, loaded, syncTick]);

  const trackCheckout = useCallback((contact?: CheckoutContact) => {
    checkoutRef.current = true;
    if (contact) contactRef.current = contact;
    setSyncTick((t) => t + 1);
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      /* ignora storage indisponível */
    }
  }, [lines]);

  const add = useCallback((slug: string, qty = 1) => {
    setLines((prev) => {
      const found = prev.find((l) => l.slug === slug);
      if (found) return prev.map((l) => (l.slug === slug ? { ...l, qty: l.qty + qty } : l));
      return [...prev, { slug, qty }];
    });
  }, []);

  const setQty = useCallback((slug: string, qty: number) => {
    setLines((prev) =>
      qty <= 0 ? prev.filter((l) => l.slug !== slug) : prev.map((l) => (l.slug === slug ? { ...l, qty } : l)),
    );
  }, []);

  const remove = useCallback((slug: string) => {
    setLines((prev) => prev.filter((l) => l.slug !== slug));
  }, []);

  const clear = useCallback(() => {
    contactRef.current = null;
    checkoutRef.current = false;
    setLines([]);
  }, []);

  const value = useMemo<CartContextValue>(() => {
    const items = lines
      .map((l) => {
        const product = products.find((p) => p.slug === l.slug);
        return product ? { product, qty: l.qty } : null;
      })
      .filter((i): i is { product: Product; qty: number } => i !== null);

    return {
      lines,
      items,
      count: items.reduce((s, i) => s + i.qty, 0),
      subtotal: items.reduce((s, i) => s + i.qty * i.product.price, 0),
      add,
      setQty,
      remove,
      clear,
      trackCheckout,
    };
  }, [lines, products, add, setQty, remove, clear, trackCheckout]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart deve ser usado dentro de CartProvider");
  return ctx;
}
