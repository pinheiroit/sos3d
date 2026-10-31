// Documento do pedido de venda (layout baseado na "Venda" da Conta Azul) para imprimir ou baixar em PDF.
import { paymentLabels } from "@/lib/sales-analytics";

/** Dados da empresa impressos no cabeçalho do pedido. */
export const COMPANY = {
  name: "SOS.3D",
  legalName: "S. O. S. INDUSTRIA, COMERCIO E SERVIÇO LTDA",
  address: "Travessa do Canal, 60 - ANEXO - Distrito Industrial - Rio Branco - AC - CEP: 69920-199",
  phone: "(68) 99948-4082",
  email: "sos.ind.ac@gmail.com",
  cnpj: "55.891.067/0001-55",
  ie: "0109528100157",
};

export type OrderDocItem = {
  qty: number;
  product_name: string;
  unit_price: number | string;
  detail?: string;
};

export type OrderDoc = {
  reference: string;
  created_at: string;
  customer_name: string;
  customer_document?: string | null;
  customer_phone?: string | null;
  customer_email?: string | null;
  payment_method: string;
  shipping_address?: unknown;
  notes?: string | null;
  subtotal?: number | string | null;
  shipping?: number | string | null;
  discount?: number | string | null;
  total: number | string;
  items: OrderDocItem[];
};

const esc = (v: unknown) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
const num = (n: number) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dateBR = (iso: string) => new Date(iso).toLocaleDateString("pt-BR");

function addressLines(raw: unknown): { pickup: boolean; text: string } {
  const a = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const pickup = a.fulfillment === "coleta";
  const s = (k: string) => (typeof a[k] === "string" ? (a[k] as string).trim() : "");
  const street = [s("street"), s("number")].filter(Boolean).join(", ");
  const parts = [
    street,
    s("complement"),
    s("district") || s("neighborhood"),
    [s("city"), s("state")].filter(Boolean).join(" - "),
    s("zip") || s("cep") ? `CEP: ${s("zip") || s("cep")}` : "",
  ].filter(Boolean);
  return { pickup, text: parts.join(" - ") };
}

const CSS = `
.sos-doc{all:initial;display:block;box-sizing:border-box;width:794px;min-height:1123px;padding:40px 38px;background:#fff;color:#1f2937;font-family:Inter,"Helvetica Neue",Arial,sans-serif;font-size:13px;line-height:1.4}
.sos-doc *{box-sizing:border-box;font-family:inherit}
.sos-doc .top{display:flex;justify-content:space-between;align-items:flex-end;padding-bottom:12px;border-bottom:2px solid #111}
.sos-doc .top .date{color:#6b7280;font-size:15px}
.sos-doc .top .ref{color:#6b7280;font-size:20px}.sos-doc .top .ref b{color:#111;font-size:22px;font-weight:800;margin-left:4px}
.sos-doc .company{display:flex;gap:18px;padding:18px 0;border-bottom:2px solid #111}
.sos-doc .logo{width:176px;height:88px;flex:none;border:1px solid #d1d5db;display:flex;align-items:center;justify-content:center;overflow:hidden;background:#fff}
.sos-doc .logo img{width:100%;height:100%;object-fit:cover;display:block}
.sos-doc .logo span{font-weight:800;font-size:22px;color:#1d4ed8}
.sos-doc .cinfo{flex:1;min-width:0}
.sos-doc .cinfo h1{margin:0 0 2px;font-size:18px;font-weight:800;letter-spacing:.06em;color:#111}
.sos-doc .cinfo p{margin:0}.sos-doc .muted{color:#6b7280}
.sos-doc .cinfo .legal{margin-top:8px}
.sos-doc .contact{text-align:right;flex:none}
.sos-doc .contact .phone{font-size:18px;font-weight:700;color:#111;margin:0 0 12px}
.sos-doc .customer{margin-top:16px;border:1px solid #9ca3af;padding:14px 16px;min-height:120px}
.sos-doc .customer h2{margin:0 0 6px;font-size:18px;font-weight:600;color:#111}
.sos-doc .customer p{margin:2px 0}
.sos-doc table{width:100%;border-collapse:collapse}
.sos-doc .items{margin-top:16px;border:1px solid #9ca3af;border-bottom:none}
.sos-doc .items th{background:#f4f4f5;font-weight:600;color:#111;text-align:left;padding:9px 10px;border-bottom:1px solid #9ca3af}
.sos-doc .items td{padding:9px 10px;border-bottom:1px solid #d1d5db;vertical-align:top}
.sos-doc .items .r{text-align:right;white-space:nowrap}.sos-doc .items .c{text-align:center;width:52px}
.sos-doc .items tr.sum td{background:#f4f4f5;border-bottom:2px solid #111}
.sos-doc .items tr.extra td{border-bottom:1px solid #e5e7eb}
.sos-doc .net{display:flex;justify-content:flex-end;gap:60px;padding:10px 10px 0;font-weight:700;color:#111}
.sos-doc h3{margin:22px 0 8px;font-size:14px;font-weight:600;color:#111}
.sos-doc .pay th{text-align:left;font-weight:600;color:#111;padding:6px 12px}
.sos-doc .pay td{padding:4px 12px;color:#6b7280}.sos-doc .pay .r{text-align:right}
.sos-doc .notes{margin-top:16px;padding:10px 0;border-top:2px solid #111;border-bottom:2px solid #111;min-height:44px;white-space:pre-wrap}
`;

