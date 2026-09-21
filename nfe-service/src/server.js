import express from "express";
import cors from "cors";
import { config } from "./config.js";
import { getWizard, fileUrl } from "./nfe-wizard.js";
import { buildNfePayload, emitirSchema, cancelarSchema } from "./payload.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

function authorize(req, res) {
  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (token !== config.token) {
    res.status(401).json({ ok: false, message: "Não autorizado." });
    return false;
  }
  return true;
}

const baseUrl = (req) => `${req.protocol}://${req.get("host")}`;

app.use("/arquivos", express.static(config.storageDir));

app.get("/health", async (req, res) => {
  if (!authorize(req, res)) return;
  try {
    await getWizard();
    res.json({ ok: true, ambiente: config.ambiente === 1 ? "producao" : "homologacao", cnpj: config.emitente.cnpj });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

app.post("/nfe/emitir", async (req, res) => {
  if (!authorize(req, res)) return;
  const parsed = emitirSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, message: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") });
  }

  try {
    const wizard = await getWizard();
    const payload = buildNfePayload(parsed.data);
    const result = await wizard.NFE_Autorizacao(payload);

    const retorno = result?.data ?? result ?? {};
    const protNFe = retorno?.protNFe?.infProt ?? retorno?.infProt ?? {};
    const status = String(protNFe.cStat ?? retorno.cStat ?? "");
    const autorizada = status === "100" || status === "150";

    return res.status(autorizada ? 200 : 422).json({
      ok: autorizada,
      status,
      message: protNFe.xMotivo ?? retorno.xMotivo ?? "Retorno da SEFAZ sem descrição.",
      chave: protNFe.chNFe ?? retorno.chNFe ?? null,
      protocolo: protNFe.nProt ?? null,
      numero: parsed.data.numero,
      serie: parsed.data.serie,
      xmlUrl: fileUrl(baseUrl(req), result?.xmlPath ?? result?.pathXML ?? null),
      danfeUrl: fileUrl(baseUrl(req), result?.pdfPath ?? result?.pathPDF ?? null),
      raw: retorno,
    });
  } catch (error) {
    console.error("[nfe/emitir]", error);
    return res.status(500).json({ ok: false, message: error?.message ?? "Falha ao emitir a NF-e." });
  }
});

app.post("/nfe/cancelar", async (req, res) => {
  if (!authorize(req, res)) return;
  const parsed = cancelarSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, message: parsed.error.issues.map((i) => i.message).join("; ") });
  }

  try {
    const wizard = await getWizard();
    const result = await wizard.NFE_EventoCancelamento({
      idLote: String(Date.now()).slice(-15),
      chNFe: parsed.data.chave,
      nProt: parsed.data.protocolo,
      xJust: parsed.data.justificativa,
      CNPJ: config.emitente.cnpj,
      tpAmb: config.ambiente,
      dhEvento: new Date().toISOString(),
    });

    const retorno = result?.data ?? result ?? {};
    const infEvento = retorno?.retEvento?.infEvento ?? retorno?.infEvento ?? {};
    const status = String(infEvento.cStat ?? retorno.cStat ?? "");
    const cancelada = status === "135" || status === "155";

    return res.status(cancelada ? 200 : 422).json({
      ok: cancelada,
      status,
      message: infEvento.xMotivo ?? retorno.xMotivo ?? "Retorno da SEFAZ sem descrição.",
      protocolo: infEvento.nProt ?? null,
      raw: retorno,
    });
  } catch (error) {
    console.error("[nfe/cancelar]", error);
    return res.status(500).json({ ok: false, message: error?.message ?? "Falha ao cancelar a NF-e." });
  }
});

app.listen(config.port, () => {
  console.log(`Serviço de NF-e ouvindo na porta ${config.port} (ambiente ${config.ambiente === 1 ? "produção" : "homologação"})`);
});
