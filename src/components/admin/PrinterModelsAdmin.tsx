import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  adminListPrinterModels,
  deletePrinterModel,
  savePrinterModel,
  type PrinterModelRow,
} from "@/lib/printer-models.functions";

type Row = PrinterModelRow & { course_count: number; member_count: number };

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function PrinterModelsAdmin() {
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState("");

  const list = useQuery({
    queryKey: ["admin-printer-models"],
    queryFn: () => adminListPrinterModels(),
    retry: false,
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin-printer-models"] });
    void queryClient.invalidateQueries({ queryKey: ["printer-models"] });
    void queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
  };

  const save = useMutation({
    mutationFn: (input: { id: string | null; values: unknown }) =>
      savePrinterModel({ data: input } as never),
    onSuccess: () => {
      toast.success("Modelo salvo");
      refresh();
    },
    onError: (e: Error) => toast.error("Erro ao salvar", { description: e.message }),
  });

  const remove = useMutation({
    mutationFn: (input: { id: string }) => deletePrinterModel({ data: input } as never),
    onSuccess: () => {
      toast.success("Modelo removido");
      refresh();
    },
    onError: (e: Error) => toast.error("Erro ao remover", { description: e.message }),
  });

  const rows = (list.data ?? []) as Row[];

  function update(m: Row, patch: Partial<PrinterModelRow>) {
    save.mutate({
      id: m.id,
      values: {
        slug: patch.slug ?? m.slug,
        name: patch.name ?? m.name,
        description: patch.description ?? m.description,
        sort_order: patch.sort_order ?? m.sort_order,
        active: patch.active ?? m.active,
      },
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Cada modelo de impressora tem a própria trilha de estudos. Os cursos são vinculados a um
        modelo e o membro vê apenas a trilha do modelo definido na aba <strong>Membros</strong>.
      </p>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4">
        <div className="min-w-56 flex-1">
          <Label>Novo modelo</Label>
          <Input
            className="mt-1"
            maxLength={120}
            placeholder="Ex.: Bambu Lab A1 Mini"
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

      {rows.length === 0 && !list.isLoading ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Nenhum modelo cadastrado ainda.
        </p>
      ) : null}

      {rows.map((m) => (
        <div key={m.id} className="grid gap-4 rounded-xl border border-border bg-card p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="text-xs">Nome do modelo</Label>
              <Input
                className="mt-1 h-9"
                maxLength={120}
                defaultValue={m.name}
                onBlur={(e) => {
                  const name = e.target.value.trim();
                  if (name && name !== m.name) update(m, { name });
                }}
              />
            </div>
            <div>
              <Label className="text-xs">Identificador (slug)</Label>
              <Input
                className="mt-1 h-9"
                maxLength={60}
                defaultValue={m.slug}
                onBlur={(e) => {
                  const slug = slugify(e.target.value);
                  if (slug && slug !== m.slug) update(m, { slug });
                }}
              />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs">Descrição da trilha (opcional)</Label>
              <Input
                className="mt-1 h-9"
                maxLength={600}
                defaultValue={m.description}
                onBlur={(e) => {
                  const description = e.target.value.trim();
                  if (description !== m.description) update(m, { description });
                }}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-end justify-between gap-4">
            <p className="pb-2 text-xs text-muted-foreground">
              {m.course_count} curso(s) · {m.member_count} membro(s) ativo(s)
            </p>
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <Label className="text-xs">Ordem</Label>
                <Input
                  type="number"
                  min={0}
                  className="mt-1 h-9 w-20"
                  defaultValue={String(m.sort_order)}
                  onBlur={(e) => {
                    const sort_order = Number(e.target.value) || 0;
                    if (sort_order !== m.sort_order) update(m, { sort_order });
                  }}
                />
              </div>
              <div className="flex items-center gap-2 pb-2">
                <Switch checked={m.active} onCheckedChange={(active) => update(m, { active })} />
                <span className="text-xs text-muted-foreground">Ativo</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="mb-1"
                disabled={remove.isPending}
                onClick={() => {
                  if (
                    window.confirm(
                      `Remover ${m.name}? Os cursos e membros vinculados ficarão sem modelo.`,
                    )
                  )
                    remove.mutate({ id: m.id });
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