/** HTML do pedido (um bloco `.sos-doc`) e o CSS escopado. */
export function buildOrderHtml(o: OrderDoc, logoUrl: string | null): { html: string; css: string } {
  const subtotal =
    o.subtotal != null && o.subtotal !== ""
      ? Number(o.subtotal)
      : o.items.reduce((s, i) => s + i.qty * Number(i.unit_price), 0);
  const shipping = Number(o.shipping ?? 0);
  const discount = Number(o.discount ?? 0);
  const total = Number(o.total);
  const addr = addressLines(o.shipping_address);
  const payLabel = paymentLabels[o.payment_method] ?? o.payment_method;

  const rows = o.items
    .map(
      (i) => `<tr><td class="c">${esc(i.qty)}</td><td>${esc(i.product_name)}</td><td>${esc(i.detail ?? "")}</td>
<td class="r">${num(Number(i.unit_price))}</td><td class="r">${num(i.qty * Number(i.unit_price))}</td></tr>`,
    )
    .join("");
  const extra = [
    shipping > 0 ? `<tr class="extra"><td></td><td></td><td></td><td class="r muted">Frete</td><td class="r">${num(shipping)}</td></tr>` : "",
    discount > 0 ? `<tr class="extra"><td></td><td></td><td></td><td class="r muted">Desconto</td><td class="r">- ${num(discount)}</td></tr>` : "",
  ].join("");

  const logo = logoUrl
    ? `<img src="${esc(logoUrl)}" alt="SOS.3D" crossorigin="anonymous">`
    : `<span>SOS.3D</span>`;

  const html = `<div class="sos-doc">
<div class="top"><span class="date">${esc(dateBR(o.created_at))}</span><span class="ref">Pedido <b>${esc(o.reference)}</b></span></div>
<div class="company">
  <div class="logo">${logo}</div>
  <div class="cinfo">
    <h1>${esc(COMPANY.name)}</h1>
    <p>${esc(COMPANY.address)}</p>
    <p class="muted legal">${esc(COMPANY.legalName)}</p>
    <p class="muted">CNPJ: ${esc(COMPANY.cnpj)} &nbsp;&nbsp; IE: ${esc(COMPANY.ie)}</p>
  </div>
  <div class="contact"><p class="phone">${esc(COMPANY.phone)}</p><p>${esc(COMPANY.email)}</p></div>
</div>
<div class="customer">
  <h2>${esc(o.customer_name)}</h2>
  ${o.customer_document ? `<p>CPF/CNPJ: ${esc(o.customer_document)}</p>` : ""}
  ${[o.customer_phone, o.customer_email].filter(Boolean).length ? `<p class="muted">${esc([o.customer_phone, o.customer_email].filter(Boolean).join(" • "))}</p>` : ""}
  <p>${addr.pickup ? "<b>Entrega:</b> Coleta (retirada no local)" : addr.text ? `<b>Entrega:</b> ${esc(addr.text)}` : ""}</p>
</div>
<table class="items">
  <thead><tr><th class="c">Qt.</th><th>Produto/Serviço</th><th>Detalhe do item</th><th class="r">Valor unitário</th><th class="r">Subtotal</th></tr></thead>
  <tbody>${rows}
  <tr class="sum"><td></td><td></td><td></td><td class="r muted">Total</td><td class="r"><b>${num(subtotal)}</b></td></tr>
  ${extra}</tbody>
</table>
<div class="net"><span>Valor líquido</span><span>${num(total)}</span></div>
<h3>Condição de pagamento:</h3>
<table class="pay" style="width:auto">
  <thead><tr><th>Nº</th><th>Vencimento</th><th class="r">Valor (R$)</th><th>Observações</th></tr></thead>
  <tbody><tr><td>1</td><td>${esc(dateBR(o.created_at))}</td><td class="r">${num(total)}</td><td>${esc(payLabel)} — Pedido ${esc(o.reference)}</td></tr></tbody>
</table>
<div class="notes">${esc(o.notes ?? "")}</div>
</div>`;
  return { html, css: CSS };
}

