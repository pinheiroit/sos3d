export type NfeItem = {
  line: number;
  supplierCode: string;
  ean: string;
  description: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
};

export type ParsedNfe = {
  accessKey: string;
  number: string;
  series: string;
  issuedAt: string;
  supplierDocument: string;
  supplierName: string;
  totalAmount: number;
  items: NfeItem[];
};

const one = (root: ParentNode, name: string) =>
  Array.from(root.querySelectorAll("*")).find((node) => node.localName === name)?.textContent?.trim() ?? "";

const direct = (root: Element, name: string) =>
  Array.from(root.children).find((node) => node.localName === name)?.textContent?.trim() ?? "";

const cleanDocument = (value: string) => value.replace(/\D/g, "");
const cleanEan = (value: string) => {
  const normalized = value.trim().toUpperCase();
  return !normalized || normalized === "SEM GTIN" ? "" : value.replace(/\D/g, "");
};
const numberOf = (value: string) => {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
};

export function parseNfeXml(content: string): ParsedNfe {
  const document = new DOMParser().parseFromString(content, "application/xml");
  if (document.querySelector("parsererror")) throw new Error("O arquivo não contém um XML válido.");

  const infNfe = Array.from(document.querySelectorAll("*")).find((node) => node.localName === "infNFe");
  if (!infNfe) throw new Error("O arquivo não parece ser uma NF-e autorizada.");

  const emit = Array.from(infNfe.children).find((node) => node.localName === "emit");
  const ide = Array.from(infNfe.children).find((node) => node.localName === "ide");
  const total = Array.from(infNfe.children).find((node) => node.localName === "total");
  const accessKey = (infNfe.getAttribute("Id") ?? "").replace(/^NFe/i, "").replace(/\D/g, "");

  if (accessKey.length !== 44) throw new Error("A chave de acesso da NF-e não foi encontrada ou é inválida.");

  const items = Array.from(infNfe.children)
    .filter((node) => node.localName === "det")
    .map((det, index) => {
      const prod = Array.from(det.children).find((node) => node.localName === "prod");
      if (!prod) throw new Error(`Produto inválido no item ${index + 1}.`);
      const quantity = numberOf(direct(prod, "qCom"));
      return {
        line: Number(det.getAttribute("nItem")) || index + 1,
        supplierCode: direct(prod, "cProd"),
        ean: cleanEan(direct(prod, "cEAN") || direct(prod, "cEANTrib")),
        description: direct(prod, "xProd"),
        quantity,
        unitCost: numberOf(direct(prod, "vUnCom")),
        totalCost: numberOf(direct(prod, "vProd")),
      };
    });

  if (!items.length) throw new Error("Nenhum item foi encontrado na NF-e.");

  return {
    accessKey,
    number: ide ? direct(ide, "nNF") : "",
    series: ide ? direct(ide, "serie") : "",
    issuedAt: ide ? direct(ide, "dhEmi") || direct(ide, "dEmi") : "",
    supplierDocument: emit ? cleanDocument(direct(emit, "CNPJ") || direct(emit, "CPF")) : "",
    supplierName: emit ? direct(emit, "xNome") : "",
    totalAmount: total ? numberOf(one(total, "vNF")) : items.reduce((sum, item) => sum + item.totalCost, 0),
    items,
  };
}

export function normalizeProductName(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function productSlug(value: string) {
  return normalizeProductName(value).replace(/\s+/g, "-").slice(0, 110) || `produto-${Date.now()}`;
}
