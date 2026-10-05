// Constantes e rótulos do sistema de Assistência Técnica (P.A. / O.S.). Seguro para o cliente.

export const paNumber = (n: number) => `PA-${String(n).padStart(6, "0")}`;
export const osNumber = (n: number) => `OS ${String(n).padStart(4, "0")}`;

export const REQUEST_STATUS: Record<string, string> = {
  recebida: "Solicitação recebida",
  aguardando_documentacao: "Aguardando documentação",
  em_analise: "Em análise",
  liberado_entrega: "Liberado para entrega do equipamento",
  convertida: "Equipamento recebido (O.S. gerada)",
  cancelado: "Cancelado",
};

export const ORDER_FLOW = [
  "recebido",
  "em_triagem",
  "em_diagnostico",
  "aguardando_cliente",
  "aguardando_peca",
  "em_manutencao",
  "em_testes",
  "pronto_retirada",
  "entregue",
] as const;

export const ORDER_STATUS: Record<string, string> = {
  recebido: "Recebido",
  em_triagem: "Em triagem",
  em_diagnostico: "Em diagnóstico",
  aguardando_cliente: "Aguardando cliente",
  aguardando_peca: "Aguardando peça",
  em_manutencao: "Em manutenção",
  em_testes: "Em testes",
  pronto_retirada: "Pronto para retirada",
  entregue: "Entregue",
  aguardando_fabricante: "Aguardando fabricante",
  analise_garantia: "Em análise de garantia",
  orcamento_recusado: "Orçamento recusado",
  devolucao_sem_reparo: "Devolução sem reparo",
  cancelado: "Cancelado",
};

export const CLOSED_ORDER_STATUS = ["entregue", "devolucao_sem_reparo", "cancelado"];

export const WARRANTY_STATUS: Record<string, string> = {
  fora: "Fora de garantia",
  analise: "Em análise de garantia",
  aprovada: "Garantia aprovada",
  negada: "Garantia negada",
  particular: "Cliente optou por atendimento particular",
};

export const BUDGET_STATUS: Record<string, string> = {
  nao_aplica: "Sem cobrança",
  elaboracao: "Orçamento em elaboração",
  enviado: "Orçamento enviado",
  aguardando: "Aguardando aprovação",
  aprovado: "Aprovado",
  recusado: "Recusado",
};

export const VALIDATION_RESULT: Record<string, string> = {
  aprovado: "Aprovado — equipamento pode ser liberado",
  aprovado_obs: "Aprovado com observação",
  reprovado: "Reprovado",
  nova_intervencao: "Necessita nova intervenção",
};

export const CLOSING_REASON: Record<string, string> = {
  reparado: "Reparado",
  sem_defeito: "Sem defeito constatado",
  garantia_atendida: "Garantia atendida",
  garantia_negada: "Garantia negada",
  orcamento_recusado: "Orçamento recusado",
  cliente_nao_reparar: "Cliente optou por não realizar o reparo",
  devolvido_sem_reparo: "Devolvido sem reparo",
};

export const PART_ORIGIN: Record<string, string> = {
  estoque: "Estoque SOS 3D",
  cliente: "Peça do cliente",
  fabricante: "Fabricante / garantia",
};

export const FAILURE_TYPES: { value: string; label: string; evidence: string }[] = [
  { value: "ruido", label: "Ruído durante a impressão", evidence: "Envie um vídeo com áudio mostrando a impressora funcionando até o ruído ocorrer." },
  { value: "qualidade", label: "Problema de qualidade de impressão", evidence: "Envie fotos da peça e da placa; se possível, um vídeo da impressão em andamento." },
  { value: "erro", label: "Código de erro", evidence: "Envie uma foto ou captura da mensagem exibida na tela." },
  { value: "nao_liga", label: "Não liga / não conecta", evidence: "Envie um vídeo tentando ligar o equipamento e uma foto da fonte e dos cabos." },
  { value: "outro", label: "Outro problema", evidence: "Envie fotos ou vídeos que ajudem a entender o problema." },
];

export const FILE_CATEGORIES: Record<string, string> = {
  nota_fiscal: "Nota fiscal",
  foto: "Foto",
  video: "Vídeo",
  captura: "Captura de tela",
  log: "Log técnico",
  termo: "Termo assinado",
  autorizacao: "Evidência de autorização",
  outro: "Outro documento",
};

export const STAGES: Record<string, string> = {
  equipamento: "Cadastro do equipamento",
  pre_atendimento: "Pré-atendimento",
  recebimento: "Recebimento",
  diagnostico: "Diagnóstico",
  garantia: "Garantia",
  orcamento: "Orçamento",
  execucao: "Execução",
  validacao: "Validação final",
  encerramento: "Encerramento",
};

export const fmtDate = (v?: string | null) => (v ? new Date(v).toLocaleDateString("pt-BR") : "—");
export const fmtDateTime = (v?: string | null) =>
  v ? new Date(v).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—";

export type Budget = { evaluation?: number; labor?: number; parts?: number; other?: number; discount?: number };
export const budgetTotal = (b: Budget) =>
  Math.max(0, (b.evaluation ?? 0) + (b.labor ?? 0) + (b.parts ?? 0) + (b.other ?? 0) - (b.discount ?? 0));

export function statusTone(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (["cancelado", "orcamento_recusado", "devolucao_sem_reparo"].includes(status)) return "destructive";
  if (["pronto_retirada", "entregue", "liberado_entrega", "convertida"].includes(status)) return "default";
  return "secondary";
}
