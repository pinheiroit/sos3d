import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  adminListCategories,
  deleteCategory,
  saveCategory,
  type CategoryRow,
} from "@/lib/categories.functions";

type Row = CategoryRow & { product_count: number };

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function CategoriesAdmin() {
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState("");

  const list = useQuery({
    queryKey: ["admin-categories"],
    queryFn: () => adminListCategories(),
    retry: false,
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
    void queryClient.invalidateQueries({ queryKey: ["categories"] });
    void queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
    void queryClient.invalidateQueries({ queryKey: ["products"] });
  };

  const save = useMutation({
    mutationFn: (input: { id: string | null; values: unknown }) =>
      saveCategory({ data: input } as never),
    onSuccess: () => {
      toast.success("Categoria salva");
      refresh();
    },
    onError: (e: Error) => toast.error("Erro ao salvar", { description: e.message }),
  });

  const remove = useMutation({
    mutationFn: (input: { id: string }) => deleteCategory({ data: input } as never),
    onSuccess: () => {
      toast.success("Categoria removida");
      refresh();
    },
    onError: (e: Error) => toast.error("Erro ao remover", { description: e.message }),
  });

  const rows = (list.data ?? []) as Row[];

  function update(c: Row, patch: Partial<CategoryRow>) {
    save.mutate({
      id: c.id,
      values: {
        slug: patch.slug ?? c.slug,
        name: patch.name ?? c.name,
        description: patch.description ?? c.description,
        sort_order: patch.sort_order ?? c.sort_order,
        active: patch.active ?? c.active,
      },
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        As categorias organizam o catálogo e alimentam os filtros da loja e o cadastro de produtos.
      </p>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4">
        <div className="min-w-56 flex-1">
          <Label>Nova categoria</Label>
          <Input
            className="mt-1"
            maxLength={120}
            placeholder="Ex.: Resinas"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
        </div>
        <Button
          variant="cta"
          disabled={!newName.trim() || save.isPending}
          onClick={() => {
            const name = newName.trim();
            const slug = slugify(name);
            if (slug.length < 2) {
              toast.error("Nome inválido para gerar o identificador");
              return;
            }
            save.mutate({
              id: null,
              values: {
                slug,
                name,
                description: "",
                sort_order: rows.length + 1,
                active: true,
              },
            });
            setNewName("");
          }}
        >
          <Plus /> Adicionar
        </Button>
      </div>

      {rows.map((c) => (
        <div key={c.id} className="grid gap-4 rounded-xl border border-border bg-card p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="text-xs">Nome</Label>
              <Input
                className="mt-1 h-9"
                maxLength={120}
                defaultValue={c.name}
                onBlur={(e) => {
                  const name = e.target.value.trim();
                  if (name && name !== c.name) update(c, { name });
                }}
              />
            </div>
            <div>
              <Label className="text-xs">Identificador (slug)</Label>
              <Input
                className="mt-1 h-9"
                maxLength={60}
                defaultValue={c.slug}
                onBlur={(e) => {
                  const slug = slugify(e.target.value);
                  if (slug && slug !== c.slug) update(c, { slug });
                }}
              />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs">Descrição (opcional)</Label>
              <Input
                className="mt-1 h-9"
                maxLength={400}
                defaultValue={c.description}
                onBlur={(e) => {
                  const description = e.target.value.trim();
                  if (description !== c.description) update(c, { description });
                }}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-end justify-between gap-4">
            <p className="pb-2 text-xs text-muted-foreground">
              {c.product_count} produto(s) nesta categoria
            </p>
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <Label className="text-xs">Ordem</Label>
                <Input
                  type="number"
                  min={0}
                  className="mt-1 h-9 w-20"
                  defaultValue={String(c.sort_order)}
                  onBlur={(e) => {
                    const sort_order = Number(e.target.value) || 0;
                    if (sort_order !== c.sort_order) update(c, { sort_order });
                  }}
                />
              </div>
              <div className="flex items-center gap-2 pb-2">
                <Switch checked={c.active} onCheckedChange={(active) => update(c, { active })} />
                <span className="text-xs text-muted-foreground">Visível</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="mb-1"
                disabled={remove.isPending}
                onClick={() => {
                  if (window.confirm(`Remover ${c.name}?`)) remove.mutate({ id: c.id });
                }}
              >
                <Trash2 />
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
