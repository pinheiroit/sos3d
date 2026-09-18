import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Boxes,
  ChevronDown,
  CircleDollarSign,
  FileSpreadsheet,
  GraduationCap,
  Image,
  LayoutDashboard,
  Menu,
  Package,
  Palette,
  Pencil,
  Plus,
  ReceiptText,
  Search,
  Settings,
  ShoppingCart,
  Store,
  Tags,
  Trash2,
  Truck,
  Users,
} from "lucide-react";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { formatBRL, imageFor } from "@/lib/catalog";
import { ImageUploader } from "@/components/site/ImageUploader";
import { bannerDefinitions, logoDefinitions, siteImagesQueryOptions } from "@/lib/site-images";
import { setSiteImage } from "@/lib/uploads.functions";
import { FooterAdmin } from "@/components/admin/FooterAdmin";
import { BrandsAdmin } from "@/components/admin/BrandsAdmin";
import { CategoriesAdmin } from "@/components/admin/CategoriesAdmin";
import { PrinterModelsAdmin } from "@/components/admin/PrinterModelsAdmin";
import { listPrinterModels } from "@/lib/printer-models.functions";
import { PricingAdmin } from "@/components/admin/PricingAdmin";
import { FeesAdmin } from "@/components/admin/FeesAdmin";
import { useCategories } from "@/lib/categories";
import { useSubcategories } from "@/lib/subcategories";
import { ProductsImport } from "@/components/admin/ProductsImport";
import { ProductPhotosAdmin } from "@/components/admin/ProductPhotosAdmin";
import { NfeImport } from "@/components/admin/NfeImport";
import { TeleSalesAdmin } from "@/components/admin/TeleSalesAdmin";
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

type AdminSection =
  | "overview"
  | "televendas"
  | "pedidos"
  | "produtos"
  | "estoque"
  | "entrada-nfe"
  | "importar"
  | "fotos"
  | "categorias"
  | "membros"
  | "cursos"
  | "modelos"
  | "banners"
  | "marcas"
  | "regras"
  | "taxas"
  | "rodape";

const adminGroups = [
  {
    label: "Principal",
    items: [{ value: "overview", label: "Visão geral", icon: LayoutDashboard }],
  },
  {
    label: "Vendas",
    items: [
      { value: "televendas", label: "Nova venda", icon: ShoppingCart },
      { value: "pedidos", label: "Pedidos", icon: ReceiptText },
    ],
  },
  {
    label: "Catálogo",
    items: [
      { value: "produtos", label: "Produtos", icon: Package },
      { value: "fotos", label: "Fotos", icon: Image },
      { value: "categorias", label: "Categorias", icon: Tags },
    ],
  },
  {
    label: "Estoque",
    items: [
      { value: "estoque", label: "Controle de estoque", icon: Boxes },
      { value: "entrada-nfe", label: "Entrada por NF-e", icon: Truck },
      { value: "importar", label: "Planilhas", icon: FileSpreadsheet },
    ],
  },
  {
    label: "Clientes e membros",
    items: [
      { value: "membros", label: "Membros", icon: Users },
      { value: "cursos", label: "Cursos", icon: GraduationCap },
      { value: "modelos", label: "Modelos de impressora", icon: Store },
    ],
  },
  {
    label: "Site e configurações",
    items: [
      { value: "banners", label: "Imagens do site", icon: Palette },
      { value: "marcas", label: "Marcas parceiras", icon: Tags },
      { value: "regras", label: "Regras de preço", icon: CircleDollarSign },
      { value: "taxas", label: "Taxas", icon: CircleDollarSign },
      { value: "rodape", label: "Rodapé", icon: Settings },
    ],
  },
] as const;

