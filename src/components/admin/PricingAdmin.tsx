import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  defaultPricingRules,
  normalizeRules,
  pricingQueryOptions,
  type PricingRules,
  type PromoRule,
} from "@/lib/pricing";
import { savePricingRules } from "@/lib/pricing.functions";
import { useCategories } from "@/lib/categories";

const scopeLabels: Record<PromoRule["scope"], string> = {
  all: "Todos os produtos",
  category: "Categoria",
  brand: "Marca",
  product: "Produto (slug)",
};

export function PricingAdmin() {
  const queryClient = useQueryClient();
  const rules = useQuery(pricingQueryOptions);
  const { categories } = useCategories();
  const [state, setState] = useState<PricingRules>(defaultPricingRules);

  useEffect(() => {
    if (rules.data) setState(normalizeRules(rules.data));
  }, [rules.data]);

  const save = useMutation({
    mutationFn: (values: PricingRules) => savePricingRules({ data: values } as never),
    onSuccess: () => {
      toast.success("Regras de negócio atualizadas");
      void queryClient.invalidateQueries({ queryKey: ["pricing-rules"] });
      void queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (e: Error) => toast.error("Erro ao salvar", { description: e.message }),
  });

  function num(v: string) {
    const n = Number(String(v).replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  }

  function updatePromo(id: string, patch: Partial<PromoRule>) {
    setState((s) => ({
      ...s,
      promos: s.promos.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    }));
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Configure aqui os descontos e regras comerciais do site. Os valores substituem os antigos
        percentuais fixos (como os 5% no Pix) em toda a loja, no carrinho e no checkout.
      </p>

      <div className="grid gap-4 rounded-xl border border-border bg-card p-5 sm:grid-cols-3">
        <div>
          <Label>Desconto Pix (%)</Label>
          <Input
            className="mt-1"
            inputMode="decimal"
            value={String(state.pixDiscountPercent)}
            onChange={(e) => setState({ ...state, pixDiscountPercent: num(e.target.value) })}
          />
        </div>
        <div>
          <Label>Desconto boleto (%)</Label>
          <Input
            className="mt-1"
            inputMode="decimal"
            value={String(state.boletoDiscountPercent)}
            onChange={(e) => setState({ ...state, boletoDiscountPercent: num(e.target.value) })}
          />
        </div>
        <div>
          <Label>Desconto cartão (%)</Label>
          <Input
            className="mt-1"
            inputMode="decimal"
            value={String(state.cardDiscountPercent)}
            onChange={(e) => setState({ ...state, cardDiscountPercent: num(e.target.value) })}
          />
        </div>
        <div>
          <Label>Frete grátis a partir de (R$)</Label>
          <Input
            className="mt-1"
            inputMode="decimal"
            value={String(state.freeShippingFrom)}
            onChange={(e) => setState({ ...state, freeShippingFrom: num(e.target.value) })}
          />
        </div>
        <div>
          <Label>Valor do frete (R$)</Label>
          <Input
            className="mt-1"
            inputMode="decimal"
            value={String(state.flatShipping)}
            onChange={(e) => setState({ ...state, flatShipping: num(e.target.value) })}
          />
        </div>
        <div>
          <Label>Parcelas padrão (sem juros)</Label>
          <Input
            className="mt-1"
            inputMode="numeric"
            value={String(state.defaultInstallments)}
            onChange={(e) =>
              setState({ ...state, defaultInstallments: Math.max(1, Math.round(num(e.target.value))) })
            }
          />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold">Promoções por escopo</h3>
            <p className="text-xs text-muted-foreground">
              Descontos aplicados sobre o preço do produto (vale o maior percentual válido).
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setState((s) => ({
                ...s,
                promos: [
                  ...s.promos,
                  {
                    id: crypto.randomUUID(),
                    label: "Nova promoção",
                    scope: "all",
                    target: "",
                    percent: 0,
                    active: true,
                  },
                ],
              }))
            }
          >
            <Plus /> Nova regra
          </Button>
        </div>

        <div className="mt-4 space-y-3">
          {state.promos.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhuma promoção cadastrada.</p>
          )}
          {state.promos.map((promo) => (
            <div
              key={promo.id}
              className="grid gap-3 rounded-lg border border-border p-4 md:grid-cols-[1.4fr_1fr_1.2fr_0.7fr_auto_auto] md:items-end"
            >
              <div>
                <Label className="text-xs">Nome</Label>
                <Input
                  className="mt-1"
                  maxLength={120}
                  value={promo.label}
                  onChange={(e) => updatePromo(promo.id, { label: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">Aplicar em</Label>
                <select
                  className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={promo.scope}
                  onChange={(e) =>
                    updatePromo(promo.id, { scope: e.target.value as PromoRule["scope"], target: "" })
                  }
                >
                  {Object.entries(scopeLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-xs">Alvo</Label>
                {promo.scope === "category" ? (
                  <select
                    className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={promo.target}
                    onChange={(e) => updatePromo(promo.id, { target: e.target.value })}
                  >
                    <option value="">Selecione…</option>
                    {categories.map((c) => (
                      <option key={c.slug} value={c.slug}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    className="mt-1"
                    disabled={promo.scope === "all"}
                    placeholder={promo.scope === "brand" ? "Ex.: Creality" : "slug-do-produto"}
                    value={promo.scope === "all" ? "" : promo.target}
                    onChange={(e) => updatePromo(promo.id, { target: e.target.value })}
                  />
                )}
              </div>
              <div>
                <Label className="text-xs">Desconto (%)</Label>
                <Input
                  className="mt-1"
                  inputMode="decimal"
                  value={String(promo.percent)}
                  onChange={(e) => updatePromo(promo.id, { percent: num(e.target.value) })}
                />
              </div>
              <div className="flex items-center gap-2 pb-2">
                <Switch
                  checked={promo.active}
                  onCheckedChange={(v) => updatePromo(promo.id, { active: v })}
                />
                <span className="text-xs text-muted-foreground">Ativa</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Remover regra"
                onClick={() =>
                  setState((s) => ({ ...s, promos: s.promos.filter((p) => p.id !== promo.id) }))
                }
              >
                <Trash2 />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <Button variant="cta" disabled={save.isPending} onClick={() => save.mutate(state)}>
        {save.isPending ? "Salvando…" : "Salvar regras"}
      </Button>
    </div>
  );
}
