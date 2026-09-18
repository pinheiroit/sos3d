import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

const specSchema = z.object({ label: z.string().max(120), value: z.string().max(400) });

const installmentSchema = z.object({
  months: z.number().int().min(2).max(48),
  installment: z.number().min(0).max(10_000_000),
  total: z.number().min(0).max(10_000_000),
});

const productSchema = z.object({
  slug: z.string().trim().min(2).max(120).regex(/^[a-z0-9-]+$/),
  name: z.string().trim().min(2).max(180),
  brand: z.string().trim().min(1).max(80),
  category: z
    .string()
    .trim()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/, "Categoria inválida"),
  subcategory: z
    .string()
    .trim()
    .max(60)
    .regex(/^[a-z0-9-]*$/, "Subcategoria inválida")
    .default(""),
  subtitle: z.string().trim().max(300).default(""),
  description: z.string().trim().max(4000).default(""),
  price: z.number().min(0).max(10_000_000),
  old_price: z.number().min(0).max(10_000_000).nullable().optional(),
  image_key: z.string().trim().max(60).default("printer-1"),
  image_url: z
    .string()
    .trim()
    .max(2000)
    .refine((v) => v === "" || v.startsWith("/") || /^https?:\/\//.test(v), "URL inválida")
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional(),
  badge: z.string().trim().max(40).nullable().optional(),
  stock: z.number().int().min(0).max(1_000_000),
  active: z.boolean().default(true),
  use_cases: z.array(z.string().trim().max(120)).max(12).default([]),
  specs: z.array(specSchema).max(30).default([]),
  installments: z.array(installmentSchema).max(24).default([]),
});

export const adminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdmin, adminClient } = await import("@/lib/admin-guard.server");
    await assertAdmin(context.supabase, context.userId);
    const db = await adminClient();

    const [products, orders, memberships, profiles, courses, memberModels] = await Promise.all([
      db.from("products").select("*").order("created_at", { ascending: true }),
      db.from("orders").select("*, order_items(*)").order("created_at", { ascending: false }).limit(200),
      db.from("memberships").select("*").order("granted_at", { ascending: false }),
      db.from("profiles").select("*").order("created_at", { ascending: false }).limit(500),
      db.from("courses").select("*, lessons(*)").order("sort_order", { ascending: true }),
      db.from("membership_printer_models").select("user_id, printer_model_id"),
    ]);

    const firstError =
      products.error ??
      orders.error ??
      memberships.error ??
      profiles.error ??
      courses.error ??
      memberModels.error;
    if (firstError) throw new Error(firstError.message);

    return {
      products: products.data ?? [],
      orders: orders.data ?? [],
      memberships: memberships.data ?? [],
      profiles: profiles.data ?? [],
      courses: courses.data ?? [],
      memberModels: memberModels.data ?? [],
    };
  });

