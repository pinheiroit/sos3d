import { Link } from "@tanstack/react-router";
import { Mail, MapPin, Phone } from "lucide-react";
import { Logo } from "@/components/site/Logo";
import { useSiteContent } from "@/lib/site-content";

export function Footer() {
  const { footer } = useSiteContent();

  return (
    <footer className="surface-brand">
      <div className="container-page grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <Logo variant="light" />
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-white/75">{footer.tagline}</p>
          <ul className="mt-6 space-y-2 text-sm text-white/75">
            {footer.phone && (
              <li className="flex items-center gap-2">
                <Phone className="size-4 text-accent" /> {footer.phone}
              </li>
            )}
            {footer.email && (
              <li className="flex items-center gap-2">
                <Mail className="size-4 text-accent" /> {footer.email}
              </li>
            )}
            {footer.address && (
              <li className="flex items-center gap-2">
                <MapPin className="size-4 text-accent" /> {footer.address}
              </li>
            )}
          </ul>
        </div>

        {footer.columns.map((col) => (
          <div key={col.title}>
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-white">
              {col.title}
            </h3>
            <ul className="mt-4 space-y-2.5">
              {col.links.map((l, i) => (
                <li key={`${l.label}-${i}`}>
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
          <p>
            © {new Date().getFullYear()} {footer.copyright}
          </p>
          <p>{footer.legal}</p>
        </div>
      </div>
    </footer>
  );
}