const sectionCopy: Record<AdminSection, { title: string; description: string }> = {
  overview: { title: "Visão geral", description: "Acompanhe os números e acesse as tarefas mais usadas." },
  televendas: { title: "Nova venda", description: "Cadastre o cliente e monte um pedido pelo atendimento." },
  pedidos: { title: "Pedidos", description: "Acompanhe pedidos e atualize o andamento de cada venda." },
  produtos: { title: "Produtos", description: "Consulte, cadastre e edite os itens da loja." },
  estoque: { title: "Controle de estoque", description: "Localize produtos e ajuste quantidades rapidamente." },
  "entrada-nfe": { title: "Entrada por NF-e", description: "Importe notas e vincule os itens ao catálogo." },
  importar: { title: "Planilhas", description: "Importe, exporte e atualize produtos em massa." },
  fotos: { title: "Fotos dos produtos", description: "Encontre e vincule imagens aos itens do catálogo." },
  categorias: { title: "Categorias", description: "Organize categorias e subcategorias da loja." },
  membros: { title: "Membros", description: "Gerencie acessos e impressoras dos clientes." },
  cursos: { title: "Cursos", description: "Publique cursos, aulas e materiais para membros." },
  modelos: { title: "Modelos de impressora", description: "Cadastre os modelos disponíveis para membros." },
  banners: { title: "Imagens do site", description: "Atualize logomarca, banners e fotos das páginas." },
  marcas: { title: "Marcas parceiras", description: "Cadastre e organize as marcas exibidas no site." },
  regras: { title: "Regras de preço", description: "Configure descontos e condições comerciais." },
  taxas: { title: "Taxas", description: "Defina os acréscimos aplicados ao parcelamento." },
  rodape: { title: "Rodapé", description: "Atualize contatos, links e dados institucionais." },
};

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

