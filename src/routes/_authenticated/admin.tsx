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
import { FooterAdmin } from "@/components/admin/FooterAdmin";
import { BrandsAdmin } from "@/components/admin/BrandsAdmin";
import { CategoriesAdmin } from "@/components/admin/CategoriesAdmin";
import { PrinterModelsAdmin } from "@/components/admin/PrinterModelsAdmin";
import { listPrinterModels } from "@/lib/printer-models.functions";
import { PricingAdmin } from "@/components/admin/PricingAdmin";
import { useCategories } from "@/lib/categories";
import { useSubcategories } from "@/lib/subcategories";
import { ProductsImport } from "@/components/admin/ProductsImport";
import { CoursesAdmin } from "@/components/admin/CoursesAdmin";
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
  category: string;
  subcategory: string;
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
  installments: string;
};

const emptyForm: FormState = {
  id: null,
  slug: "",
  name: "",
  brand: "",
  category: "impressoras",
  subcategory: "",
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
  installments: "",
};

function toNumberBR(raw: string) {
  const cleaned = raw.replace(/[^\d,.-]/g, "").trim();
  if (!cleaned) return 0;
  const normalized =
    cleaned.includes(",") && cleaned.lastIndexOf(",") > cleaned.lastIndexOf(".")
      ? cleaned.replace(/\./g, "").replace(",", ".")
      : cleaned.replace(/,/g, "");
  return Number(normalized) || 0;
}

function parseInstallments(raw: string) {
  return raw
    .split("\n")
    .map((line) => line.split("|"))
    .filter((parts) => parts.length >= 2)
    .map((parts) => {
      const months = Math.round(toNumberBR(parts[0] ?? ""));
      const installment = toNumberBR(parts[1] ?? "");
      const total = parts[2] ? toNumberBR(parts[2]) : months * installment;
      return { months, installment, total };
    })
    .filter((p) => p.months >= 2 && p.months <= 48 && p.installment > 0);
}

function AdminPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState | null>(null);
  const [filters, setFilters] = useState({
    text: "",
    brand: "all",
    category: "all",
    subcategory: "all",
    status: "all",
    priceMin: "",
    priceMax: "",
    stockMin: "",
    stockMax: "",
  });

  const { categories: categoryList } = useCategories();
  const { all: subcategoryList } = useSubcategories();

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

  const allProducts = data?.products ?? [];

  const brandOptions = useMemo(
    () => Array.from(new Set(allProducts.map((p) => p.brand).filter(Boolean))).sort(),
    [allProducts],
  );

  const filteredProducts = useMemo(() => {
    const text = filters.text.trim().toLowerCase();
    const priceMin = filters.priceMin === "" ? null : Number(filters.priceMin);
    const priceMax = filters.priceMax === "" ? null : Number(filters.priceMax);
    const stockMin = filters.stockMin === "" ? null : Number(filters.stockMin);
    const stockMax = filters.stockMax === "" ? null : Number(filters.stockMax);

    return allProducts.filter((p) => {
      if (filters.brand !== "all" && p.brand !== filters.brand) return false;
      if (filters.category !== "all" && p.category !== filters.category) return false;
      if (filters.subcategory !== "all") {
        const wanted = filters.subcategory === "none" ? "" : filters.subcategory;
        if ((p.subcategory ?? "") !== wanted) return false;
      }
      if (filters.status === "active" && !p.active) return false;
      if (filters.status === "inactive" && p.active) return false;
      if (text) {
        const haystack = [p.name, p.slug, p.subtitle, p.description, p.brand, p.badge]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(text)) return false;
      }
      const price = Number(p.price);
      if (priceMin !== null && !Number.isNaN(priceMin) && price < priceMin) return false;
      if (priceMax !== null && !Number.isNaN(priceMax) && price > priceMax) return false;
      if (stockMin !== null && !Number.isNaN(stockMin) && p.stock < stockMin) return false;
      if (stockMax !== null && !Number.isNaN(stockMax) && p.stock > stockMax) return false;
      return true;
    });
  }, [allProducts, filters]);


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
      subcategory: p.subcategory ?? "",
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
      installments: Array.isArray(p.installments)
        ? (p.installments as { months: number; installment: number; total: number }[])
            .map((i) => `${i.months} | ${i.installment} | ${i.total}`)
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
        subcategory: form.subcategory,
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
        installments: parseInstallments(form.installments),
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
          <TabsTrigger value="categorias">Categorias</TabsTrigger>
          <TabsTrigger value="importar">Importar</TabsTrigger>
          <TabsTrigger value="pedidos">Pedidos</TabsTrigger>
          <TabsTrigger value="membros">Membros</TabsTrigger>
          <TabsTrigger value="cursos">Cursos</TabsTrigger>
          <TabsTrigger value="banners">Banners</TabsTrigger>
          <TabsTrigger value="marcas">Marcas</TabsTrigger>
          <TabsTrigger value="regras">Regras</TabsTrigger>
          <TabsTrigger value="rodape">Rodapé</TabsTrigger>
        </TabsList>

        <TabsContent value="produtos" className="mt-6 space-y-3">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="xl:col-span-2">
                <Label className="text-xs">Buscar (nome, slug, descrição)</Label>
                <Input
                  className="mt-1 h-9"
                  placeholder="Ex.: PLA preto, impressora..."
                  value={filters.text}
                  onChange={(e) => setFilters((f) => ({ ...f, text: e.target.value }))}
                />
              </div>
              <div>
                <Label className="text-xs">Marca</Label>
                <Select
                  value={filters.brand}
                  onValueChange={(brand) => setFilters((f) => ({ ...f, brand }))}
                >
                  <SelectTrigger className="mt-1 h-9">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as marcas</SelectItem>
                    {brandOptions.map((b) => (
                      <SelectItem key={b} value={b}>
                        {b}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Categoria</Label>
                <Select
                  value={filters.category}
                  onValueChange={(category) => setFilters((f) => ({ ...f, category }))}
                >
                  <SelectTrigger className="mt-1 h-9">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as categorias</SelectItem>
                    {categoryList.map((c) => (
                      <SelectItem key={c.slug} value={c.slug}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Subcategoria</Label>
                <Select
                  value={filters.subcategory}
                  onValueChange={(subcategory) => setFilters((f) => ({ ...f, subcategory }))}
                >
                  <SelectTrigger className="mt-1 h-9">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as subcategorias</SelectItem>
                    <SelectItem value="none">Sem subcategoria</SelectItem>
                    {subcategoryList
                      .filter(
                        (s) => filters.category === "all" || s.category_slug === filters.category,
                      )
                      .map((s) => (
                        <SelectItem key={s.id} value={s.slug}>
                          {s.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Preço mín.</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    className="mt-1 h-9"
                    value={filters.priceMin}
                    onChange={(e) => setFilters((f) => ({ ...f, priceMin: e.target.value }))}
                  />
                </div>
                <div>
                  <Label className="text-xs">Preço máx.</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    className="mt-1 h-9"
                    value={filters.priceMax}
                    onChange={(e) => setFilters((f) => ({ ...f, priceMax: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Estoque mín.</Label>
                  <Input
                    type="number"
                    min={0}
                    className="mt-1 h-9"
                    value={filters.stockMin}
                    onChange={(e) => setFilters((f) => ({ ...f, stockMin: e.target.value }))}
                  />
                </div>
                <div>
                  <Label className="text-xs">Estoque máx.</Label>
                  <Input
                    type="number"
                    min={0}
                    className="mt-1 h-9"
                    value={filters.stockMax}
                    onChange={(e) => setFilters((f) => ({ ...f, stockMax: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">Situação</Label>
                <Select
                  value={filters.status}
                  onValueChange={(status) => setFilters((f) => ({ ...f, status }))}
                >
                  <SelectTrigger className="mt-1 h-9">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="active">Somente ativos</SelectItem>
                    <SelectItem value="inactive">Somente inativos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end justify-between gap-3">
                <p className="pb-2 text-xs text-muted-foreground">
                  {filteredProducts.length} de {allProducts.length} produtos
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mb-1"
                  onClick={() =>
                    setFilters({
                      text: "",
                      brand: "all",
                      category: "all",
                      subcategory: "all",
                      status: "all",
                      priceMin: "",
                      priceMax: "",
                      stockMin: "",
                      stockMax: "",
                    })
                  }
                >
                  Limpar filtros
                </Button>
              </div>
            </div>
          </div>

          {filteredProducts.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhum produto encontrado com os filtros atuais.
            </p>
          )}

          {filteredProducts.map((p) => (
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

        <TabsContent value="categorias" className="mt-6">
          <CategoriesAdmin />
        </TabsContent>

        <TabsContent value="importar" className="mt-6">
          <ProductsImport products={(data?.products ?? []) as never} />
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

        <TabsContent value="cursos" className="mt-6">
          <CoursesAdmin courses={(overview.data?.courses ?? []) as never} />
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

        <TabsContent value="marcas" className="mt-6">
          <BrandsAdmin />
        </TabsContent>

        <TabsContent value="regras" className="mt-6">
          <PricingAdmin />
        </TabsContent>

        <TabsContent value="rodape" className="mt-6">
          <FooterAdmin />
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
                  onValueChange={(v) =>
                    setForm({ ...form, category: v as FormState["category"], subcategory: "" })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryList.map((c) => (
                      <SelectItem key={c.slug} value={c.slug}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Subcategoria</Label>
                <Select
                  value={form.subcategory === "" ? "none" : form.subcategory}
                  onValueChange={(v) => setForm({ ...form, subcategory: v === "none" ? "" : v })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Sem subcategoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem subcategoria</SelectItem>
                    {subcategoryList
                      .filter((s) => s.category_slug === form.category)
                      .map((s) => (
                        <SelectItem key={s.id} value={s.slug}>
                          {s.name}
                        </SelectItem>
                      ))}
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
              <div className="sm:col-span-2">
                <Label>Parcelamento (uma por linha: parcelas | valor da parcela | valor total)</Label>
                <Textarea
                  className="mt-1 font-mono text-xs"
                  rows={5}
                  placeholder={"6 | 403,64 | 2421,84\n12 | 214,68 | 2576,16\n18 | 152,61 | 2746,98"}
                  value={form.installments}
                  onChange={(e) => setForm({ ...form, installments: e.target.value })}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Deixe em branco para usar o padrão de 12x sem juros. Se o total não for informado,
                  calculamos parcelas x valor.
                </p>
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
