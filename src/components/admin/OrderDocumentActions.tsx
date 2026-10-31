import { useState } from "react";
import { FileDown, Loader2, Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useSiteImage } from "@/lib/site-images";
import { downloadOrderPdf, printOrder, type OrderDoc } from "@/lib/order-document";

/** Botões "PDF" e "Imprimir" do pedido de venda. */
export function OrderDocumentActions({ order, size = "sm" }: { order: OrderDoc; size?: "sm" | "default" }) {
  const logo = useSiteImage("logo-principal");
  const [busy, setBusy] = useState(false);

  return (
    <div className="flex items-center gap-1.5">
      <Button
        type="button"
        size={size}
        variant="outline"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await downloadOrderPdf(order, logo);
          } catch (e) {
            console.error(e);
            toast.error("Não foi possível gerar o PDF. Tente imprimir e salvar como PDF.");
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : <FileDown className="size-4" />} PDF
      </Button>
      <Button type="button" size={size} variant="outline" onClick={() => printOrder(order, logo)}>
        <Printer className="size-4" /> Imprimir
      </Button>
    </div>
  );
}
