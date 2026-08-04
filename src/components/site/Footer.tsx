import { Link } from "@tanstack/react-router";
import { Mail, MapPin, Phone } from "lucide-react";
import { Logo } from "@/components/site/Logo";

const columns = [
  {
    title: "Produtos",
    links: [
      { to: "/impressoras", label: "Impressoras 3D" },
      { to: "/filamentos", label: "Filamentos e insumos" },
      { to: "/loja", label: "Peças e acessórios" },
      { to: "/loja", label: "Ver loja completa" },
    ],
  },
  {
    title: "Serviços",
    links: [
      { to: "/impressao-3d", label: "Impressão sob demanda" },
      { to: "/impressao-3d", label: "Projetos e engenharia" },
      { to: "/suporte", label: "Implantação e treinamento" },
      { to: "/suporte", label: "Manutenção" },
    ],
  },
  {
    title: "Institucional",
    links: [
      { to: "/empresa", label: "Quem somos" },
      { to: "/makers", label: "Área Maker" },
      { to: "/suporte", label: "Central de suporte" },
      { to: "/contato", label: "Contato" },
    ],
  },
] as const;

export function Footer() {
  return (
    <footer className="surface-brand mt-24">
      <div className="container-page grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <Logo variant="light" />
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-white/75">
            Da ideia à peça pronta. Equipamentos de manufatura aditiva, soluções a laser, materiais
            e suporte técnico para empresas, escolas, profissionais e makers.
          </p>
          <ul className="mt-6 space-y-2 text-sm text-white/75">
            <li className="flex items-center gap-2">
              <Phone className="size-4 text-accent" /> (00) 0000-0000
            </li>
            <li className="flex items-center gap-2">
              <Mail className="size-4 text-accent" /> contato@sos3d.com.br
            </li>
            <li className="flex items-center gap-2">
              <MapPin className="size-4 text-accent" /> Atendimento em todo o Brasil
            </li>
          </ul>
        </div>

        {columns.map((col) => (
          <div key={col.title}>
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-white">
              {col.title}
            </h3>
            <ul className="mt-4 space-y-2.5">
              {col.links.map((l) => (
                <li key={l.label}>
                  <Link
                    to={l.to}
                    className="text-sm text-white/70 transition-colors hover:text-accent"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-white/15">
        <div className="container-page flex flex-col gap-2 py-5 text-xs text-white/60 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} SOS.3D — Tecnologia em manufatura aditiva, laser e design.</p>
          <p>Marcas de terceiros exibidas conforme os guias oficiais de cada fornecedor.</p>
        </div>
      </div>
    </footer>
  );
}