export const saveProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid().nullable().optional(), values: productSchema }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { assertAdmin, adminClient } = await import("@/lib/admin-guard.server");
    await assertAdmin(context.supabase, context.userId);
    const db = await adminClient();

    const v = data.values;
    const payload = {
      slug: v.slug,
      name: v.name,
      brand: v.brand,
      category: v.category,
      subcategory: v.subcategory ?? "",
      subtitle: v.subtitle,
      description: v.description,
      price: v.price,
      old_price: v.old_price ?? null,
      image_key: v.image_key,
      image_url: v.image_url ?? null,
      badge: v.badge ?? null,
      stock: v.stock,
      active: v.active,
      use_cases: v.use_cases,
      specs: v.specs,
      installments: v.installments,
      updated_at: new Date().toISOString(),
    };
    const query = data.id
      ? db.from("products").update(payload).eq("id", data.id)
      : db.from("products").insert(payload);
    const { error } = await query;
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { assertAdmin, adminClient } = await import("@/lib/admin-guard.server");
    await assertAdmin(context.supabase, context.userId);
    const db = await adminClient();
    const { error } = await db.from("products").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const quickUpdateProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        price: z.number().min(0).max(10_000_000).optional(),
        stock: z.number().int().min(0).max(1_000_000).optional(),
        active: z.boolean().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { assertAdmin, adminClient } = await import("@/lib/admin-guard.server");
    await assertAdmin(context.supabase, context.userId);
    const db = await adminClient();
    const current = await db.from("products").select("price, stock, active").eq("id", data.id).single();
    if (current.error) throw new Error(current.error.message);
    const { error } = await db
      .from("products")
      .update({
        price: data.price ?? current.data.price,
        stock: data.stock ?? current.data.stock,
        active: data.active ?? current.data.active,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateProductImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      id: z.string().uuid(),
      imageUrl: z.string().trim().max(2000).startsWith("/api/public/img/").nullable(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { assertAdmin, adminClient } = await import("@/lib/admin-guard.server");
    await assertAdmin(context.supabase, context.userId);
    const db = await adminClient();
    const { error } = await db
      .from("products")
      .update({ image_url: data.imageUrl, updated_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const findProductImages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ query: z.string().trim().min(3).max(220) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/admin-guard.server");
    await assertAdmin(context.supabase, context.userId);

    const apiKey = process.env["SERPAPI_API_KEY"];
    if (!apiKey) {
      throw new Error("A pesquisa de imagens ainda não foi configurada.");
    }

    const endpoint = new URL("https://serpapi.com/search.json");
    endpoint.searchParams.set("api_key", apiKey);
    endpoint.searchParams.set("engine", "google_images");
    endpoint.searchParams.set("q", data.query);
    endpoint.searchParams.set("google_domain", "google.com.br");
    endpoint.searchParams.set("hl", "pt-br");
    endpoint.searchParams.set("gl", "br");
    endpoint.searchParams.set("safe", "active");

    const response = await fetch(endpoint, { headers: { Accept: "application/json" } });
    const payload = await response.json() as {
      error?: string;
      images_results?: Array<{
        original?: string;
        thumbnail?: string;
        title?: string;
        source?: string;
        link?: string;
        original_width?: number;
        original_height?: number;
      }>;
    };
    if (!response.ok) {
      throw new Error(payload.error ?? "Não foi possível pesquisar as imagens no Google.");
    }
    if (payload.error) throw new Error(payload.error);

    return (payload.images_results ?? []).slice(0, 10).flatMap((item) => {
      if (!item.original?.startsWith("https://") || !item.thumbnail?.startsWith("https://")) return [];
      return [{
        imageUrl: item.original,
        thumbnailUrl: item.thumbnail,
        title: item.title?.trim() || data.query,
        source: item.source?.trim() || new URL(item.original).hostname,
        sourceUrl: item.link?.startsWith("https://") ? item.link : null,
        width: item.original_width ?? null,
        height: item.original_height ?? null,
      }];
    });
  });

export const importProductImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      id: z.string().uuid(),
      imageUrl: z.string().trim().url().max(3000),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { assertAdmin, adminClient } = await import("@/lib/admin-guard.server");
    await assertAdmin(context.supabase, context.userId);

    function validateExternalImageUrl(value: string) {
      const url = new URL(value);
      const blockedHostname =
        url.hostname === "localhost" ||
        url.hostname.endsWith(".local") ||
        url.hostname === "0.0.0.0" ||
        url.hostname === "127.0.0.1" ||
        url.hostname === "::1" ||
        /^10\./.test(url.hostname) ||
        /^192\.168\./.test(url.hostname) ||
        /^169\.254\./.test(url.hostname) ||
        /^172\.(1[6-9]|2\d|3[01])\./.test(url.hostname);
      if (url.protocol !== "https:" || url.username || url.password || url.port || blockedHostname) {
        throw new Error("Endereço de imagem não permitido.");
      }
      return url;
    }

    let source = validateExternalImageUrl(data.imageUrl);
    let response: Response | null = null;
    for (let redirectCount = 0; redirectCount <= 3; redirectCount += 1) {
      response = await fetch(source, {
        redirect: "manual",
        headers: {
          Accept: "image/avif,image/webp,image/png,image/jpeg,image/gif",
          "User-Agent": "Mozilla/5.0 (compatible; SOS3DProductImageImport/1.0)",
        },
      });
      if (response.status < 300 || response.status >= 400) break;
      const location = response.headers.get("location");
      if (!location || redirectCount === 3) {
        throw new Error("A imagem possui redirecionamentos demais.");
      }
      source = validateExternalImageUrl(new URL(location, source).toString());
    }
    if (!response) throw new Error("Não foi possível acessar esta imagem.");
    if (!response.ok) throw new Error("O site de origem não permitiu copiar esta imagem.");
    const contentType = (response.headers.get("content-type") ?? "").split(";")[0]?.trim();
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"];
    if (!contentType || !allowedTypes.includes(contentType)) throw new Error("O resultado não é uma imagem compatível.");
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > 6_000_000) throw new Error("A imagem encontrada é maior que 6MB.");

    const extensionByType: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/avif": "avif",
      "image/gif": "gif",
    };
    const path = `uploads/${crypto.randomUUID()}.${extensionByType[contentType] ?? "jpg"}`;
    const db = await adminClient();
    const upload = await db.storage.from("site-images").upload(path, bytes, { contentType, upsert: false });
    if (upload.error) throw new Error(upload.error.message);
    const imageUrl = `/api/public/img/${path}`;
    const update = await db
      .from("products")
      .update({ image_url: imageUrl, updated_at: new Date().toISOString() })
      .eq("id", data.id);
    if (update.error) throw new Error(update.error.message);
    return { imageUrl };
  });

