import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatBRL } from "@/lib/catalog";
import {
  createSalesOrder,
  deleteCustomer,
  listCustomers,
  saveCustomer,
} from "@/lib/admin.functions";

type CustomerForm = {
  id?: string;
  name: string;
  email: string;
  phone: string;
  document: string;
  zip: string;
  street: string;
  number: string;
  complement: string;
  city: string;
  state: string;
  notes: string;
};

const emptyCustomer: CustomerForm = {
  name: "",
  email: "",
  phone: "",
  document: "",
  zip: "",
  street: "",
  number: "",
  complement: "",
  city: "",
  state: "",
  notes: "",
};

type ProductOption = {
  slug: string;
  name: string;
  brand: string;
  price: number;
  stock: number;
  active: boolean;
};

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function TeleSalesAdmin({ products }: { products: ProductOption[] }) {
  const queryClient = useQueryClient();
  const customers = useQuery({
    queryKey: ["admin-customers"],
    queryFn: () => listCustomers(),
    retry: false,
  });

  const [search, setSearch] = useState("");
  const [form, setForm] = useState<CustomerForm | null>(null);

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [productSearch, setProductSearch] = useState("");
  const [items, setItems] = useState<{ slug: string; qty: number }[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "boleto" | "cartao">("pix");
  const [installmentMonths, setInstallmentMonths] = useState("1");
  const [status, setStatus] = useState("pendente");
  const [orderNotes, setOrderNotes] = useState("");

  const rows = customers.data ?? [];
  const filtered = useMemo(() => {
    const q = normalize(search.trim());
    if (!q) return rows;
    return rows.filter((c) =>
      normalize(`${c.name} ${c.email} ${c.phone} ${c.document} ${c.city}`).includes(q),
    );
  }, [rows, search]);

  const selectedCustomer = rows.find((c) => c.id === selectedCustomerId) ?? null;

  const productMatches = useMemo(() => {
    const q = normalize(productSearch.trim());
    if (!q) return [];
    return products
      .filter((p) => normalize(`${p.name} ${p.brand} ${p.slug}`).includes(q))
      .slice(0, 8);
  }, [products, productSearch]);

  const cart = items
    .map((i) => ({ ...i, product: products.find((p) => p.slug === i.slug) }))
    .filter((i) => i.product);
  const subtotal = cart.reduce((s, i) => s + (i.product?.price ?? 0) * i.qty, 0);

  const saveCustomerMutation = useMutation({
    mutationFn: (values: CustomerForm) => saveCustomer({ data: values } as never),
    onSuccess: () => {
      toast.success("Cliente salvo");
      setForm(null);
      void queryClient.invalidateQueries({ queryKey: ["admin-customers"] });
    },
    onError: (e: Error) => toast.error("Erro ao salvar cliente", { description: e.message }),
  });

  const removeCustomerMutation = useMutation({
    mutationFn: (id: string) => deleteCustomer({ data: { id } } as never),
    onSuccess: () => {
      toast.success("Cliente removido");
      void queryClient.invalidateQueries({ queryKey: ["admin-customers"] });
    },
    onError: (e: Error) => toast.error("Erro ao remover", { description: e.message }),
  });

  const createOrderMutation = useMutation({
    mutationFn: (input: unknown) => createSalesOrder({ data: input } as never),
    onSuccess: (result: { reference: string; total: number }) => {
      toast.success(`Pedido ${result.reference} criado`, {
        description: `Total ${formatBRL(result.total)}`,
      });
      setItems([]);
      setOrderNotes("");
      void queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
      void queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (e: Error) => toast.error("Erro ao gerar pedido", { description: e.message }),
  });

  function addItem(slug: string) {
    setItems((prev) => {
      const existing = prev.find((i) => i.slug === slug);
      if (existing) return prev.map((i) => (i.slug === slug ? { ...i, qty: i.qty + 1 } : i));
      return [...prev, { slug, qty: 1 }];
    });
    setProductSearch("");
  }

  function submitOrder() {
    if (!selectedCustomer) {
      toast.error("Selecione um cliente");
      return;
    }
    if (items.length === 0) {
      toast.error("Adicione ao menos um produto");
      return;
    }
    createOrderMutation.mutate({
      customerId: selectedCustomer.id,
      customer: {
        name: selectedCustomer.name,
        email: selectedCustomer.email,
        phone: selectedCustomer.phone,
        document: selectedCustomer.document,
        zip: selectedCustomer.zip,
        street: selectedCustomer.street,
        number: selectedCustomer.number,
        complement: selectedCustomer.complement,
        city: selectedCustomer.city,
        state: selectedCustomer.state,
      },
      paymentMethod,
      installmentMonths: paymentMethod === "cartao" ? Number(installmentMonths) || 1 : undefined,
      status,
      notes: orderNotes,
      items,
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <section className="rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-semibold">Clientes</h3>
          <Button variant="cta" size="sm" onClick={() => setForm({ ...emptyCustomer })}>
            <UserPlus className="mr-2 h-4 w-4" /> Novo cliente
          </Button>
        </div>
        <Input
          className="mt-3"
          placeholder="Buscar por nome, e-mail, telefone ou documento"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="mt-3 max-h-[480px] space-y-2 overflow-y-auto">
          {customers.isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
          {!customers.isLoading && filtered.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum cliente cadastrado ainda.</p>
          )}
          {filtered.map((c) => (
            <div
              key={c.id}
              className={`rounded-lg border p-3 ${
                selectedCustomerId === c.id ? "border-primary bg-primary/5" : "border-border"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-medium">{c.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {[c.phone, c.email, c.city].filter(Boolean).join(" · ") || "Sem contato"}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant={selectedCustomerId === c.id ? "cta" : "outline"}
                    onClick={() => setSelectedCustomerId(c.id)}
                  >
                    {selectedCustomerId === c.id ? "Selecionado" : "Vender"}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Editar cliente"
                    onClick={() => setForm({ ...emptyCustomer, ...c })}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Remover cliente"
                    onClick={() => {
                      if (confirm(`Remover ${c.name}?`)) removeCustomerMutation.mutate(c.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-lg font-semibold">Pedido de venda (televendas)</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {selectedCustomer
            ? `Cliente: ${selectedCustomer.name}`
            : "Selecione um cliente na lista ao lado."}
        </p>

        <div className="mt-4">
          <Label>Adicionar produto</Label>
          <Input
            className="mt-1"
            placeholder="Digite o nome ou a marca do produto"
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
          />
          {productMatches.length > 0 && (
            <div className="mt-2 space-y-1 rounded-lg border border-border p-2">
              {productMatches.map((p) => (
                <button
                  key={p.slug}
                  type="button"
                  className="flex w-full items-center justify-between gap-2 rounded px-2 py-1 text-left text-sm hover:bg-muted"
                  onClick={() => addItem(p.slug)}
                >
                  <span className="min-w-0 truncate">
                    {p.name} <span className="text-muted-foreground">· {p.brand}</span>
                  </span>
                  <span className="shrink-0 text-muted-foreground">
                    {formatBRL(p.price)} · {p.stock} un
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 space-y-2">
          {cart.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum item no pedido.</p>
          )}
          {cart.map((i) => (
            <div
              key={i.slug}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{i.product?.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatBRL(i.product?.price ?? 0)} · estoque {i.product?.stock}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  className="h-9 w-20"
                  value={i.qty}
                  onChange={(e) =>
                    setItems((prev) =>
                      prev.map((it) =>
                        it.slug === i.slug
                          ? { ...it, qty: Math.max(1, Math.round(Number(e.target.value) || 1)) }
                          : it,
                      ),
                    )
                  }
                />
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Remover item"
                  onClick={() => setItems((prev) => prev.filter((it) => it.slug !== i.slug))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Forma de pagamento</Label>
            <Select
              value={paymentMethod}
              onValueChange={(v) => setPaymentMethod(v as typeof paymentMethod)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pix">Pix</SelectItem>
                <SelectItem value="boleto">Boleto</SelectItem>
                <SelectItem value="cartao">Cartão</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {paymentMethod === "cartao" && (
            <div>
              <Label>Parcelas (com juros)</Label>
              <Select value={installmentMonths} onValueChange={setInstallmentMonths}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, idx) => idx + 1).map((m) => (
                    <SelectItem key={m} value={String(m)}>
                      {m}x
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label>Situação do pedido</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="pago">Pago</SelectItem>
                <SelectItem value="em_producao">Em produção</SelectItem>
                <SelectItem value="enviado">Enviado</SelectItem>
                <SelectItem value="concluido">Concluído</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-3">
          <Label>Observações</Label>
          <Textarea
            className="mt-1"
            rows={2}
            maxLength={1000}
            value={orderNotes}
            onChange={(e) => setOrderNotes(e.target.value)}
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
          <div>
            <p className="text-sm text-muted-foreground">Estimativa de subtotal</p>
            <p className="text-xl font-semibold">{formatBRL(subtotal)}</p>
            <p className="text-xs text-muted-foreground">
              Frete, descontos e juros são calculados no fechamento do pedido.
            </p>
          </div>
          <Button
            variant="cta"
            disabled={createOrderMutation.isPending}
            onClick={submitOrder}
          >
            <Plus className="mr-2 h-4 w-4" />
            {createOrderMutation.isPending ? "Gerando…" : "Gerar pedido"}
          </Button>
        </div>
      </section>

      <Dialog open={form !== null} onOpenChange={(open) => !open && setForm(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{form?.id ? "Editar cliente" : "Novo cliente"}</DialogTitle>
          </DialogHeader>
          {form && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Nome*</Label>
                <Input
                  className="mt-1"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <Label>E-mail</Label>
                <Input
                  className="mt-1"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input
                  className="mt-1"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div>
                <Label>CPF / CNPJ</Label>
                <Input
                  className="mt-1"
                  value={form.document}
                  onChange={(e) => setForm({ ...form, document: e.target.value })}
                />
              </div>
              <div>
                <Label>CEP</Label>
                <Input
                  className="mt-1"
                  value={form.zip}
                  onChange={(e) => setForm({ ...form, zip: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Endereço</Label>
                <Input
                  className="mt-1"
                  value={form.street}
                  onChange={(e) => setForm({ ...form, street: e.target.value })}
                />
              </div>
              <div>
                <Label>Número</Label>
                <Input
                  className="mt-1"
                  value={form.number}
                  onChange={(e) => setForm({ ...form, number: e.target.value })}
                />
              </div>
              <div>
                <Label>Complemento</Label>
                <Input
                  className="mt-1"
                  value={form.complement}
                  onChange={(e) => setForm({ ...form, complement: e.target.value })}
                />
              </div>
              <div>
                <Label>Cidade</Label>
                <Input
                  className="mt-1"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                />
              </div>
              <div>
                <Label>Estado</Label>
                <Input
                  className="mt-1"
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Observações</Label>
                <Textarea
                  className="mt-1"
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-2 sm:col-span-2">
                <Button variant="outline" onClick={() => setForm(null)}>
                  Cancelar
                </Button>
                <Button
                  variant="cta"
                  disabled={saveCustomerMutation.isPending}
                  onClick={() => saveCustomerMutation.mutate(form)}
                >
                  Salvar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {selectedCustomer && (
        <Badge className="hidden" aria-hidden>
          {selectedCustomer.id}
        </Badge>
      )}
    </div>
  );
}
