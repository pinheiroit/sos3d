import { useSiteContent } from "@/lib/site-content";

/** Faixa de marcas parceiras exibida logo acima do rodapé. */
export function PartnerBrands() {
  const { brands } = useSiteContent();
  console.log("BRANDS", JSON.stringify(brands));
  if (brands.length === 0) return <div data-debug="partner-empty" />;

  return (
    <section className="border-t border-border bg-secondary/50">
      <div className="container-page py-10">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Marcas parceiras
        </p>
        <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
          {brands.map((b) => {
            const content = b.logo_url ? (
              <img
                src={b.logo_url}
                alt={`Logo ${b.name}`}
                loading="lazy"
                className="h-10 w-auto max-w-[160px] object-contain opacity-80 transition-opacity hover:opacity-100"
              />
            ) : (
              <span className="text-lg font-semibold tracking-tight text-foreground/70 transition-colors hover:text-foreground">
                {b.name}
              </span>
            );
            return (
              <li key={b.id}>
                {b.website_url ? (
                  <a href={b.website_url} target="_blank" rel="noreferrer noopener">
                    {content}
                  </a>
                ) : (
                  content
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
