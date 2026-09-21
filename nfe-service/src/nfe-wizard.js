import fs from "node:fs";
import path from "node:path";
import NFeWizard from "nfewizard-io";
import { config } from "./config.js";

let instance;

function ensureDirs() {
  for (const dir of ["xml", "pdf", "distribuicao"]) {
    fs.mkdirSync(path.join(config.storageDir, dir), { recursive: true });
  }
}

/** Instancia o NFeWizard uma única vez (carrega o certificado A1). */
export async function getWizard() {
  if (instance) return instance;
  ensureDirs();

  if (!fs.existsSync(config.certificate.path)) {
    throw new Error(`Certificado digital não encontrado em ${config.certificate.path}`);
  }

  const wizard = new NFeWizard();
  await wizard.NFE_LoadEnvironment({
    config: {
      dfe: {
        baixarXMLDistribuicao: true,
        pathXMLDistribuicao: path.join(config.storageDir, "distribuicao"),
        armazenarXMLAutorizacao: true,
        pathXMLAutorizacao: path.join(config.storageDir, "xml"),
        armazenarXMLRetorno: true,
        pathXMLRetorno: path.join(config.storageDir, "xml"),
        armazenarXMLConsulta: true,
        pathXMLConsulta: path.join(config.storageDir, "xml"),
        armazenarRetornoEmJSON: true,
        pathRetornoEmJSON: path.join(config.storageDir, "xml"),
        pathPDF: path.join(config.storageDir, "pdf"),
        UF: config.emitente.uf,
        CPFCNPJ: config.emitente.cnpj,
challenge: undefined,
      },
      nfe: {
        ambiente: config.ambiente,
        versaoDF: "4.00",
        idCSC: process.env.NFE_ID_CSC ? Number(process.env.NFE_ID_CSC) : undefined,
        tokenCSC: process.env.NFE_TOKEN_CSC,
      },
      email: { host: "", port: 0, secure: false, auth: { user: "", pass: "" } },
      lib: {
        connection: { timeout: 60000 },
        useOpenSSL: false,
        useForSchemaValidation: "validateSchemaJsBased",
      },
      certificate: {
        pfx: config.certificate.path,
        senha: config.certificate.password,
      },
    },
  });

  instance = wizard;
  return instance;
}

export function fileUrl(baseUrl, absolutePath) {
  if (!absolutePath) return null;
  const relative = path.relative(config.storageDir, absolutePath).split(path.sep).join("/");
  if (relative.startsWith("..")) return null;
  return `${baseUrl.replace(/\/$/, "")}/arquivos/${relative}`;
}
