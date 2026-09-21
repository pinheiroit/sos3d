import path from "node:path";

const required = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`Variável de ambiente obrigatória ausente: ${name}`);
  return value;
};

export const config = {
  port: Number(process.env.PORT ?? 8787),
  token: required("NFE_SERVICE_TOKEN"),
  ambiente: Number(process.env.NFE_AMBIENTE ?? 2),
  storageDir: path.resolve(process.env.STORAGE_DIR ?? "./arquivos"),
  certificate: {
    path: path.resolve(required("CERT_PATH")),
    password: required("CERT_PASSWORD"),
  },
  emitente: {
    uf: required("EMIT_UF"),
    cnpj: required("EMIT_CNPJ").replace(/\D/g, ""),
    ie: required("EMIT_IE").replace(/\D/g, ""),
    razaoSocial: required("EMIT_RAZAO_SOCIAL"),
    nomeFantasia: process.env.EMIT_NOME_FANTASIA ?? required("EMIT_RAZAO_SOCIAL"),
    crt: Number(process.env.EMIT_CRT ?? 1),
    logradouro: required("EMIT_LOGRADOURO"),
    numero: process.env.EMIT_NUMERO ?? "S/N",
    bairro: required("EMIT_BAIRRO"),
    municipio: required("EMIT_MUNICIPIO"),
    codigoMunicipio: required("EMIT_COD_MUNICIPIO"),
    cep: required("EMIT_CEP").replace(/\D/g, ""),
    fone: (process.env.EMIT_FONE ?? "").replace(/\D/g, ""),
  },
};
