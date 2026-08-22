import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { mapProduct, type ProductRow } from "@/lib/catalog";

export const listProducts = createServerFn({ method: "GET" }).handler(async () => {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  const url = process.env["SUPABASE_URL"]!;
  const client = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });

  const [{ data, error }, settings] = await Promise.all([
    client
      .from("products")
      .select(
        "id, slug, name, brand, category, subcategory, subtitle, description, price, old_price, image_key, image_url, badge, stock, active, use_cases, specs, installments",
      )
      .eq("active", true)
      .order("created_at", { ascending: true }),
    client.from("site_settings").select("value").eq("key", "pricing").maybeSingle(),
  ]);

  if (error) throw new Error(error.message);

  const { normalizeRules, promoPercentFor, round2 } = await import("@/lib/pricing");
  const rules = normalizeRules(settings.data?.value ?? null);

  return (data ?? []).map((row) => {
    const product = mapProduct(row as unknown as ProductRow);
    const pct = promoPercentFor(product, rules);
    if (pct <= 0) return product;
    return {
      ...product,
      oldPrice: product.oldPrice ?? product.price,
      price: round2(product.price * (1 - pct / 100)),
    };
  });
});

