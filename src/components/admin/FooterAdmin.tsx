import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { defaultFooter, siteContentQueryOptions, type FooterContent } from "@/lib/site-content";
import { saveFooterSettings } from "@/lib/site-content.functions";

export function FooterAdmin() {
  const queryClient = useQueryClient();
  const content = useQuery(siteContentQueryOptions);
  const [state, setState] = useState<FooterContent>(defaultFooter);

  useEffect(() => {
    if (content.data?.footer) setState(content.data.footer as FooterContent);
  }, [content.data]);

  const save = useMutation({
    mutationFn: (values: FooterContent) => saveFooterSettings({ data: values } as never),
    onSuccess: () => {
      toast.success("Rodapé atualizado");
      void queryClient.invalidateQueries({ queryKey: ["site-content"] });
    },
    onError: (e: Error) => toast.error("Erro ao salvar", { description: e.message }),
  });

  function updateColumn(index: number, patch: Partial<FooterContent["columns"][number]>) {
    setState((s) => ({
      ...s,
      columns: s.columns.map((c, i) => (i === index ? { ...c, ...patch } : c)),
    }));
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Edite os textos, contatos e links exibidos no rodapé de todas as páginas.
      </p>

      <div className="grid gap-4 rounded-xl border border-border bg-card p-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label>Texto de apresentação</Label>
          <Textarea
            className="mt-1"
            rows={3}
            maxLength={600}
            value={state.tagline}
            onChange={(e) => setState({ ...state, tagline: e.target.value })}
          />
        </div>
        <div>
          <Label>Telefone</Label>
          <Input
            className="mt-1"
            maxLength={80}
            value={state.phone}
            onChange={(e) => setState({ ...state, phone: e.target.value })}
          />
        </div>
        <div>
          <Label>E-mail</Label>
          <Input
            className="mt-1"
            maxLength={160}
            value={state.email}
            onChange={(e) => setState({ ...state, email: e.target.value })}
          />
        </div>
        <div className="sm:col-span-2">
          <Label>Endereço / observação</Label>
          <Input
            className="mt-1"
            maxLength={200}
            value={state.address}
            onChange={(e) => setState({ ...state, address: e.target.value })}
          />
        </div>
        <div>
          <Label>Assinatura de copyright</Label>
          <Input
            className="mt-1"
            maxLength={300}
            value={state.copyright}
            onChange={(e) => setState({ ...state, copyright: e.target.value })}
          />
        </div>
        <div>
          <Label>Aviso legal</Label>
          <Input
            className="mt-1"
            maxLength={300}
            value={state.legal}
            onChange={(e) => setState({ ...state, legal: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-4">
        {state.columns.map((col, ci) => (
          <div key={ci} className="rounded-xl border border-border bg-card p-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="min-w-56 flex-1">
                <Label>Título da coluna</Label>
                <Input
                  className="mt-1"
                  maxLength={80}
                  value={col.title}
                  onChange={(e) => updateColumn(ci, { title: e.target.value })}
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setState({ ...state, columns: state.columns.filter((_, i) => i !== ci) })
                }
              >
                <Trash2 /> Remover coluna
              </Button>
            </div>

            <div className="mt-4 space-y-2">
              {col.links.map((link, li) => (
                <div key={li} className="flex flex-wrap items-end gap-2">
                  <div className="min-w-48 flex-1">
                    <Label className="text-xs">Texto</Label>
                    <Input
                      className="mt-1 h-9"
                      maxLength={120}
                      value={link.label}
                      onChange={(e) =>
                        updateColumn(ci, {
                          links: col.links.map((l, i) =>
                            i === li ? { ...l, label: e.target.value } : l,
                          ),
                        })
                      }
                    />
                  </div>
                  <div className="min-w-48 flex-1">
                    <Label className="text-xs">Link (ex.: /loja)</Label>
                    <Input
                      className="mt-1 h-9"
                      maxLength={300}
                      value={link.to}
                      onChange={(e) =>
                        updateColumn(ci, {
                          links: col.links.map((l, i) =>
                            i === li ? { ...l, to: e.target.value } : l,
                          ),
                        })
                      }
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      updateColumn(ci, { links: col.links.filter((_, i) => i !== li) })
                    }
                  >
                    <Trash2 />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateColumn(ci, { links: [...col.links, { label: "", to: "/" }] })}
              >
                <Plus /> Adicionar link
              </Button>
            </div>
          </div>
        ))}

        <Button
          variant="outline"
          onClick={() =>
            setState({ ...state, columns: [...state.columns, { title: "Nova coluna", links: [] }] })
          }
        >
          <Plus /> Adicionar coluna
        </Button>
      </div>

      <div className="flex justify-end">
        <Button variant="cta" disabled={save.isPending} onClick={() => save.mutate(state)}>
          Salvar rodapé
        </Button>
      </div>
    </div>
  );
}
