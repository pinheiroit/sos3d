import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ImageUploader } from "@/components/site/ImageUploader";
import {
  adminListBrands,
  deletePartnerBrand,
  savePartnerBrand,
} from "@/lib/site-content.functions";

type BrandRow = {
  id: string;
  name: string;
  logo_url: string | null;
  website_url: string | null;
  sort_order: number;
  active: boolean;
};

export function BrandsAdmin() {
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState("");

  const brands = useQuery({
    queryKey: ["admin-brands"],
    queryFn: () => adminListBrands(),
    retry: false,
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin-brands"] });
    void queryClient.invalidateQueries({ queryKey: ["site-content"] });
  };

  const save = useMutation({
    mutationFn: (input: { id: string | null; values: unknown }) =>
      savePartnerBrand({ data: input } as never),
    onSuccess: () => {
      toast.success("Marca salva");
      refresh();
    },
    onError: (e: Error) => toast.error("Erro ao salvar", { description: e.message }),
  });

  const remove = useMutation({
    mutationFn: (input: { id: string }) => deletePartnerBrand({ data: input } as never),
    onSuccess: () => {
      toast.success("Marca removida");
      refresh();
    },
    onError: (e: Error) => toast.error("Erro ao remover", { description: e.message }),
  });

  const list = (brands.data ?? []) as BrandRow[];

  function update(b: BrandRow, patch: Partial<BrandRow>) {
    save.mutate({
      id: b.id,
      values: {
        name: patch.name ?? b.name,
        logo_url: patch.logo_url !== undefined ? patch.logo_url : b.logo_url,
        website_url: patch.website_url !== undefined ? patch.website_url : b.website_url,
        sort_order: patch.sort_order ?? b.sort_order,
        active: patch.active ?? b.active,
      },
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        As marcas parceiras aparecem em uma faixa logo acima do rodapé, em todas as páginas.
      </p>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4">
        <div className="min-w-56 flex-1">
          <Label>Nova marca</Label>
          <Input
            className="mt-1"
            maxLength={120}
            placeholder="Nome da marca"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
        </div>
        <Button
          variant="cta"
          disabled={!newName.trim() || save.isPending}
          onClick={() => {
            save.mutate({
              id: null,
              values: {
                name: newName.trim(),
                logo_url: null,
                website_url: null,
                sort_order: list.length + 1,
                active: true,
              },
            });
            setNewName("");
          }}
        >
          <Plus /> Adicionar
        </Button>
      </div>

      {list.map((b) => (
        <div key={b.id} className="grid gap-4 rounded-xl border border-border bg-card p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="text-xs">Nome</Label>
              <Input
                className="mt-1 h-9"
                maxLength={120}
                defaultValue={b.name}
                onBlur={(e) => {
                  const name = e.target.value.trim();
                  if (name && name !== b.name) update(b, { name });
                }}
              />
            </div>
            <div>
              <Label className="text-xs">Site (opcional)</Label>
              <Input
                className="mt-1 h-9"
                maxLength={600}
                placeholder="https://..."
                defaultValue={b.website_url ?? ""}
                onBlur={(e) => {
                  const value = e.target.value.trim();
                  if (value !== (b.website_url ?? "")) update(b, { website_url: value || null });
                }}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <ImageUploader
              label="Logo da marca"
              value={b.logo_url}
              onChange={(url) => update(b, { logo_url: url })}
            />
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <Label className="text-xs">Ordem</Label>
                <Input
                  type="number"
                  min={0}
                  className="mt-1 h-9 w-20"
                  defaultValue={String(b.sort_order)}
                  onBlur={(e) => {
                    const sort_order = Number(e.target.value) || 0;
                    if (sort_order !== b.sort_order) update(b, { sort_order });
                  }}
                />
              </div>
              <div className="flex items-center gap-2 pb-2">
                <Switch checked={b.active} onCheckedChange={(active) => update(b, { active })} />
                <span className="text-xs text-muted-foreground">Visível</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="mb-1"
                onClick={() => {
                  if (window.confirm(`Remover ${b.name}?`)) remove.mutate({ id: b.id });
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
