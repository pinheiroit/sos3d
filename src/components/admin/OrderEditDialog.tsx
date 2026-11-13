import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Minus, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatBRL } from "@/lib/catalog";
import { updatePendingOrderItems } from "@/lib/admin.functions";

export type EditableOrder = {
  id: string;
  reference: string;
  customer_name: string;
  subtotal: number | string;
  shipping: number | string;
  discount: number | string;
  total: number | string;
  order_items: {
    id: string;
    product_slug: string;
    product_name: string;
    unit_price: number | string;
    qty: number;
  }[];
};

type ProductOption = {
  slug: string;
  name: string;
  brand: string;
  price: number;
  stock: number;
  active: boolean;
};

type Line = {
  key: string;
  itemId?: string | undefined;
  slug: string;
  name: string;
  unitPrice: number;
  qty: number;
  isNew: boolean;
};

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function OrderEditDialog({
  order,
  products,
  onClose,
  onSaved,
}: {
  order: EditableOrder | null;
  products: ProductOption[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [lines, setLines] = useState<Line[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!order) return;
    setSearch("");
    setLines(
      order.order_items.map((i) => ({
        key: i.id,
        itemId: i.id,
        slug: i.product_slug,
        name: i.product_name,
        unitPrice: Number(i.unit_price),
        qty: i.qty,
        isNew: false,
      })),
    );
  }, [order]);

  const matches = useMemo(() => {
    const q = normalize(search.trim());
    if (!q) return [];
    return products
      .filter((p) => p.active && normalize(`${p.name} ${p.brand} ${p.slug}`).includes(q))
      .slice(0, 8);
  }, [products, search]);

  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.qty, 0);
  const originalSubtotal = order ? Number(order.subtotal) : 0;

  const save = useMutation({
    mutationFn: () => {
      if (!order) throw new Error("Selecione um pedido para editar.");
      return updatePendingOrderItems({
        data: {
          orderId: order.id,
          items: lines.map((l) => ({ itemId: l.itemId, slug: l.slug, qty: l.qty })),
        },
      } as never);
    },
    onSuccess: (result: { reference: string; total: number }) => {
      toast.success(`Pedido ${result.reference} atualizado`, {
        description: `Novo total ${formatBRL(Number(result.total))}`,
      });
      onSaved();
      onClose();
    },
    onError: (e: Error) => toast.error("Não foi possível salvar", { description: e.message }),
  });

  function addProduct(p: ProductOption) {
    setLines((prev) => {
      const found = prev.find((l) => l.slug === p.slug);
      if (found) return prev.map((l) => (l === found ? { ...l, qty: l.qty + 1 } : l));
      return [
        ...prev,
        { key: `new:${p.slug}`, slug: p.slug, name: p.name, unitPrice: p.price, qty: 1, isNew: true },
      ];
    });
    setSearch("");
  }

  function setQty(key: string, qty: number) {
    setLines((prev) =>
      prev.map((l) => (l.key === key ? { ...l, qty: Math.max(1, Math.min(999, Math.round(qty) || 1)) } : l)),
    );
  }

  return (
    <Dialog open={order !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex h-[min(90dvh,850px)] w-[calc(100%-1rem)] min-w-0 flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="min-w-0 shrink-0 border-b border-border px-4 py-4 pr-10 text-left sm:px-6">
          <DialogTitle className="break-words leading-snug">Editar pedido {order?.reference}</DialogTitle>
          <DialogDescription>
            {order?.customer_name}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 min-w-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-4 py-4 [scrollbar-gutter:stable] sm:px-6" role="region" aria-label="Produtos do pedido" tabIndex={0}>
        <div className="min-w-0">
          <Label htmlFor="order-edit-search">Adicionar produto</Label>
          <Input
            id="order-edit-search"
            className="mt-1"
            placeholder="Digite o nome ou a marca do produto"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {matches.length > 0 && (
            <div className="mt-2 max-h-48 space-y-1 overflow-y-auto overscroll-contain rounded-lg border border-border p-2">
              {matches.map((p) => (
                <Button
                  key={p.slug}
                  type="button"
                  variant="ghost"
                  className="grid h-auto w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded px-2 py-2 text-left text-sm"
                  onClick={() => addProduct(p)}
                >
                  <span className="min-w-0 whitespace-normal break-words">
                    {p.name} <span className="text-muted-foreground">· {p.brand}</span>
                  </span>
                  <span className="shrink-0 text-right text-muted-foreground">
                    {formatBRL(p.price)}<span className="block text-xs">{p.stock} un</span>
                  </span>
                </Button>
              ))}
            </div>
          )}
        </div>

        <div className="min-w-0 space-y-2">
          <p className="text-sm font-medium">Itens do pedido <span className="text-muted-foreground">({lines.length})</span></p>
          {lines.length === 0 && (
            <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
              O pedido precisa de ao menos um produto.
            </p>
          )}
          {lines.map((l) => (
            <div
              key={l.key}
              className="grid min-w-0 grid-cols-1 items-center gap-3 rounded-lg border border-border p-3 sm:grid-cols-[minmax(0,1fr)_auto]"
            >
              <div className="min-w-0 flex-1">
                <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                  <p className="min-w-0 break-words text-sm font-medium">{l.name}</p>
                  {l.isNew && (
                    <Badge variant="secondary" className="shrink-0 text-[10px]">
                      Novo
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatBRL(l.unitPrice)} cada · {formatBRL(l.unitPrice * l.qty)}
                </p>
              </div>
              <div className="flex shrink-0 items-center justify-end gap-1">
                <Button
                  size="icon"
                  variant="outline"
                  className="h-8 w-8"
                  aria-label="Diminuir quantidade"
                  onClick={() => setQty(l.key, l.qty - 1)}
                  disabled={l.qty <= 1}
                >
                  <Minus className="h-3.5 w-3.5" />
                </Button>
                <Input
                  type="number"
                  min={1}
                  aria-label={`Quantidade de ${l.name}`}
                  className="h-8 w-16 text-center"
                  value={l.qty}
                  onChange={(e) => setQty(l.key, Number(e.target.value))}
                />
                <Button
                  size="icon"
                  variant="outline"
                  className="h-8 w-8"
                  aria-label="Aumentar quantidade"
                  onClick={() => setQty(l.key, l.qty + 1)}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  aria-label={`Remover ${l.name}`}
                  onClick={() => setLines((prev) => prev.filter((x) => x.key !== l.key))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
        </div>

        <div className="shrink-0 space-y-3 border-t border-border bg-background px-4 py-4 sm:px-6">
        <div className="space-y-1 text-sm">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
            <span className="text-muted-foreground">Subtotal anterior</span>
            <span>{formatBRL(originalSubtotal)}</span>
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 font-semibold">
            <span>Novo subtotal (estimado)</span>
            <span>{formatBRL(subtotal)}</span>
          </div>
        </div>

        <DialogFooter className="grid grid-cols-2 gap-2 sm:flex sm:space-x-0">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="cta"
            disabled={lines.length === 0 || save.isPending}
            onClick={() => save.mutate()}
          >
            {save.isPending ? "Salvando…" : "Salvar alterações"}
          </Button>
        </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
