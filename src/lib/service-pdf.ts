// Documentos imprimíveis (Salvar como PDF pelo navegador): comprovante, O.S. final e termo.
import {
  BUDGET_STATUS,
  CLOSING_REASON,
  ORDER_STATUS,
  PART_ORIGIN,
  VALIDATION_RESULT,
  WARRANTY_STATUS,
  budgetTotal,
  fmtDate,
  fmtDateTime,
  osNumber,
  paNumber,
  type Budget,
} from "@/lib/service";

type Any = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const esc = (v: unknown) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const row = (label: string, value: unknown) =>
  value === undefined || value === null || value === "" ? "" : `<tr><th>${esc(label)}</th><td>${esc(value).replace(/\n/g, "<br>")}</td></tr>`;
const section = (title: string, rows: string) => (rows.trim() ? `<h2>${esc(title)}</h2><table>${rows}</table>` : "");

function open(title: string, body: string) {
  const w = window.open("", "_blank");
  if (!w) {
    alert("Permita pop-ups para gerar o PDF.");
    return;
  }
  w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>
*{box-sizing:border-box}body{font-family:Inter,Arial,sans-serif;color:#0f172a;margin:32px;font-size:12px;line-height:1.5}
header{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid #1d4ed8;padding-bottom:12px;margin-bottom:18px}
.brand{font-size:22px;font-weight:800;letter-spacing:-.02em}.brand span{color:#1d4ed8}
.doc{text-align:right}.doc b{font-size:18px;display:block}
h1{font-size:16px;margin:0 0 4px}h2{font-size:13px;margin:18px 0 6px;color:#1d4ed8;text-transform:uppercase;letter-spacing:.04em}
table{width:100%;border-collapse:collapse}th,td{border:1px solid #e2e8f0;padding:6px 8px;text-align:left;vertical-align:top}
th{width:32%;background:#f8fafc;font-weight:600}.sign{margin-top:48px;display:grid;grid-template-columns:1fr 1fr;gap:40px}
.sign div{border-top:1px solid #0f172a;padding-top:6px;text-align:center}.muted{color:#64748b}
.box{border:1px solid #e2e8f0;background:#f8fafc;padding:12px;border-radius:6px}
@media print{body{margin:14mm}button{display:none}}
</style></head><body>
<header><div class="brand">SOS<span>.3D</span><div class="muted" style="font-size:11px;font-weight:400">Assistência técnica em impressão 3D</div></div>
<div class="doc">${body.match(/<!--doc:(.*?)-->/)?.[1] ?? ""}</div></header>
${body}
<p class="muted" style="margin-top:28px">Documento gerado em ${esc(new Date().toLocaleString("pt-BR"))} — Minha SOS-3D</p>
<script>setTimeout(()=>window.print(),400)</script></body></html>`);
  w.document.close();
}

export function printReceipt(o: Any, owner: Any) {
  const r = o.reported ?? {};
  const rc = o.reception ?? {};
  open(
    `Comprovante ${osNumber(o.number)}`,
    `<!--doc:<b>${osNumber(o.number)}</b>Comprovante de recebimento-->
<h1>Comprovante de recebimento do equipamento</h1>
<p class="muted">Recebido em ${esc(fmtDateTime(o.received_at))}${r.pa_number ? ` · Origem: ${paNumber(r.pa_number)}` : ""}</p>
${section("Cliente", row("Nome", owner.name) + row("CPF/CNPJ", owner.document) + row("Telefone", owner.phone) + row("E-mail", owner.email))}
${section("Equipamento", row("Equipamento", o.equipment?.brand) + row("Modelo", o.equipment?.model) + row("Número de série", o.equipment?.serial))}
${section("Defeito relatado", row("Descrição", r.problem) + row("Código de erro", r.error_code))}
${section(
  "Conferência no recebimento",
  row("Acessórios entregues", rc.accessories || "Nenhum") +
    row("Condição visual", rc.visual_condition) +
    row("Avarias aparentes", rc.damages) +
    row("Peças faltantes", rc.missing_parts) +
    row("Modificações", rc.modifications) +
    row("Nota fiscal", rc.has_invoice ? `Apresentada${r.invoice_number ? ` — nº ${r.invoice_number}` : ""}` : "Não apresentada") +
    row("Observações", rc.notes) +
    row("Recebido por", rc.received_by_name),
)}
<div class="sign"><div>Cliente</div><div>SOS 3D — Atendimento</div></div>`,
  );
}

export function printTerm(o: Any) {
  const t = o.private_term ?? {};
  const c = t.customer ?? {};
  open(
    `Termo ${osNumber(o.number)}`,
    `<!--doc:<b>${osNumber(o.number)}</b>Termo de ciência-->
<h1>Termo de Ciência e Autorização para Atendimento Particular</h1>
${section("Cliente", row("Nome", c.name) + row("CPF/CNPJ", c.document) + row("Telefone", c.phone) + row("E-mail", c.email))}
${section("Atendimento", row("Número da O.S.", osNumber(o.number)) + row("Equipamento", t.equipment) + row("Modelo", t.model) + row("Número de série", t.serial) + row("Data e hora", fmtDateTime(t.created_at)))}
<h2>Declaração</h2>
<div class="box">Declaro estar ciente de que optei por <b>não aguardar / não prosseguir com a análise de garantia neste atendimento</b> e autorizo a SOS 3D a realizar o atendimento em caráter particular, conforme orçamento a ser apresentado. Esta opção refere-se exclusivamente a este atendimento e <b>não representa renúncia a direitos de garantia</b> previstos em lei ou concedidos pelo fabricante.</div>
${section("Registro", row("Motivo da escolha", t.reason) + row("Lançado por", t.created_by) + row("Assinatura", t.signature ? `${t.signature} — ${t.signature_method}` : "Pendente") + row("Assinado em", t.signed_at ? fmtDateTime(t.signed_at) : "Pendente"))}
<div class="sign"><div>${esc(t.signature || "Assinatura do cliente")}</div><div>SOS 3D — Atendimento</div></div>`,
  );
}

export function printFinal(o: Any, owner: Any, events: Any[] = []) {
  const r = o.reported ?? {};
  const d = o.diagnosis ?? {};
  const w = o.warranty ?? {};
  const b = (o.budget ?? {}) as Budget & Any;
  const e = o.execution ?? {};
  const v = o.validation ?? {};
  const c = o.closing ?? {};
  const parts: Any[] = Array.isArray(e.parts) ? e.parts : [];
  open(
    `${osNumber(o.number)} final`,
    `<!--doc:<b>${osNumber(o.number)}</b>Ordem de serviço-->
<h1>Ordem de Serviço ${osNumber(o.number)}</h1>
<p class="muted">Status: ${esc(ORDER_STATUS[o.status] ?? o.status)} · Entrada ${esc(fmtDateTime(o.received_at))}${o.closed_at ? ` · Encerrada ${esc(fmtDateTime(o.closed_at))}` : ""}</p>
${section("Cliente", row("Nome", owner.name) + row("CPF/CNPJ", owner.document) + row("Telefone", owner.phone) + row("E-mail", owner.email))}
${section("Equipamento", row("Marca / modelo", `${o.equipment?.brand ?? ""} ${o.equipment?.model ?? ""}`) + row("Número de série", o.equipment?.serial))}
${section("Relato do cliente", row("Defeito", r.problem) + row("Início", r.started_when) + row("Frequência", r.frequency) + row("Código de erro", r.error_code) + row("Já realizado", r.steps_tried))}
${section("Diagnóstico técnico", row("Sintoma confirmado", d.symptom_confirmed) + row("Testes realizados", d.tests) + row("Resultado", d.test_results) + row("Diagnóstico confirmado", d.confirmed || d.probable) + row("Causa", d.cause) + row("Observações", d.notes))}
${section("Garantia", row("Situação", WARRANTY_STATUS[o.warranty_status]) + row("Fabricante", w.manufacturer) + row("Protocolo", w.protocol) + row("Resposta", w.response))}
${section("Orçamento", row("Situação", BUDGET_STATUS[o.budget_status]) + (o.budget_status !== "nao_aplica" ? row("Total", brl(budgetTotal(b))) : "") + row("Autorização", b.authorized_at ? `${fmtDateTime(b.authorized_at)} — ${b.authorization_method ?? ""} (${b.authorized_by ?? ""})` : ""))}
${section("Serviço executado", row("Serviços", e.services) + row("Ajustes / limpeza / lubrificação / calibração", [e.adjustments, e.cleaning, e.lubrication, e.calibration].filter(Boolean).join(" · ")))}
${parts.length ? `<h2>Peças substituídas</h2><table><tr><th>Peça</th><th>Código</th><th>Qtd</th><th>Série / lote</th><th>Origem</th></tr>${parts.map((p) => `<tr><td>${esc(p.name)}</td><td>${esc(p.code)}</td><td>${esc(p.qty)}</td><td>${esc([p.serial, p.lot].filter(Boolean).join(" / "))}</td><td>${esc(PART_ORIGIN[p.origin] ?? p.origin)}</td></tr>`).join("")}</table>` : ""}
${section("Validação técnica final", row("Resultado", VALIDATION_RESULT[v.result]) + row("Testes", v.tests) + row("Impressão de teste", [v.material, v.file, v.duration].filter(Boolean).join(" · ")) + row("Observações", v.notes))}
${section("Encerramento", row("Motivo", CLOSING_REASON[c.reason]) + row("Diagnóstico final", c.final_diagnosis) + row("Resumo do serviço", c.summary) + row("Valor final", c.final_value !== undefined && c.final_value !== "" ? brl(Number(c.final_value)) : "") + row("Conclusão", fmtDate(c.completed_at)) + row("Entrega", fmtDate(c.delivered_at)) + row("Responsável pela entrega", c.delivered_by) + row("Observações finais", c.notes))}
${events.length ? `<h2>Histórico</h2><table>${events.map((ev) => `<tr><th>${esc(fmtDateTime(ev.created_at))}</th><td>${esc(ev.description)}</td></tr>`).join("")}</table>` : ""}
<div class="sign"><div>Cliente</div><div>SOS 3D — Atendimento</div></div>`,
  );
}
