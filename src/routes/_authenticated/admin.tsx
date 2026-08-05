import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Boxes, LayoutDashboard, Pencil, Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatBRL, imageFor } from "@/lib/catalog";
import { ImageUploader } from "@/components/site/ImageUploader";
import { bannerDefinitions, siteImagesQueryOptions } from "@/lib/site-images";
import { setSiteImage } from "@/lib/uploads.functions";
import {
  adminOverview,
  deleteProduct,
  quickUpdateProduct,
  saveProduct,
  setMembership,
  updateOrderStatus,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Painel administrativo | SOS.3D" },
      { name: "description", content: "Gestão de produtos, preços, estoque e pedidos SOS.3D." },
      { property: "og:title", content: "Painel administrativo | SOS.3D" },
      { property: "og:description", content: "Gestão interna da loja SOS.3D." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

const statusOptions = [
  "pendente",
  "pago",
  "em_producao",
  "enviado",
  "concluido",
  "cancelado",
] as const;

type FormState = {
  id: string | null;
  slug: string;
  name: string;
  brand: string;
  category: "impressoras" | "filamentos" | "acessorios";
  subtitle: string;
  description: string;
  price: string;
  old_price: string;
  image_key: string;
  image_url: string | null;
  badge: string;
  stock: string;
  active: boolean;
  use_cases: string;
  specs: string;
};

const emptyForm: FormState = {
  id: null,
  slug: "",
  name: "",
  brand: "",
  category: "impressoras",
  subtitle: "",
  description: "",
  price: "0",
  old_price: "",
  image_key: "printer-1",
  image_url: null,
  badge: "",
  stock: "0",
  active: true,
  use_cases: "",
  specs: "",
};

function AdminPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState | null>(null);

  const overview = useQuery({
    queryKey: ["admin-overview"],
    queryFn: () => adminOverview(),
    retry: false,
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
    void queryClient.invalidateQueries({ queryKey: ["products"] });
  };

  const save = useMutation({
    mutationFn: (input: { id: string | null; values: unknown }) =>
      saveProduct({ data: input } as never),
    onSuccess: () => {
      toast.success("Produto salvo");
      setForm(null);
      refresh();
    },
    onError: (e: Error) => toast.error("Erro ao salvar", { description: e.message }),
  });

  const quick = useMutation({
    mutationFn: (input: { id: string; price?: number; stock?: number; active?: boolean }) =>
      quickUpdateProduct({ data: input } as never),
    onSuccess: refresh,
    onError: (e: Error) => toast.error("Erro ao atualizar", { description: e.message }),
  });

  const removeProduct = useMutation({
    mutationFn: (input: { id: string }) => deleteProduct({ data: input } as never),
    onSuccess: () => {
      toast.success("Produto removido");
      refresh();
    },
    onError: (e: Error) => toast.error("Erro ao remover", { description: e.message }),
  });

  const orderStatus = useMutation({
    mutationFn: (input: { id: string; status: string }) =>
      updateOrderStatus({ data: input } as never),
    onSuccess: () => {
      toast.success("Status atualizado");
      refresh();
    },
    onError: (e: Error) => toast.error("Erro ao atualizar", { description: e.message }),
  });

  const membership = useMutation({
    mutationFn: (input: { userId: string; active: boolean }) =>
      setMembership({ data: input } as never),
    onSuccess: () => {
      toast.success("Acesso atualizado");
      refresh();
    },
    onError: (e: Error) => toast.error("Erro ao atualizar acesso", { description: e.message }),
  });

  const siteImages = useQuery(siteImagesQueryOptions);

  const banner = useMutation({
    mutationFn: (input: { key: string; url: string | null }) =>
      setSiteImage({ data: input } as never),
    onSuccess: () => {
      toast.success("Banner atualizado");
      void queryClient.invalidateQueries({ queryKey: ["site-images"] });
    },
    onError: (e: Error) => toast.error("Erro ao atualizar banner", { description: e.message }),
  });

  const data = overview.data;
  const totals = useMemo(() => {
    const orders = data?.orders ?? [];
    return {
      revenue: orders
        .filter((o) => o.status !== "cancelado")
        .reduce((s, o) => s + Number(o.total), 0),
      pending: orders.filter((o) => o.status === "pendente").length,
      lowStock: (data?.products ?? []).filter((p) => p.stock <= 3).length,
      members: (data?.memberships ?? []).filter((m) => m.active).length,
    };
  }, [data]);

  if (overview.isError) {
    return (
      <div className="container-page py-24 text-center">
        <h1 className="text-2xl font-bold">Acesso restrito</h1>
        <p className="mt-3 text-muted-foreground">
          Esta área é exclusiva para administradores da SOS.3D.
        </p>
        <Button className="mt-6" variant="outline" onClick={() => navigate({ to: "/portal" })}>
          Voltar ao portal
        </Button>
      </div>
    );
  }

  if (overview.isLoading) {
    return <div className="container-page py-24 text-muted-foreground">Carregando painel…</div>;
  }

  function openEdit(p: NonNullable<typeof data>["products"][number]) {
    setForm({
      id: p.id,
      slug: p.slug,
      name: p.name,
      brand: p.brand,
      category: p.category as FormState["category"],
      subtitle: p.subtitle ?? "",
      description: p.description ?? "",
      price: String(p.price),
      old_price: p.old_price != null ? String(p.old_price) : "",
      image_key: p.image_key,
      image_url: p.image_url ?? null,
      badge: p.badge ?? "",
      stock: String(p.stock),
      active: p.active,
      use_cases: (p.use_cases ?? []).join(", "),
      specs: Array.isArray(p.specs)
        ? (p.specs as { label: string; value: string }[])
            .map((s) => `${s.label} | ${s.value}`)
            .join("\n")
        : "",
    });
  }

  function submitForm() {
    if (!form) return;
    save.mutate({
      id: form.id,
      values: {
        slug: form.slug.trim(),
        name: form.name.trim(),
        brand: form.brand.trim(),
        category: form.category,
        subtitle: form.subtitle.trim(),
        description: form.description.trim(),
        price: Number(form.price) || 0,
        old_price: form.old_price ? Number(form.old_price) : null,
        image_key: form.image_key,
        image_url: form.image_url,
        badge: form.badge.trim() || null,
        stock: Number(form.stock) || 0,
        active: form.active,
        use_cases: form.use_cases
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        specs: form.specs
          .split("\n")
          .map((line) => line.split("|"))
          .filter((parts) => parts.length >= 2)
          .map((parts) => ({
            label: (parts[0] ?? "").trim(),
            value: parts.slice(1).join("|").trim(),
          })),
      },
    });
  }

  return (
    <div className="container-page py-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="eyebrow">Administração</span>
          <h1 className="mt-2 text-3xl font-bold md:text-4xl">Painel SOS.3D</h1>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to="/portal">Portal de membros</Link>
          </Button>
          <Button variant="cta" onClick={() => setForm({ ...emptyForm })}>
            <Plus /> Novo produto
          </Button>
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: LayoutDashboard, t: "Receita registrada", v: formatBRL(totals.revenue) },
          { icon: Boxes, t: "Pedidos pendentes", v: String(totals.pending) },
          { icon: Boxes, t: "Produtos com estoque baixo", v: String(totals.lowStock) },
          { icon: Users, t: "Membros ativos", v: String(totals.members) },
        ].map((k) => (
          <div key={k.t} className="rounded-xl border border-border bg-card p-5">
            <k.icon className="size-5 text-tech" />
            <p className="mt-3 text-xs uppercase tracking-wide text-muted-foreground">{k.t}</p>
            <p className="mt-1 text-2xl font-bold">{k.v}</p>
          </div>
        ))}
      </div>

      <Tabs defaultValue="produtos" className="mt-10">
        <TabsList>
          <TabsTrigger value="produtos">Produtos</TabsTrigger>
          <TabsTrigger value="pedidos">Pedidos</TabsTrigger>
          <TabsTrigger value="membros">Membros</TabsTrigger>
          <TabsTrigger value="banners">Banners</TabsTrigger>
        </TabsList>

        <TabsContent value="produtos" className="mt-6 space-y-3">
          {(data?.products ?? []).map((p) => (
            <div
              key={p.id}
              className="grid gap-4 rounded-xl border border-border bg-card p-4 lg:grid-cols-[1fr_auto]"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">{p.name}</p>
                  <Badge variant="secondary">{p.brand}</Badge>
                  {!p.active && <Badge variant="destructive">Inativo</Badge>}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">/{p.slug}</p>
              </div>
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <Label className="text-xs">Preço</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    defaultValue={String(p.price)}
                    className="mt-1 h-9 w-32"
                    onBlur={(e) => {
                      const price = Number(e.target.value);
                      if (price !== Number(p.price)) quick.mutate({ id: p.id, price });
                    }}
                  />
                </div>
                <div>
                  <Label className="text-xs">Estoque</Label>
                  <Input
                    type="number"
                    min={0}
                    defaultValue={String(p.stock)}
                    className="mt-1 h-9 w-24"
                    onBlur={(e) => {
                      const stock = Number(e.target.value);
                      if (stock !== p.stock) quick.mutate({ id: p.id, stock });
                    }}
                  />
                </div>
                <div className="flex items-center gap-2 pb-2">
                  <Switch
                    checked={p.active}
                    onCheckedChange={(active) => quick.mutate({ id: p.id, active })}
                  />
                  <span className="text-xs text-muted-foreground">Ativo</span>
                </div>
                <Button variant="outline" size="sm" onClick={() => openEdit(p)}>
                  <Pencil /> Editar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (window.confirm(`Remover ${p.name}?`)) removeProduct.mutate({ id: p.id });
                  }}
                >
                  <Trash2 />
                </Button>
              </div>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="pedidos" className="mt-6 space-y-3">
          {(data?.orders ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum pedido registrado ainda.</p>
          )}
          {(data?.orders ?? []).map((o) => (
            <div key={o.id} className="rounded-xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">
                    {o.reference} — {o.customer_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {o.customer_email} • {new Date(o.created_at).toLocaleString("pt-BR")}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-brand">{formatBRL(Number(o.total))}</span>
                  <Select
                    value={o.status}
                    onValueChange={(status) =>
                      orderStatus.mutate({
                        id: o.id,
                        status: status as (typeof statusOptions)[number],
                      })
                    }
                  >
                    <SelectTrigger className="h-9 w-44">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s.replace("_", " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <ul className="mt-3 text-sm text-muted-foreground">
                {o.order_items.map((i) => (
                  <li key={i.id}>
                    {i.qty}× {i.product_name} — {formatBRL(Number(i.unit_price))}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="membros" className="mt-6 space-y-3">
          {(data?.profiles ?? []).map((profile) => {
            const m = (data?.memberships ?? []).find((x) => x.user_id === profile.id);
            return (
              <div
                key={profile.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-4"
              >
                <div>
                  <p className="font-semibold">{profile.full_name || "Sem nome"}</p>
                  <p className="text-xs text-muted-foreground">{profile.email}</p>
                </div>
                <div className="flex items-center gap-3">
                  {m?.active && <Badge className="bg-success text-white">Membro ativo</Badge>}
                  <Switch
                    checked={Boolean(m?.active)}
                    onCheckedChange={(active) =>
                      membership.mutate({ userId: profile.id, active })
                    }
                  />
                  <span className="text-xs text-muted-foreground">Acesso ao portal</span>
                </div>
              </div>
            );
          })}
        </TabsContent>

        <TabsContent value="banners" className="mt-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            Troque as fotos das páginas do site. A alteração aparece imediatamente para os
            visitantes.
          </p>
          {bannerDefinitions.map((b) => (
            <div key={b.key} className="rounded-xl border border-border bg-card p-4">
              <p className="font-semibold">{b.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">{b.hint}</p>
              <div className="mt-3">
                <ImageUploader
                  label="Trocar foto"
                  value={siteImages.data?.find((i) => i.key === b.key)?.url ?? null}
                  fallback={b.fallback}
                  onChange={(url) => banner.mutate({ key: b.key, url })}
                />
              </div>
            </div>
          ))}
        </TabsContent>
      </Tabs>

      <Dialog open={form !== null} onOpenChange={(open) => !open && setForm(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{form?.id ? "Editar produto" : "Novo produto"}</DialogTitle>
          </DialogHeader>
          {form && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Nome</Label>
                <Input
                  className="mt-1"
                  maxLength={180}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <Label>Slug (URL)</Label>
                <Input
                  className="mt-1"
                  maxLength={120}
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                />
              </div>
              <div>
                <Label>Marca</Label>
                <Input
                  className="mt-1"
                  maxLength={80}
                  value={form.brand}
                  onChange={(e) => setForm({ ...form, brand: e.target.value })}
                />
              </div>
              <div>
                <Label>Categoria</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm({ ...form, category: v as FormState["category"] })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="impressoras">Impressoras 3D</SelectItem>
                    <SelectItem value="filamentos">Filamentos e insumos</SelectItem>
                    <SelectItem value="acessorios">Peças e acessórios</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Preço (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  className="mt-1"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                />
              </div>
              <div>
                <Label>Preço antigo (opcional)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  className="mt-1"
                  value={form.old_price}
                  onChange={(e) => setForm({ ...form, old_price: e.target.value })}
                />
              </div>
              <div>
                <Label>Estoque</Label>
                <Input
                  type="number"
                  min={0}
                  className="mt-1"
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: e.target.value })}
                />
              </div>
              <div>
                <Label>Selo (opcional)</Label>
                <Input
                  className="mt-1"
                  maxLength={40}
                  value={form.badge}
                  onChange={(e) => setForm({ ...form, badge: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Imagem do produto</Label>
                <div className="mt-2">
                  <ImageUploader
                    value={form.image_url}
                    fallback={imageFor(form.image_key, form.image_url)}
                    onChange={(url) => setForm({ ...form, image_url: url })}
                  />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  JPG, PNG, WEBP ou AVIF até 6MB. Sem imagem enviada, usamos a foto padrão da loja.
                </p>
              </div>
              <div className="flex items-center gap-3 pt-7">
                <Switch
                  checked={form.active}
                  onCheckedChange={(active) => setForm({ ...form, active })}
                />
                <span className="text-sm">Publicado na loja</span>
              </div>
              <div className="sm:col-span-2">
                <Label>Resumo</Label>
                <Input
                  className="mt-1"
                  maxLength={300}
                  value={form.subtitle}
                  onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Descrição</Label>
                <Textarea
                  className="mt-1"
                  rows={4}
                  maxLength={4000}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Aplicações (separadas por vírgula)</Label>
                <Input
                  className="mt-1"
                  value={form.use_cases}
                  onChange={(e) => setForm({ ...form, use_cases: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Especificações (uma por linha: rótulo | valor)</Label>
                <Textarea
                  className="mt-1"
                  rows={5}
                  value={form.specs}
                  onChange={(e) => setForm({ ...form, specs: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setForm(null)}>
                  Cancelar
                </Button>
                <Button variant="cta" onClick={submitForm} disabled={save.isPending}>
                  Salvar produto
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