function slugifyPart(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildAutoSlug(name: string, brand: string) {
  return [slugifyPart(name), slugifyPart(brand)].filter(Boolean).join("-").slice(0, 120);
}

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
  const [activeSection, setActiveSection] = useState<AdminSection>("overview");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [stockSearch, setStockSearch] = useState("");
  const [stockView, setStockView] = useState<"all" | "low" | "out">("all");
  const [form, setForm] = useState<FormState | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);
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
    mutationFn: (input: {
      userId: string;
      active: boolean;
      printerModelId?: string | null;
      printerModelIds?: string[];
    }) =>
      setMembership({ data: input } as never),
    onSuccess: () => {
      toast.success("Acesso atualizado");
      refresh();
    },
    onError: (e: Error) => toast.error("Erro ao atualizar acesso", { description: e.message }),
  });

  const siteImages = useQuery(siteImagesQueryOptions);
  const printerModels = useQuery({
    queryKey: ["printer-models"],
    queryFn: () => listPrinterModels(),
    retry: false,
  });

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

  const stockProducts = useMemo(() => {
    const text = stockSearch.trim().toLowerCase();
    return allProducts.filter((product) => {
      if (stockView === "out" && product.stock !== 0) return false;
      if (stockView === "low" && (product.stock === 0 || product.stock > 3)) return false;
      if (!text) return true;
      return [product.name, product.brand, product.slug]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(text);
    });
  }, [allProducts, stockSearch, stockView]);


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
    setSlugTouched(true);
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
        slug: form.slug.trim() || buildAutoSlug(form.name, form.brand),
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

  function selectSection(section: AdminSection) {
    setActiveSection(section);
    setMobileMenuOpen(false);
  }

  function newProduct() {
    setSlugTouched(false);
    setForm({ ...emptyForm });
  }

  const menu = (
    <nav aria-label="Menu administrativo" className="space-y-5">
      {adminGroups.map((group) => (
        <div key={group.label}>
          <p className="mb-1 px-3 text-xs font-semibold uppercase text-muted-foreground">
            {group.label}
          </p>
          <div className="space-y-1">
            {group.items.map((item) => (
              <Button
                key={item.value}
                type="button"
                variant="ghost"
                onClick={() => selectSection(item.value)}
                className={cn(
                  "h-10 w-full justify-start gap-3 px-3 font-medium",
                  activeSection === item.value && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                )}
              >
                <item.icon className="size-4 shrink-0" />
                <span className="truncate">{item.label}</span>
                {item.value === "pedidos" && totals.pending > 0 && (
                  <Badge variant="secondary" className="ml-auto">{totals.pending}</Badge>
                )}
                {item.value === "estoque" && totals.lowStock > 0 && (
                  <Badge variant="secondary" className="ml-auto">{totals.lowStock}</Badge>
                )}
              </Button>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="container-page py-6 md:py-10">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border pb-5 sm:flex sm:flex-wrap sm:justify-between">
        <div className="min-w-0">
          <span className="eyebrow">Administração</span>
          <h1 className="mt-1 truncate text-2xl font-bold md:text-3xl">Painel SOS.3D</h1>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button asChild variant="outline" className="hidden sm:inline-flex">
            <Link to="/portal">Portal de membros</Link>
          </Button>
          <Button variant="cta" size="sm" onClick={newProduct}>
            <Plus /> <span className="hidden sm:inline">Novo produto</span>
          </Button>
        </div>
      </div>

      <Tabs value={activeSection} onValueChange={(value) => setActiveSection(value as AdminSection)}>
        <TabsList className="sr-only">
          {Object.keys(sectionCopy).map((value) => (
            <TabsTrigger key={value} value={value}>{sectionCopy[value as AdminSection].title}</TabsTrigger>
          ))}
        </TabsList>

        <div className="mt-6 grid min-w-0 gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="hidden self-start rounded-lg border border-border bg-card p-3 lg:sticky lg:top-6 lg:block">
            {menu}
          </aside>

          <main className="min-w-0">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
              <div className="min-w-0">
                <h2 className="truncate text-2xl font-bold">{sectionCopy[activeSection].title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{sectionCopy[activeSection].description}</p>
              </div>
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="lg:hidden" aria-label="Abrir menu administrativo">
                    <Menu className="size-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="overflow-y-auto p-4">
                  <SheetHeader className="mb-5 border-b border-border pb-4">
                    <SheetTitle>Menu administrativo</SheetTitle>
                  </SheetHeader>
                  {menu}
                </SheetContent>
              </Sheet>
            </div>

            <TabsContent value="overview" className="mt-6 space-y-6">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  { icon: CircleDollarSign, t: "Receita registrada", v: formatBRL(totals.revenue) },
                  { icon: ReceiptText, t: "Pedidos pendentes", v: String(totals.pending) },
                  { icon: Boxes, t: "Estoque baixo", v: String(totals.lowStock) },
                  { icon: Users, t: "Membros ativos", v: String(totals.members) },
                ].map((item) => (
                  <div key={item.t} className="rounded-lg border border-border bg-card p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm text-muted-foreground">{item.t}</p>
                      <item.icon className="size-5 shrink-0 text-tech" />
                    </div>
                    <p className="mt-3 text-2xl font-bold">{item.v}</p>
                  </div>
                ))}
              </div>
              <section>
                <h3 className="text-lg font-semibold">Ações rápidas</h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <Button variant="outline" className="h-auto justify-start gap-3 p-4" onClick={() => selectSection("televendas")}>
                    <ShoppingCart className="size-5 text-tech" /> Nova venda
                  </Button>
                  <Button variant="outline" className="h-auto justify-start gap-3 p-4" onClick={newProduct}>
                    <Plus className="size-5 text-tech" /> Novo produto
                  </Button>
                  <Button variant="outline" className="h-auto justify-start gap-3 p-4" onClick={() => selectSection("entrada-nfe")}>
                    <Truck className="size-5 text-tech" /> Entrada por NF-e
                  </Button>
                </div>
              </section>
            </TabsContent>

            <TabsContent value="produtos" className="mt-6 space-y-4">
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
                <div className="relative min-w-0">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="Buscar por nome, marca ou descrição"
                    value={filters.text}
                    onChange={(e) => setFilters((current) => ({ ...current, text: e.target.value }))}
                  />
                </div>
                <Button variant="outline" onClick={() => setFiltersOpen((open) => !open)}>
                  Filtros <ChevronDown className={cn("size-4 transition-transform", filtersOpen && "rotate-180")} />
                </Button>
                <Button variant="cta" onClick={newProduct}><Plus /> Adicionar produto</Button>
              </div>

              {filtersOpen && (
                <div className="rounded-lg border border-border bg-card p-4">
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
              )}

              <div className="overflow-hidden rounded-lg border border-border bg-card">
                <div className="hidden grid-cols-[minmax(260px,1fr)_140px_110px_100px_108px] gap-3 border-b border-border bg-muted/50 px-4 py-3 text-xs font-semibold uppercase text-muted-foreground xl:grid">
                  <span>Produto</span><span>Preço</span><span>Estoque</span><span>Situação</span><span className="text-right">Ações</span>
                </div>

                {filteredProducts.length === 0 && (
                  <p className="p-6 text-center text-sm text-muted-foreground">Nenhum produto encontrado com os filtros atuais.</p>
                )}

                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    className="grid gap-4 border-b border-border p-4 last:border-b-0 xl:grid-cols-[minmax(260px,1fr)_140px_110px_100px_108px] xl:items-center"
                  >
                    <div className="grid min-w-0 grid-cols-[48px_minmax(0,1fr)] items-center gap-3">
                      <img
                        src={imageFor(product.image_key, product.image_url)}
                        alt=""
                        className="size-12 rounded-md border border-border bg-muted object-cover"
                      />
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{product.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {[product.brand, categoryList.find((category) => category.slug === product.category)?.name].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs xl:sr-only">Preço</Label>
                      <Input
                        aria-label={`Preço de ${product.name}`}
                        type="number"
                        step="0.01"
                        min={0}
                        defaultValue={String(product.price)}
                        className="mt-1 h-9 xl:mt-0"
                        onBlur={(event) => {
                          const price = Number(event.target.value);
                          if (price !== Number(product.price)) quick.mutate({ id: product.id, price });
                        }}
                      />
                    </div>
                    <div>
                      <Label className="text-xs xl:sr-only">Estoque</Label>
                      <Input
                        aria-label={`Estoque de ${product.name}`}
                        type="number"
                        min={0}
                        defaultValue={String(product.stock)}
                        className={cn(
                          "mt-1 h-9 xl:mt-0",
                          product.stock === 0 && "border-destructive text-destructive",
                          product.stock > 0 && product.stock <= 3 && "border-warning text-warning",
                        )}
                        onBlur={(event) => {
                          const stock = Number(event.target.value);
                          if (stock !== product.stock) quick.mutate({ id: product.id, stock });
                        }}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={product.active} onCheckedChange={(active) => quick.mutate({ id: product.id, active })} />
                      <span className="text-xs text-muted-foreground">{product.active ? "Ativo" : "Inativo"}</span>
                    </div>
                    <div className="flex justify-end gap-1">
                      <Button variant="outline" size="icon" aria-label={`Editar ${product.name}`} onClick={() => openEdit(product)}><Pencil /></Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Remover ${product.name}`}
                        onClick={() => {
                          if (window.confirm(`Remover ${product.name}?`)) removeProduct.mutate({ id: product.id });
                        }}
                      ><Trash2 /></Button>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="estoque" className="mt-6 space-y-5">
              <div className="grid gap-3 sm:grid-cols-3">
                <button type="button" onClick={() => setStockView("all")} className={cn("rounded-lg border p-4 text-left", stockView === "all" ? "border-primary bg-primary/5" : "border-border bg-card")}>
                  <p className="text-sm text-muted-foreground">Todos os produtos</p>
                  <p className="mt-1 text-2xl font-bold">{allProducts.length}</p>
                </button>
                <button type="button" onClick={() => setStockView("low")} className={cn("rounded-lg border p-4 text-left", stockView === "low" ? "border-warning bg-warning/5" : "border-border bg-card")}>
                  <p className="text-sm text-muted-foreground">Estoque baixo</p>
                  <p className="mt-1 text-2xl font-bold">{allProducts.filter((product) => product.stock > 0 && product.stock <= 3).length}</p>
                </button>
                <button type="button" onClick={() => setStockView("out")} className={cn("rounded-lg border p-4 text-left", stockView === "out" ? "border-destructive bg-destructive/5" : "border-border bg-card")}>
                  <p className="text-sm text-muted-foreground">Sem estoque</p>
                  <p className="mt-1 text-2xl font-bold">{allProducts.filter((product) => product.stock === 0).length}</p>
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
                <div className="relative min-w-0">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input className="pl-9" placeholder="Buscar produto ou marca" value={stockSearch} onChange={(event) => setStockSearch(event.target.value)} />
                </div>
                <Button variant="outline" onClick={() => selectSection("entrada-nfe")}><Truck /> Entrada NF-e</Button>
                <Button variant="outline" onClick={() => selectSection("importar")}><FileSpreadsheet /> Planilha</Button>
              </div>

              <div className="overflow-hidden rounded-lg border border-border bg-card">
                <div className="hidden grid-cols-[minmax(260px,1fr)_120px_120px] gap-3 border-b border-border bg-muted/50 px-4 py-3 text-xs font-semibold uppercase text-muted-foreground md:grid">
                  <span>Produto</span><span>Situação</span><span>Quantidade</span>
                </div>
                {stockProducts.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">Nenhum produto nesta situação.</p>}
                {stockProducts.map((product) => (
                  <div key={product.id} className="grid gap-3 border-b border-border p-4 last:border-b-0 md:grid-cols-[minmax(260px,1fr)_120px_120px] md:items-center">
                    <div className="grid min-w-0 grid-cols-[44px_minmax(0,1fr)] items-center gap-3">
                      <img src={imageFor(product.image_key, product.image_url)} alt="" className="size-11 rounded-md border border-border bg-muted object-cover" />
                      <div className="min-w-0">
                        <p className="truncate font-medium">{product.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{product.brand}</p>
                      </div>
                    </div>
                    <div>
                      {product.stock === 0 ? <Badge variant="destructive">Sem estoque</Badge> : product.stock <= 3 ? <Badge variant="secondary">Estoque baixo</Badge> : <Badge variant="outline">Disponível</Badge>}
                    </div>
                    <div>
                      <Label className="text-xs md:sr-only">Quantidade</Label>
                      <Input
                        aria-label={`Quantidade em estoque de ${product.name}`}
                        type="number"
                        min={0}
                        defaultValue={String(product.stock)}
                        className={cn("mt-1 h-9 md:mt-0", product.stock === 0 && "border-destructive", product.stock > 0 && product.stock <= 3 && "border-warning")}
                        onBlur={(event) => {
                          const stock = Number(event.target.value);
                          if (stock !== product.stock) quick.mutate({ id: product.id, stock });
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

        <TabsContent value="fotos" className="mt-6">
          <ProductPhotosAdmin
            products={(data?.products ?? []) as never}
            onUpdated={refresh}
          />
        </TabsContent>

        <TabsContent value="categorias" className="mt-6">
          <CategoriesAdmin />
        </TabsContent>

        <TabsContent value="importar" className="mt-6">
          <ProductsImport products={(data?.products ?? []) as never} />
        </TabsContent>

        <TabsContent value="entrada-nfe" className="mt-6">
          <NfeImport
            products={(data?.products ?? []) as never}
            onImported={() => {
              queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
              queryClient.invalidateQueries({ queryKey: ["products"] });
            }}
          />
        </TabsContent>

        <TabsContent value="televendas" className="mt-6">
          <TeleSalesAdmin
            products={(data?.products ?? []).map((p) => ({
              slug: p.slug,
              name: p.name,
              brand: p.brand,
              price: Number(p.price),
              stock: p.stock,
              active: p.active,
            }))}
          />
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
            const selectedIds = (data?.memberModels ?? [])
              .filter((x) => x.user_id === profile.id)
              .map((x) => x.printer_model_id);
            const toggleModel = (id: string, checked: boolean) => {
              const next = checked
                ? Array.from(new Set([...selectedIds, id]))
                : selectedIds.filter((x) => x !== id);
              membership.mutate({
                userId: profile.id,
                active: Boolean(m?.active),
                printerModelId: next[0] ?? null,
                printerModelIds: next,
              });
            };
            return (
              <div
                key={profile.id}
                className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-border bg-card p-4"
              >
                <div>
                  <p className="font-semibold">{profile.full_name || "Sem nome"}</p>
                  <p className="text-xs text-muted-foreground">{profile.email}</p>
                </div>
                <div className="flex flex-wrap items-start gap-4">
                  {m?.active && <Badge className="bg-success text-white">Membro ativo</Badge>}
                  <div className="max-w-md">
                    <Label className="text-xs">Impressoras compradas</Label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(printerModels.data ?? []).map((pm) => {
                        const checked = selectedIds.includes(pm.id);
                        return (
                          <button
                            key={pm.id}
                            type="button"
                            onClick={() => toggleModel(pm.id, !checked)}
                            className={`rounded-full border px-3 py-1 text-xs transition ${
                              checked
                                ? "border-tech bg-tech text-white"
                                : "border-border bg-background text-muted-foreground"
                            }`}
                          >
                            {pm.name}
                          </button>
                        );
                      })}
                      {!(printerModels.data ?? []).length && (
                        <span className="text-xs text-muted-foreground">
                          Cadastre modelos na aba Modelos.
                        </span>
                      )}
                    </div>
                    {!selectedIds.length && (
                      <p className="mt-2 text-xs text-muted-foreground">Nenhum modelo definido.</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={Boolean(m?.active)}
                      onCheckedChange={(active) =>
                        membership.mutate({
                          userId: profile.id,
                          active,
                          printerModelId: selectedIds[0] ?? null,
                          printerModelIds: selectedIds,
                        })
                      }
                    />
                    <span className="text-xs text-muted-foreground">Acesso ao portal</span>
                  </div>
                </div>
              </div>
            );
          })}
        </TabsContent>

        <TabsContent value="modelos" className="mt-6">
          <PrinterModelsAdmin />
        </TabsContent>

        <TabsContent value="cursos" className="mt-6">
          <CoursesAdmin courses={(overview.data?.courses ?? []) as never} />
        </TabsContent>

        <TabsContent value="banners" className="mt-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            Troque as fotos das páginas do site. A alteração aparece imediatamente para os
            visitantes.
          </p>

          {logoDefinitions.map((l) => (
            <div key={l.key} className="rounded-xl border border-border bg-card p-4">
              <p className="font-semibold">{l.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">{l.hint}</p>
              <div className="mt-3">
                <ImageUploader
                  label="Enviar logomarca"
                  value={siteImages.data?.find((i) => i.key === l.key)?.url ?? null}
                  onChange={(url) => banner.mutate({ key: l.key, url })}
                />
              </div>
            </div>
          ))}
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

        <TabsContent value="taxas" className="mt-6">
          <FeesAdmin />
        </TabsContent>

        <TabsContent value="rodape" className="mt-6">
          <FooterAdmin />
        </TabsContent>
      </Tabs>

      <Dialog
        open={form !== null}
        onOpenChange={(open) => {
          if (!open) {
            setForm(null);
            setSlugTouched(false);
          }
        }}
      >
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
                  onChange={(e) => {
                    const name = e.target.value;
                    setForm({
                      ...form,
                      name,
                      ...(slugTouched ? {} : { slug: buildAutoSlug(name, form.brand) }),
                    });
                  }}
                />
              </div>
              <div>
                <Label>Slug (URL)</Label>
                <Input
                  className="mt-1 bg-muted text-muted-foreground"
                  maxLength={120}
                  value={form.slug}
                  readOnly
                  aria-readonly="true"
                  tabIndex={-1}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  {form.id
                    ? "Bloqueado para preservar o link do produto."
                    : "Gerado automaticamente a partir do nome e da marca."}
                </p>
              </div>
              <div>
                <Label>Marca</Label>
                <Input
                  className="mt-1"
                  maxLength={80}
                  value={form.brand}
                  onChange={(e) => {
                    const brand = e.target.value;
                    setForm({
                      ...form,
                      brand,
                      ...(slugTouched ? {} : { slug: buildAutoSlug(form.name, brand) }),
                    });
                  }}
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
                  Deixe em branco para usar o padrão de 12x com juros. Se o total não for informado,
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