export const updateOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["pendente", "pago", "em_producao", "enviado", "concluido", "cancelado"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { assertAdmin, adminClient } = await import("@/lib/admin-guard.server");
    await assertAdmin(context.supabase, context.userId);
    const db = await adminClient();
    const { error } = await db
      .from("orders")
      .update({ status: data.status, updated_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setMembership = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        userId: z.string().uuid(),
        active: z.boolean(),
        printerModel: z.string().trim().max(120).nullable().optional(),
        printerModelId: z.string().uuid().nullable().optional(),
        printerModelIds: z.array(z.string().uuid()).max(50).optional(),
        notes: z.string().trim().max(600).nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { assertAdmin, adminClient } = await import("@/lib/admin-guard.server");
    await assertAdmin(context.supabase, context.userId);
    const db = await adminClient();

    const { error } = await db.from("memberships").upsert(
      {
        user_id: data.userId,
        active: data.active,
        printer_model: data.printerModel ?? null,
        ...(data.printerModelId !== undefined ? { printer_model_id: data.printerModelId } : {}),
        notes: data.notes ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (error) throw new Error(error.message);

    if (data.printerModelIds) {
      const del = await db
        .from("membership_printer_models")
        .delete()
        .eq("user_id", data.userId);
      if (del.error) throw new Error(del.error.message);
      if (data.printerModelIds.length) {
        const ins = await db.from("membership_printer_models").insert(
          data.printerModelIds.map((printer_model_id) => ({
            user_id: data.userId,
            printer_model_id,
          })),
        );
        if (ins.error) throw new Error(ins.error.message);
      }
    }

    return { ok: true };
  });

const importRowSchema = productSchema.partial({
  brand: true,
  subcategory: true,
  subtitle: true,
  description: true,
  image_key: true,
  stock: true,
  active: true,
  use_cases: true,
  specs: true,
  installments: true,
});

/** Importa/atualiza produtos em massa (chave: slug). */
export const importProducts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ rows: z.array(importRowSchema).min(1).max(500) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { assertAdmin, adminClient } = await import("@/lib/admin-guard.server");
    await assertAdmin(context.supabase, context.userId);
    const db = await adminClient();

    const existing = await db.from("products").select("id, slug");
    if (existing.error) throw new Error(existing.error.message);
    const bySlug = new Map((existing.data ?? []).map((p) => [p.slug, p.id]));

    const now = new Date().toISOString();
    const errors: string[] = [];
    let created = 0;
    let updated = 0;

    // Um mesmo slug repetido no lote quebra o ON CONFLICT do Postgres:
    // mantemos apenas a última ocorrência de cada slug.
    const deduped = new Map<string, Database["public"]["Tables"]["products"]["Insert"]>();
    const duplicates: string[] = [];

    for (const row of data.rows) {
      if (deduped.has(row.slug)) duplicates.push(row.slug);
      deduped.set(row.slug, {
        slug: row.slug,
        name: row.name,
        brand: row.brand ?? "SOS.3D",
        category: row.category,
        subcategory: row.subcategory ?? "",
        subtitle: row.subtitle ?? "",
        description: row.description ?? "",
        price: row.price,
        old_price: row.old_price ?? null,
        image_key: row.image_key ?? "printer-1",
        image_url: row.image_url ?? null,
        badge: row.badge ?? null,
        stock: row.stock ?? 0,
        active: row.active ?? true,
        use_cases: row.use_cases ?? [],
        specs: row.specs ?? [],
        installments: row.installments ?? [],
        updated_at: now,
      });
    }

    for (const slug of deduped.keys()) {
      if (bySlug.has(slug)) updated += 1;
      else created += 1;
    }

    if (duplicates.length) {
      const sample = Array.from(new Set(duplicates)).slice(0, 10).join(", ");
      errors.push(
        `${duplicates.length} linha(s) com slug repetido na planilha; usamos a última de cada. Ex.: ${sample}`,
      );
    }

    const payload = Array.from(deduped.values());
    const res = await db.from("products").upsert(payload, { onConflict: "slug" });
    if (res.error) {
      errors.push(res.error.message);
      created = 0;
      updated = 0;
    }

    return { created, updated, errors };

  });

const nfeInvoiceSchema = z.object({
  accessKey: z.string().regex(/^\d{44}$/),
  number: z.string().trim().min(1).max(30),
  series: z.string().trim().max(10),
  issuedAt: z.string().max(40),
  supplierDocument: z.string().regex(/^\d{11,14}$/),
  supplierName: z.string().trim().min(2).max(200),
  totalAmount: z.number().min(0).max(100_000_000),
});

const nfeItemSchema = z.object({
  supplierCode: z.string().trim().min(1).max(120),
  ean: z.string().trim().max(30),
  description: z.string().trim().min(1).max(500),
  quantity: z.number().positive().max(1_000_000),
  unitCost: z.number().min(0).max(10_000_000),
  totalCost: z.number().min(0).max(100_000_000),
  action: z.enum(["linked", "created", "ignored"]),
  productId: z.string().uuid().optional(),
  newProduct: z.object({
    slug: z.string().trim().min(2).max(120).regex(/^[a-z0-9-]+$/),
    name: z.string().trim().min(2).max(180),
    brand: z.string().trim().max(80),
    category: z.string().trim().min(2).max(60).regex(/^[a-z0-9-]+$/),
    subcategory: z.string().trim().max(60).regex(/^[a-z0-9-]*$/),
    price: z.number().min(0).max(10_000_000),
  }).optional(),
}).superRefine((item, ctx) => {
  if (item.action === "linked" && !item.productId) ctx.addIssue({ code: "custom", message: "Selecione o produto vinculado." });
  if (item.action === "created" && !item.newProduct) ctx.addIssue({ code: "custom", message: "Preencha o novo produto." });
});

export const processNfeStockEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ invoice: nfeInvoiceSchema, items: z.array(nfeItemSchema).min(1).max(1000) }))
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/admin-guard.server");
    await assertAdmin(context.supabase, context.userId);
    const { data: entryId, error } = await context.supabase.rpc("process_nfe_stock_entry", {
      _invoice: data.invoice,
      _items: data.items,
    });
    if (error) throw new Error(error.message);
    return { entryId };
  });
