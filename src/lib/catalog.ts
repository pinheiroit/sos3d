import printer1 from "@/assets/printer-1.jpg";
import printer2 from "@/assets/printer-2.jpg";
import printer3 from "@/assets/printer-3.jpg";
import filament1 from "@/assets/filament-1.jpg";
import filament2 from "@/assets/filament-2.jpg";
import filament3 from "@/assets/filament-3.jpg";

export type Category = "impressoras" | "filamentos" | "acessorios";

export type Product = {
  slug: string;
  name: string;
  brand: string;
  category: Category;
  subtitle: string;
  price: number;
  oldPrice?: number;
  image: string;
  badge?: string;
  stock: number;
  useCases: string[];
  description: string;
  specs: { label: string; value: string }[];
};

export const categoryLabels: Record<Category, string> = {
  impressoras: "Impressoras 3D",
  filamentos: "Filamentos e insumos",
  acessorios: "Peças e acessórios",
};

export const products: Product[] = [
  {
    slug: "bambu-lab-p1s-combo",
    name: "Bambu Lab P1S Combo",
    brand: "Bambu Lab",
    category: "impressoras",
    subtitle: "CoreXY fechada com sistema multicor de 4 filamentos.",
    price: 8990,
    oldPrice: 9790,
    image: printer1,
    badge: "Mais vendida",
    stock: 6,
    useCases: ["Prototipagem", "Pequenas séries", "Escritório"],
    description:
      "Impressora CoreXY fechada, indicada para quem precisa de velocidade com repetibilidade. Câmara fechada permite trabalhar com ABS, ASA e materiais técnicos, e o sistema multicor amplia acabamento e apresentação de protótipos.",
    specs: [
      { label: "Volume de construção", value: "256 × 256 × 256 mm" },
      { label: "Velocidade máxima", value: "500 mm/s" },
      { label: "Bico", value: "Hotend 300 °C, bico endurecido" },
      { label: "Materiais", value: "PLA, PETG, ABS, ASA, TPU, PA-CF" },
      { label: "Conectividade", value: "Wi-Fi, LAN e cartão microSD" },
    ],
  },
  {
    slug: "bambu-lab-a1-mini",
    name: "Bambu Lab A1 mini",
    brand: "Bambu Lab",
    category: "impressoras",
    subtitle: "Compacta, silenciosa e pronta para começar em minutos.",
    price: 3290,
    image: printer2,
    badge: "Entrada",
    stock: 12,
    useCases: ["Educação", "Makers", "Personalização"],
    description:
      "Modelo compacto e de operação simples, ideal para laboratórios de ensino, makers iniciantes e escritórios de design que precisam de validação rápida de forma.",
    specs: [
      { label: "Volume de construção", value: "180 × 180 × 180 mm" },
      { label: "Nivelamento", value: "Automático total" },
      { label: "Materiais", value: "PLA, PETG, TPU" },
      { label: "Ruído", value: "48 dB em modo silencioso" },
      { label: "Consumo", value: "150 W médio" },
    ],
  },
  {
    slug: "snapmaker-artisan",
    name: "Snapmaker Artisan 3 em 1",
    brand: "Snapmaker",
    category: "impressoras",
    subtitle: "Impressão 3D, corte a laser e usinagem CNC na mesma base.",
    price: 24900,
    image: printer3,
    badge: "Multifuncional",
    stock: 3,
    useCases: ["Fab Lab", "Engenharia", "Comunicação visual"],
    description:
      "Plataforma modular que combina manufatura aditiva, laser e CNC. Indicada para laboratórios e empresas que precisam de mais de um processo sem multiplicar equipamentos e espaço.",
    specs: [
      { label: "Volume de impressão", value: "400 × 400 × 400 mm" },
      { label: "Laser", value: "Módulo 40 W com exaustão" },
      { label: "CNC", value: "Spindle 200 W, 18.000 rpm" },
      { label: "Extrusão", value: "Dupla, direct drive" },
      { label: "Estrutura", value: "Perfis de alumínio com gabinete" },
    ],
  },
  {
    slug: "masterprint-industrial-x",
    name: "Masterprint Industrial X",
    brand: "Masterprint",
    category: "impressoras",
    subtitle: "Câmara aquecida para produção contínua de peças técnicas.",
    price: 68900,
    image: printer3,
    stock: 2,
    useCases: ["Indústria", "Peças de reposição", "Gabaritos"],
    description:
      "Equipamento de porte industrial para operação contínua, com câmara aquecida e monitoramento remoto. Projetado para gabaritos, dispositivos de linha e peças funcionais em materiais de engenharia.",
    specs: [
      { label: "Volume de construção", value: "400 × 400 × 500 mm" },
      { label: "Câmara", value: "Aquecida até 90 °C" },
      { label: "Materiais", value: "PA, PC, ABS, ASA, PA-CF, PEI" },
      { label: "Monitoramento", value: "Câmera interna e fila remota" },
      { label: "Garantia", value: "12 meses com suporte técnico" },
    ],
  },
  {
    slug: "voolt-3d-pla-premium",
    name: "Filamento PLA Premium 1 kg",
    brand: "Voolt 3D",
    category: "filamentos",
    subtitle: "Acabamento uniforme e tolerância de ±0,02 mm.",
    price: 129,
    oldPrice: 149,
    image: filament1,
    badge: "Top de linha",
    stock: 240,
    useCases: ["Protótipos", "Educação", "Peças decorativas"],
    description:
      "PLA de alta consistência para quem precisa de repetibilidade em série. Baixo empenamento, boa aderência e cores estáveis entre lotes.",
    specs: [
      { label: "Diâmetro", value: "1,75 mm (±0,02 mm)" },
      { label: "Peso líquido", value: "1 kg" },
      { label: "Temperatura de bico", value: "195–215 °C" },
      { label: "Mesa", value: "50–60 °C" },
      { label: "Embalagem", value: "Selada a vácuo com sílica" },
    ],
  },
  {
    slug: "voolt-3d-petg",
    name: "Filamento PETG 1 kg",
    brand: "Voolt 3D",
    category: "filamentos",
    subtitle: "Resistência mecânica e química para peças funcionais.",
    price: 159,
    image: filament2,
    stock: 180,
    useCases: ["Peças funcionais", "Suportes", "Uso externo"],
    description:
      "PETG com boa resistência ao impacto e à umidade, indicado para suportes, organizadores e componentes expostos a variações de temperatura.",
    specs: [
      { label: "Diâmetro", value: "1,75 mm (±0,03 mm)" },
      { label: "Peso líquido", value: "1 kg" },
      { label: "Temperatura de bico", value: "230–250 °C" },
      { label: "Mesa", value: "70–85 °C" },
      { label: "Secagem", value: "Recomendada antes do uso" },
    ],
  },
  {
    slug: "masterprint-nylon-cf",
    name: "Nylon com fibra de carbono 1 kg",
    brand: "Masterprint",
    category: "filamentos",
    subtitle: "Rigidez e estabilidade dimensional para engenharia.",
    price: 429,
    image: filament3,
    badge: "Técnico",
    stock: 45,
    useCases: ["Gabaritos", "Indústria", "Manutenção"],
    description:
      "Composto de poliamida reforçada com fibra de carbono, para peças que exigem rigidez, baixo desgaste e estabilidade dimensional. Requer bico endurecido.",
    specs: [
      { label: "Diâmetro", value: "1,75 mm (±0,03 mm)" },
      { label: "Peso líquido", value: "1 kg" },
      { label: "Temperatura de bico", value: "260–290 °C" },
      { label: "Bico", value: "Endurecido obrigatório" },
      { label: "Secagem", value: "70 °C por 6 h antes do uso" },
    ],
  },
  {
    slug: "kit-bicos-endurecidos",
    name: "Kit de bicos endurecidos 0,4 / 0,6 / 0,8",
    brand: "SOS.3D",
    category: "acessorios",
    subtitle: "Para materiais abrasivos e trocas rápidas de perfil.",
    price: 289,
    image: printer2,
    stock: 60,
    useCases: ["Manutenção", "Materiais abrasivos"],
    description:
      "Conjunto de bicos em aço endurecido para trabalhar com compostos de fibra de carbono, vidro e madeira sem desgaste prematuro.",
    specs: [
      { label: "Diâmetros", value: "0,4 / 0,6 / 0,8 mm" },
      { label: "Material", value: "Aço endurecido" },
      { label: "Compatibilidade", value: "Hotends padrão MK e Bambu" },
      { label: "Conteúdo", value: "3 bicos + chave" },
    ],
  },
  {
    slug: "secadora-filamento",
    name: "Secadora de filamento dupla",
    brand: "SOS.3D",
    category: "acessorios",
    subtitle: "Controle de umidade para PETG, nylon e TPU.",
    price: 899,
    image: filament3,
    stock: 25,
    useCases: ["Produção contínua", "Materiais técnicos"],
    description:
      "Mantém dois carretéis secos durante a impressão, evitando bolhas, falhas de extrusão e perda de acabamento em materiais higroscópicos.",
    specs: [
      { label: "Capacidade", value: "2 carretéis de 1 kg" },
      { label: "Temperatura", value: "35–70 °C" },
      { label: "Timer", value: "Até 48 h" },
      { label: "Uso", value: "Pode imprimir com o material dentro" },
    ],
  },
];

export const brands = ["Bambu Lab", "Snapmaker", "Masterprint", "Voolt 3D", "SOS.3D"];

export function getProduct(slug: string) {
  return products.find((p) => p.slug === slug);
}

export function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
