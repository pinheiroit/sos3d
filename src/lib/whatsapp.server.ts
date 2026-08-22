/** Envio de notificação de novo pedido para o WhatsApp da loja (Evolution API / Z-API). */

type NotifyOrder = {
  reference: string;
  total: number;
  subtotal: number;
  shipping: number;
  discount: number;
  paymentMethod: string;
  installmentMonths: number | null;
  customer: { name: string; email: string; phone: string; document: string };
  address: Record<string, string>;
  items: { name: string; qty: number; unitPrice: number }[];
};

const brl = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const paymentLabel: Record<string, string> = {
  pix: "Pix",
  boleto: "Boleto",
  cartao: "Cartão de crédito",
};

export function buildOrderMessage(order: NotifyOrder): string {
  const linhas = order.items
    .map((i) => `• ${i.qty}x ${i.name} — ${brl(i.unitPrice * i.qty)}`)
    .join("\n");
  const end = [
    order.address["street"],
    order.address["number"],
    order.address["complement"],
    order.address["city"],
    order.address["state"],
    order.address["zip"],
  ]
    .filter(Boolean)
    .join(", ");

  return (
    `*NOVO PEDIDO ${order.reference}* 🛒\n\n` +
    `*Cliente:* ${order.customer.name}\n` +
    `*E-mail:* ${order.customer.email}\n` +
    (order.customer.phone ? `*Telefone:* ${order.customer.phone}\n` : "") +
    (order.customer.document ? `*Documento:* ${order.customer.document}\n` : "") +
    (end ? `*Entrega:* ${end}\n` : "") +
    `\n${linhas}\n\n` +
    `Subtotal: ${brl(order.subtotal)}\n` +
    `Frete: ${order.shipping > 0 ? brl(order.shipping) : "Grátis"}\n` +
    (order.discount > 0 ? `Desconto: -${brl(order.discount)}\n` : "") +
    `*Total: ${brl(order.total)}*\n` +
    `Pagamento: ${paymentLabel[order.paymentMethod] ?? order.paymentMethod}` +
    (order.installmentMonths ? ` em ${order.installmentMonths}x` : "")
  );
}

/** Nunca lança: falha de notificação não pode quebrar o checkout. */
export async function notifyOrderWhatsApp(order: NotifyOrder): Promise<boolean> {
  const url = process.env["WHATSAPP_API_URL"];
  const token = process.env["WHATSAPP_API_TOKEN"];
  const number = (process.env["WHATSAPP_NOTIFY_NUMBER"] ?? "").replace(/\D/g, "");
  if (!url || !token || !number) {
    console.warn("[whatsapp] configuração ausente, notificação ignorada");
    return false;
  }

  const text = buildOrderMessage(order);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Evolution API
        apikey: token,
        // Z-API
        "Client-Token": token,
      },
      // Campos das duas APIs: cada provedor ignora o que não conhece.
      body: JSON.stringify({ number, text, phone: number, message: text }),
    });
    if (!res.ok) {
      console.error("[whatsapp] falha no envio", res.status, (await res.text()).slice(0, 300));
      return false;
    }
    return true;
  } catch (e) {
    console.error("[whatsapp] erro de rede", e instanceof Error ? e.message : e);
    return false;
  }
}
