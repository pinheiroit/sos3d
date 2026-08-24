import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { listProducts } from "@/lib/catalog.functions";

const BASE_URL = "https://sos3d.lovable.app";

interface SitemapEntry {
  path: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries: SitemapEntry[] = [
          { path: "/", changefreq: "daily", priority: "1.0" },
          { path: "/loja", changefreq: "daily", priority: "0.9" },
          { path: "/impressoras", changefreq: "daily", priority: "0.9" },
          { path: "/filamentos", changefreq: "daily", priority: "0.9" },
          { path: "/impressao-3d", changefreq: "weekly", priority: "0.8" },
          { path: "/makers", changefreq: "weekly", priority: "0.7" },
          { path: "/empresa", changefreq: "monthly", priority: "0.6" },
          { path: "/suporte", changefreq: "monthly", priority: "0.6" },
          { path: "/contato", changefreq: "monthly", priority: "0.6" },
        ];

        try {
          const products = await listProducts();
          for (const p of products) {
            if (p.active !== false) {
              entries.push({ path: `/produto/${p.slug}`, changefreq: "weekly", priority: "0.8" });
            }
          }
        } catch {
          // catálogo indisponível: mantém apenas as rotas estáticas
        }

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