const absolute = (url: string | null) => (url ? new URL(url, window.location.origin).href : null);

/** Abre o pedido em uma nova aba já com a janela de impressão. */
export function printOrder(o: OrderDoc, logoUrl: string | null) {
  const w = window.open("", "_blank");
  if (!w) {
    alert("Permita pop-ups para imprimir o pedido.");
    return;
  }
  const { html, css } = buildOrderHtml(o, absolute(logoUrl));
  w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Pedido ${esc(o.reference)}</title>
<style>@page{size:A4;margin:0}html,body{margin:0;background:#e5e7eb}body{display:flex;justify-content:center;padding:16px 0}
@media print{html,body{background:#fff}body{padding:0}.sos-doc{min-height:auto!important}}
${css}</style></head><body>${html}
<script>
const go=()=>setTimeout(()=>window.print(),150);
const imgs=[...document.images];
Promise.all(imgs.map(i=>i.complete?1:new Promise(r=>{i.onload=i.onerror=r}))).then(go);
</script></body></html>`);
  w.document.close();
}

/** Gera e baixa o arquivo PDF do pedido (A4). */
export async function downloadOrderPdf(o: OrderDoc, logoUrl: string | null) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas-pro"),
    import("jspdf"),
  ]);
  const { html, css } = buildOrderHtml(o, absolute(logoUrl));
  const host = document.createElement("div");
  host.style.cssText = "position:fixed;left:-10000px;top:0;z-index:-1;";
  host.innerHTML = `<style>${css}</style>${html}`;
  document.body.appendChild(host);
  try {
    const el = host.querySelector(".sos-doc") as HTMLElement;
    await Promise.all(
      Array.from(el.querySelectorAll("img")).map((img) =>
        img.complete ? img.decode().catch(() => undefined) : new Promise((r) => { img.onload = img.onerror = r; }),
      ),
    );
    const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
    const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
    const pageW = 210;
    const pageH = 297;
    const pxPerMm = canvas.width / pageW;
    const pageHeightPx = Math.floor(pageH * pxPerMm);
    let offset = 0;
    let page = 0;
    while (offset < canvas.height) {
      const sliceH = Math.min(pageHeightPx, canvas.height - offset);
      const slice = document.createElement("canvas");
      slice.width = canvas.width;
      slice.height = sliceH;
      slice.getContext("2d")!.drawImage(canvas, 0, offset, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
      if (page > 0) pdf.addPage();
      pdf.addImage(slice.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, pageW, sliceH / pxPerMm);
      offset += sliceH;
      page += 1;
      // Evita uma página quase vazia só com a margem inferior.
      if (canvas.height - offset < 40 * 2) break;
    }
    pdf.save(`Pedido_${o.reference}.pdf`);
  } finally {
    host.remove();
  }
}
