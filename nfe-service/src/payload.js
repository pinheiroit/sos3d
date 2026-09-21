import { z } from "zod";
import { config } from "./config.js";

export const itemSchema = z.object({
  codigo: z.string().min(1).max(60),
  descricao: z.string().min(1).max(120),
  ncm: z.string().regex(/^\d{8}$/, "NCM deve ter 8 dígitos"),
  cfop: z.string().regex(/^\d{4}$/, "CFOP deve ter 4 dígitos"),
  unidade: z.string().min(1).max(6).default("UN"),
  quantidade: z.number().positive(),
  valorUnitario: z.number().nonnegative(),
  cest: z.string().regex(/^\d{7}$/).optional(),
  origem: z.number().int().min(0).max(8).default(0),
  csosn: z.string().optional(),
  cst: z.string().optional(),
});

export const emitirSchema = z.object({
  numero: z.number().int().positive(),
  serie: z.number().int().positive().default(1),
  naturezaOperacao: z.string().min(2).max(60).default("Venda de mercadoria"),
  destinatario: z.object({
    nome: z.string().min(2).max(120),
    documento: z.string().min(11).max(18),
    ie: z.string().max(20).optional(),
    email: z.string().email().optional(),
    endereco: z.object({
      logradouro: z.string().min(2),
      numero: z.string().min(1).default("S/N"),
      complemento: z.string().optional(),
      bairro: z.string().min(1),
      municipio: z.string().min(2),
      codigoMunicipio: z.string().min(7).max(7),
      uf: z.string().length(2),
      cep: z.string().min(8).max(9),
      fone: z.string().optional(),
    }),
  }),
  itens: z.array(itemSchema).min(1).max(200),
  frete: z.number().nonnegative().default(0),
  desconto: z.number().nonnegative().default(0),
  pagamento: z.object({
    forma: z.enum(["pix", "boleto", "cartao", "dinheiro", "outros"]).default("outros"),
    valor: z.number().nonnegative(),
  }),
  informacoesAdicionais: z.string().max(2000).optional(),
});

export const cancelarSchema = z.object({
  chave: z.string().regex(/^\d{44}$/, "Chave da NF-e inválida"),
  protocolo: z.string().min(5).max(30),
  justificativa: z.string().min(15).max(255),
});

const onlyDigits = (value) => String(value ?? "").replace(/\D/g, "");
const money = (value) => Number(Number(value ?? 0).toFixed(2));

const formaPagamentoCodigo = {
  dinheiro: "01",
  cartao: "03",
  boleto: "15",
  pix: "17",
  outros: "99",
};

/** Converte o payload simples do painel no formato esperado pelo NFeWizard. */
export function buildNfePayload(input) {
  const emit = config.emitente;
  const documento = onlyDigits(input.destinatario.documento);
  const produtos = input.itens.map((item, index) => {
    const valorTotal = money(item.quantidade * item.valorUnitario);
    return {
      nItem: index + 1,
      prod: {
        cProd: item.codigo,
        cEAN: "SEM GTIN",
        xProd: config.ambiente === 2 ? "NOTA FISCAL EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL" : item.descricao,
        NCM: item.ncm,
        CEST: item.cest,
        CFOP: item.cfop,
        uCom: item.unidade,
        qCom: item.quantidade,
        vUnCom: money(item.valorUnitario),
        vProd: valorTotal,
        cEANTrib: "SEM GTIN",
        uTrib: item.unidade,
        qTrib: item.quantidade,
        vUnTrib: money(item.valorUnitario),
        indTot: 1,
      },
      imposto: {
        ICMS: config.emitente.crt === 3
          ? { ICMS00: { orig: item.origem, CST: item.cst ?? "00", modBC: 3, vBC: valorTotal, pICMS: 0, vICMS: 0 } }
          : { ICMSSN102: { orig: item.origem, CSOSN: item.csosn ?? "102" } },
        PIS: { PISNT: { CST: "07" } },
        COFINS: { COFINSNT: { CST: "07" } },
      },
    };
  });

  const totalProdutos = money(produtos.reduce((sum, p) => sum + p.prod.vProd, 0));
  const total = money(totalProdutos + input.frete - input.desconto);

  return {
    ide: {
      cUF: undefined,
      natOp: input.naturezaOperacao,
      mod: 55,
      serie: input.serie,
      nNF: input.numero,
      dhEmi: new Date().toISOString(),
      tpNF: 1,
      idDest: input.destinatario.endereco.uf === emit.uf ? 1 : 2,
      cMunFG: emit.codigoMunicipio,
      tpImp: 1,
      tpEmis: 1,
      tpAmb: config.ambiente,
      finNFe: 1,
      indFinal: 1,
      indPres: 2,
      procEmi: 0,
      verProc: "SOS3D-1.0",
    },
    emit: {
      CNPJ: emit.cnpj,
      xNome: emit.razaoSocial,
      xFant: emit.nomeFantasia,
      enderEmit: {
        xLgr: emit.logradouro,
        nro: emit.numero,
        xBairro: emit.bairro,
        cMun: emit.codigoMunicipio,
        xMun: emit.municipio,
        UF: emit.uf,
        CEP: emit.cep,
        cPais: 1058,
        xPais: "BRASIL",
        fone: emit.fone || undefined,
      },
      IE: emit.ie,
      CRT: emit.crt,
    },
    dest: {
      [documento.length > 11 ? "CNPJ" : "CPF"]: documento,
      xNome: config.ambiente === 2 ? "NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL" : input.destinatario.nome,
      enderDest: {
        xLgr: input.destinatario.endereco.logradouro,
        nro: input.destinatario.endereco.numero,
        xCpl: input.destinatario.endereco.complemento || undefined,
        xBairro: input.destinatario.endereco.bairro,
        cMun: input.destinatario.endereco.codigoMunicipio,
        xMun: input.destinatario.endereco.municipio,
        UF: input.destinatario.endereco.uf,
        CEP: onlyDigits(input.destinatario.endereco.cep),
        cPais: 1058,
        xPais: "BRASIL",
        fone: onlyDigits(input.destinatario.endereco.fone) || undefined,
      },
      indIEDest: input.destinatario.ie ? 1 : 9,
      IE: input.destinatario.ie || undefined,
      email: input.destinatario.email || undefined,
    },
    det: produtos,
    total: {
      ICMSTot: {
        vBC: 0,
        vICMS: 0,
        vICMSDeson: 0,
        vFCP: 0,
        vBCST: 0,
        vST: 0,
        vFCPST: 0,
        vFCPSTRet: 0,
        vProd: totalProdutos,
        vFrete: money(input.frete),
        vSeg: 0,
        vDesc: money(input.desconto),
        vII: 0,
        vIPI: 0,
        vIPIDevol: 0,
        vPIS: 0,
        vCOFINS: 0,
        vOutro: 0,
        vNF: total,
      },
    },
    transp: { modFrete: 9 },
    pag: {
      detPag: [
        {
          indPag: 0,
          tPag: formaPagamentoCodigo[input.pagamento.forma] ?? "99",
          vPag: money(input.pagamento.valor || total),
        },
      ],
    },
    infAdic: input.informacoesAdicionais ? { infCpl: input.informacoesAdicionais } : undefined,
  };
}
