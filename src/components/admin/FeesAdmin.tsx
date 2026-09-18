import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatBRL } from "@/lib/catalog";
import {
  defaultInstallmentFees,
  defaultPricingRules,
  normalizeFees,
  normalizeRules,
  pricingQueryOptions,
  round2,
  type InstallmentFee,
  type PricingRules,
} from "@/lib/pricing";
import { savePricingRules } from "@/lib/pricing.functions";

const exemplo = 1000;

export function FeesAdmin() {
  const queryClient = useQueryClient();
  const rules = useQuery(pricingQueryOptions);
  const [base, setBase] = useState<PricingRules>(defaultPricingRules);
  const [fees, setFees] = useState<InstallmentFee[]>(defaultInstallmentFees);

  useEffect(() => {
    if (!rules.data) return;
    const normalized = normalizeRules(rules.data);
    setBase(normalized);
    setFees(normalizeFees(normalized.installmentFees));
  }, [rules.data]);

  const save = useMutation({
    mutationFn: (values: InstallmentFee[]) =>
      savePricingRules({ data: { ...base, installmentFees: values } } as never),
    onSuccess: () => {
      toast.success("Taxas de parcelamento atualizadas");
      void queryClient.invalidateQueries({ queryKey: ["pricing-rules"] });
      void queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (e: Error) => toast.error("Erro ao salvar", { description: e.message }),
  });

  function num(v: string) {
    const n = Number(String(v).replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  }

  function update(months: number, patch: Partial<InstallmentFee>) {
    setFees((list) => list.map((f) => (f.months === months ? { ...f, ...patch } : f)));
  }

  const proximo = Math.max(0, ...fees.map((f) => f.months)) + 1;

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Defina a taxa cobrada em cada quantidade de parcelas. O valor é somado ao preço do produto
        na vitrine, na página do produto e no fechamento do pedido. Produtos com tabela própria de
        parcelamento continuam usando a tabela deles.
      </p>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Parcelas</th>
              <th className="px-4 py-3 text-left font-semibold">Taxa (%)</th>
              <th className="px-4 py-3 text-right font-semibold">
                Exemplo em {formatBRL(exemplo)}
              </th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {fees.map((fee) => {
              const total = round2(exemplo * (1 + fee.percent / 100));
              return (
                <tr key={fee.months} className="border-t border-border">
                  <td className="px-4 py-2 font-medium">{fee.months}x</td>
                  <td className="px-4 py-2">
                    <Input
                      className="h-9 w-28"
                      inputMode="decimal"
                      value={String(fee.percent)}
                      onChange={(e) => update(fee.months, { percent: num(e.target.value) })}
                    />
                  </td>
                  <td className="px-4 py-2 text-right">
                    {fee.months}x de {formatBRL(round2(total / fee.months))} · total{" "}
                    <span className="font-semibold text-brand">{formatBRL(total)}</span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Remover ${fee.months}x`}
                      onClick={() => setFees((l) => l.filter((f) => f.months !== fee.months))}
                    >
                      <Trash2 />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div>
          <Label className="text-xs">Adicionar parcela</Label>
          <p className="mt-1 text-sm text-muted-foreground">{proximo}x</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={proximo > 48}
          onClick={() =>
            setFees((l) =>
              [...l, { months: proximo, percent: 0 }].sort((a, b) => a.months - b.months),
            )
          }
        >
          <Plus /> Incluir {proximo}x
        </Button>
      </div>

      <Button variant="cta" disabled={save.isPending} onClick={() => save.mutate(fees)}>
        {save.isPending ? "Salvando…" : "Salvar taxas"}
      </Button>
    </div>
  );
}
