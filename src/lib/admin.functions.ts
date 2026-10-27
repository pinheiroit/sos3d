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
  backorder: z.boolean().default(false),
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

    const [products, orders, memberships, profiles, courses, memberModels, adminRoles] =
      await Promise.all([
        db.from("products").select("*").order("created_at", { ascending: true }),
        db
          .from("orders")
          .select("*, order_items(*)")
          .order("created_at", { ascending: false })
          .limit(200),
        db.from("memberships").select("*").order("granted_at", { ascending: false }),
        db.from("profiles").select("*").order("created_at", { ascending: false }).limit(500),
        db
          .from("courses")
          .select("*, lessons(*), course_printer_models(printer_model_id)")
          .order("sort_order", { ascending: true }),
        db.from("membership_printer_models").select("user_id, printer_model_id"),
        db.from("user_roles").select("user_id").eq("role", "admin"),
      ]);

    const firstError =
      products.error ??
      orders.error ??
      memberships.error ??
      profiles.error ??
      courses.error ??
      memberModels.error ??
      adminRoles.error;
    if (firstError) throw new Error(firstError.message);

    return {
      products: products.data ?? [],
      orders: orders.data ?? [],
      memberships: memberships.data ?? [],
      profiles: profiles.data ?? [],
      courses: courses.data ?? [],
      memberModels: memberModels.data ?? [],
      adminIds: (adminRoles.data ?? []).map((r) => r.user_id),
      currentUserId: context.userId,
    };
  });

/** Concede ou remove o papel de administrador de um usuário. */
export const setMemberAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ userId: z.string().uuid(), isAdmin: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { assertAdmin, adminClient } = await import("@/lib/admin-guard.server");
    await assertAdmin(context.supabase, context.userId);
    const db = await adminClient();

    if (data.isAdmin) {
      const { error } = await db
        .from("user_roles")
        .upsert(
          { user_id: data.userId, role: "admin" },
          { onConflict: "user_id,role", ignoreDuplicates: true },
        );
      if (error) throw new Error(error.message);
      return { ok: true };
    }

    if (data.userId === context.userId) {
      throw new Error("Você não pode remover o seu próprio acesso de administrador.");
    }
    const { count, error: countError } = await db
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    if (countError) throw new Error(countError.message);
    if ((count ?? 0) <= 1) throw new Error("O sistema precisa de pelo menos um administrador.");

    const { error } = await db
      .from("user_roles")
      .delete()
      .eq("user_id", data.userId)
      .eq("role", "admin");
    if (error) throw new Error(error.message);
    return { ok: true };
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
      backorder: v.backorder,
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
        backorder: z.boolean().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { assertAdmin, adminClient } = await import("@/lib/admin-guard.server");
    await assertAdmin(context.supabase, context.userId);
    const db = await adminClient();
    const current = await db.from("products").select("price, stock, active, backorder").eq("id", data.id).single();
    if (current.error) throw new Error(current.error.message);
    const { error } = await db
      .from("products")
      .update({
        price: data.price ?? current.data.price,
        stock: data.stock ?? current.data.stock,
        active: data.active ?? current.data.active,
        backorder: data.backorder ?? current.data.backorder,
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

const editOrderSchema = z.object({
  orderId: z.string().uuid(),
  items: z
    .array(
      z.object({
        itemId: z.string().uuid().optional(),
        slug: z.string().trim().max(120),
        qty: z.number().int().min(1).max(999),
      }),
    )
    .min(1)
    .max(60),
});

/**
 * Altera os itens de um pedido pendente (quantidade, inclusão, remoção).
 * Itens que já estavam no pedido mantêm o preço combinado; itens novos usam o preço atual.
 * Estoque, frete, desconto e total são recalculados de forma atômica no banco.
 */
export const updatePendingOrderItems = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => editOrderSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { assertAdmin, adminClient } = await import("@/lib/admin-guard.server");
    await assertAdmin(context.supabase, context.userId);
    const db = await adminClient();

    const { data: order, error: orderError } = await db
      .from("orders")
      .select("id, status, payment_method, shipping_address, subtotal, shipping, discount, order_items(*)")
      .eq("id", data.orderId)
      .maybeSingle();
    if (orderError) throw new Error(orderError.message);
    if (!order) throw new Error("Pedido não encontrado.");
    if (order.status !== "pendente") throw new Error("Só pedidos pendentes podem ser alterados.");

    const existing = new Map((order.order_items ?? []).map((i) => [i.id, i]));
    const newSlugs = data.items.filter((i) => !i.itemId || !existing.has(i.itemId)).map((i) => i.slug);

    const [{ data: rows, error }, settings] = await Promise.all([
      newSlugs.length
        ? db
            .from("products")
            .select("id, slug, name, brand, category, price, active, installments")
            .in("slug", newSlugs)
        : Promise.resolve({ data: [], error: null }),
      db.from("site_settings").select("value").eq("key", "pricing").maybeSingle(),
    ]);
    if (error) throw new Error(error.message);

    const { normalizeRules, effectivePrice, paymentDiscountPercent, shippingFor, round2, quoteFor } =
      await import("@/lib/pricing");
    const rules = normalizeRules(settings.data?.value ?? null);
    type Plan = { months: number; installment: number; total: number };

    const lines = data.items.map((item) => {
      const kept = item.itemId ? existing.get(item.itemId) : undefined;
      if (kept) {
        return {
          product_id: kept.product_id,
          product_slug: kept.product_slug,
          product_name: kept.product_name,
          unit_price: Number(kept.unit_price),
          qty: item.qty,
        };
      }
      const product = (rows ?? []).find((r) => r.slug === item.slug);
      if (!product || !product.active) throw new Error(`Produto indisponível: ${item.slug}`);
      const base = effectivePrice(
        { slug: product.slug, brand: product.brand, category: product.category, price: Number(product.price) },
        rules,
      );
      const plans = Array.isArray(product.installments)
        ? (product.installments as unknown as Plan[]).filter((p) => p && p.total > 0)
        : [];
      const unit =
        order.payment_method === "cartao"
          ? quoteFor({ price: base, installments: plans }, rules.defaultInstallments, rules).total
          : base;
      return {
        product_id: product.id,
        product_slug: product.slug,
        product_name: product.name,
        unit_price: unit,
        qty: item.qty,
      };
    });

    const subtotal = round2(lines.reduce((s, l) => s + l.qty * l.unit_price, 0));
    const address = (order.shipping_address ?? {}) as Record<string, unknown>;
    const isPickup = address["fulfillment"] === "coleta";
    const shipping = isPickup ? 0 : shippingFor(subtotal, rules);
    // Mantém o mesmo percentual de desconto combinado no pedido original.
    const oldSubtotal = Number(order.subtotal);
    const discountRate =
      oldSubtotal > 0
        ? Number(order.discount) / oldSubtotal
        : paymentDiscountPercent(order.payment_method, rules) / 100;
    const discount = round2(subtotal * discountRate);

    const { data: result, error: rpcError } = await db.rpc("replace_pending_order_items", {
      _order_id: order.id,
      _items: lines,
      _shipping: shipping,
      _discount: discount,
    });
    if (rpcError) throw new Error(rpcError.message);
    return result as { reference: string; subtotal: number; total: number };
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

/** Atualiza cadastro do membro (nome, telefone, e-mail e observações). */
export const updateMemberProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        userId: z.string().uuid(),
        fullName: z.string().trim().max(160).default(""),
        phone: z.string().trim().max(40).default(""),
        email: z.string().trim().email().max(180),
        notes: z.string().trim().max(600).default(""),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { assertAdmin, adminClient } = await import("@/lib/admin-guard.server");
    await assertAdmin(context.supabase, context.userId);
    const db = await adminClient();

    const current = await db.from("profiles").select("email").eq("id", data.userId).maybeSingle();
    if (current.error) throw new Error(current.error.message);

    const email = data.email.toLowerCase();
    if ((current.data?.email ?? "").toLowerCase() !== email) {
      const authUpdate = await db.auth.admin.updateUserById(data.userId, {
        email,
        email_confirm: true,
      });
      if (authUpdate.error) throw new Error(authUpdate.error.message);
    }

    const profile = await db
      .from("profiles")
      .update({
        full_name: data.fullName || null,
        phone: data.phone || null,
        email,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.userId);
    if (profile.error) throw new Error(profile.error.message);

    const membership = await db
      .from("memberships")
      .update({ notes: data.notes || null, updated_at: new Date().toISOString() })
      .eq("user_id", data.userId);
    if (membership.error) throw new Error(membership.error.message);

    return { ok: true };
  });

/** Define uma nova senha diretamente para o membro. */
export const setMemberPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        userId: z.string().uuid(),
        password: z.string().min(8).max(72),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { assertAdmin, adminClient } = await import("@/lib/admin-guard.server");
    await assertAdmin(context.supabase, context.userId);
    const db = await adminClient();
    const { error } = await db.auth.admin.updateUserById(data.userId, {
      password: data.password,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Envia e-mail de redefinição de senha para o membro. */
export const sendMemberPasswordReset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        email: z.string().trim().email().max(180),
        redirectTo: z.string().trim().max(400).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { assertAdmin, adminClient } = await import("@/lib/admin-guard.server");
    await assertAdmin(context.supabase, context.userId);
    const db = await adminClient();
    const redirectTo =
      data.redirectTo && /^https?:\/\//.test(data.redirectTo) ? data.redirectTo : undefined;
    const { error } = await db.auth.resetPasswordForEmail(data.email.toLowerCase(), {
      ...(redirectTo ? { redirectTo } : {}),
    });
    if (error) throw new Error(error.message);
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

// ============================ Televendas ============================

const customerSchema = z.object({
  id: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().max(180).default(""),
  phone: z.string().trim().max(40).default(""),
  document: z.string().trim().max(40).default(""),
  zip: z.string().trim().max(20).default(""),
  street: z.string().trim().max(180).default(""),
  number: z.string().trim().max(20).default(""),
  complement: z.string().trim().max(120).default(""),
  city: z.string().trim().max(120).default(""),
  state: z.string().trim().max(60).default(""),
  notes: z.string().trim().max(1000).default(""),
});

/** Cliente unificado: ficha de televendas e/ou conta criada no site. */
export type UnifiedCustomer = {
  key: string;
  customerId: string | null;
  userId: string | null;
  source: "site" | "televendas";
  isMember: boolean;
  name: string;
  email: string;
  phone: string;
  document: string;
  zip: string;
  street: string;
  number: string;
  complement: string;
  city: string;
  state: string;
  notes: string;
  createdAt: string;
};

const pick = (...values: (string | null | undefined)[]) =>
  values.find((v) => typeof v === "string" && v.trim() !== "")?.trim() ?? "";

export const listCustomers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<UnifiedCustomer[]> => {
    const { assertAdmin, adminClient } = await import("@/lib/admin-guard.server");
    await assertAdmin(context.supabase, context.userId);
    const db = await adminClient();
    const [customers, profiles, orders, memberships] = await Promise.all([
      db.from("customers").select("*"),
      db.from("profiles").select("id, email, full_name, phone, created_at"),
      db
        .from("orders")
        .select("user_id, customer_name, customer_phone, customer_document, shipping_address, created_at")
        .not("user_id", "is", null)
        .order("created_at", { ascending: false })
        .limit(2000),
      db.from("memberships").select("user_id, active").eq("active", true),
    ]);
    const err = customers.error ?? profiles.error ?? orders.error ?? memberships.error;
    if (err) throw new Error(err.message);

    const members = new Set((memberships.data ?? []).map((m) => m.user_id));
    const lastOrderByUser = new Map<string, NonNullable<typeof orders.data>[number]>();
    for (const o of orders.data ?? []) {
      if (o.user_id && !lastOrderByUser.has(o.user_id)) lastOrderByUser.set(o.user_id, o);
    }
    const profileIds = new Set((profiles.data ?? []).map((p) => p.id));
    const profileByEmail = new Map(
      (profiles.data ?? [])
        .filter((p) => p.email)
        .map((p) => [p.email!.trim().toLowerCase(), p.id] as const),
    );

    // Ficha de televendas ligada a cada conta (por vínculo salvo ou mesmo e-mail).
    const rowByUser = new Map<string, NonNullable<typeof customers.data>[number]>();
    const unlinked: NonNullable<typeof customers.data> = [];
    for (const c of customers.data ?? []) {
      const linkedId =
        (c.user_id && profileIds.has(c.user_id) ? c.user_id : null) ??
        (c.email ? profileByEmail.get(c.email.trim().toLowerCase()) : undefined) ??
        null;
      if (linkedId && !rowByUser.has(linkedId)) rowByUser.set(linkedId, c);
      else unlinked.push(c);
    }

    const result: UnifiedCustomer[] = [];
    for (const p of profiles.data ?? []) {
      const row = rowByUser.get(p.id);
      const order = lastOrderByUser.get(p.id);
      const addr = (order?.shipping_address ?? {}) as Record<string, string>;
      result.push({
        key: `user:${p.id}`,
        customerId: row?.id ?? null,
        userId: p.id,
        source: "site",
        isMember: members.has(p.id),
        name: pick(row?.name, p.full_name, order?.customer_name, p.email?.split("@")[0]) || "Cliente",
        email: pick(p.email, row?.email),
        phone: pick(row?.phone, order?.customer_phone, p.phone),
        document: pick(row?.document, order?.customer_document),
        zip: pick(row?.zip, addr["zip"]),
        street: pick(row?.street, addr["street"]),
        number: pick(row?.number, addr["number"]),
        complement: pick(row?.complement, addr["complement"]),
        city: pick(row?.city, addr["city"]),
        state: pick(row?.state, addr["state"]),
        notes: row?.notes ?? "",
        createdAt: p.created_at,
      });
    }
    for (const c of unlinked) {
      result.push({
        key: `customer:${c.id}`,
        customerId: c.id,
        userId: null,
        source: "televendas",
        isMember: false,
        name: c.name,
        email: c.email,
        phone: c.phone,
        document: c.document,
        zip: c.zip,
        street: c.street,
        number: c.number,
        complement: c.complement,
        city: c.city,
        state: c.state,
        notes: c.notes,
        createdAt: c.created_at,
      });
    }
    return result.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  });

/** Grava a ficha do cliente; para contas do site, cria/atualiza a ficha vinculada. */
async function upsertCustomerRow(
  db: Awaited<ReturnType<typeof import("@/lib/admin-guard.server").adminClient>>,
  input: { id?: string | undefined; userId?: string | undefined; notes?: string | undefined } & Omit<
    z.infer<typeof customerSchema>,
    "id" | "userId" | "notes"
  >,
) {
  const { id, userId, notes, ...values } = input as typeof input & { notes?: string | undefined };
  if (userId) {
    const { data: profile } = await db
      .from("profiles")
      .select("id, email")
      .eq("id", userId)
      .maybeSingle();
    if (!profile) throw new Error("Conta do site não encontrada.");
    // O e-mail da conta é o de login; a ficha sempre acompanha ele.
    if (profile.email) values.email = profile.email;
  }
  const now = new Date().toISOString();
  let targetId = id;
  if (!targetId && userId) {
    const { data: existing } = await db
      .from("customers")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    targetId = existing?.id;
  }
  if (targetId) {
    const { error } = await db
      .from("customers")
      .update({
        ...values,
        ...(notes !== undefined ? { notes } : {}),
        ...(userId ? { user_id: userId } : {}),
        updated_at: now,
      })
      .eq("id", targetId);
    if (error) throw new Error(error.message);
    return targetId;
  }
  const { data: row, error } = await db
    .from("customers")
    .insert({ ...values, ...(notes !== undefined ? { notes } : {}), user_id: userId ?? null })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return row.id;
}

export const saveCustomer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => customerSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { assertAdmin, adminClient } = await import("@/lib/admin-guard.server");
    await assertAdmin(context.supabase, context.userId);
    const db = await adminClient();
    const id = await upsertCustomerRow(db, data);
    return { id };
  });

export const deleteCustomer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { assertAdmin, adminClient } = await import("@/lib/admin-guard.server");
    await assertAdmin(context.supabase, context.userId);
    const db = await adminClient();
    const { data: row } = await db.from("customers").select("user_id").eq("id", data.id).maybeSingle();
    if (row?.user_id) {
      throw new Error("Este cliente tem conta no site e não pode ser removido por aqui.");
    }
    const { error } = await db.from("customers").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const salesOrderSchema = z.object({
  customerId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  customer: customerSchema.omit({ id: true, userId: true, notes: true }),
  paymentMethod: z.enum(["pix", "boleto", "cartao"]),
  installmentMonths: z.number().int().min(1).max(48).optional(),
  status: z.enum(["pendente", "pago", "em_producao", "enviado", "concluido"]).default("pendente"),
  notes: z.string().trim().max(1000).default(""),
  items: z
    .array(z.object({ slug: z.string().trim().max(120), qty: z.number().int().min(1).max(999) }))
    .min(1)
    .max(60),
});

export const createSalesOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => salesOrderSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { assertAdmin, adminClient } = await import("@/lib/admin-guard.server");
    await assertAdmin(context.supabase, context.userId);
    const db = await adminClient();
    if (data.userId) {
      const { data: account } = await db
        .from("profiles")
        .select("id")
        .eq("id", data.userId)
        .maybeSingle();
      if (!account) throw new Error("Conta do site não encontrada para este cliente.");
    }


    const slugs = data.items.map((i) => i.slug);
    const [{ data: rows, error }, settings] = await Promise.all([
      db
        .from("products")
        .select("id, slug, name, brand, category, price, stock, active, installments")
        .in("slug", slugs),
      db.from("site_settings").select("value").eq("key", "pricing").maybeSingle(),
    ]);
    if (error) throw new Error(error.message);

    const {
      normalizeRules,
      effectivePrice,
      paymentDiscountPercent,
      shippingFor,
      round2,
      quoteFor,
    } = await import("@/lib/pricing");
    const rules = normalizeRules(settings.data?.value ?? null);

    type Plan = { months: number; installment: number; total: number };
    const lines = data.items.map((item) => {
      const product = (rows ?? []).find((r) => r.slug === item.slug);
      if (!product) throw new Error(`Produto não encontrado: ${item.slug}`);
      const base = effectivePrice(
        {
          slug: product.slug,
          brand: product.brand,
          category: product.category,
          price: Number(product.price),
        },
        rules,
      );
      const plans = Array.isArray(product.installments)
        ? (product.installments as unknown as Plan[]).filter((p) => p && p.total > 0)
        : [];
      const unit =
        data.paymentMethod === "cartao"
          ? quoteFor(
              { price: base, installments: plans },
              data.installmentMonths ?? rules.defaultInstallments,
              rules,
            ).total
          : base;
      return {
        product_id: product.id,
        product_slug: product.slug,
        product_name: product.name,
        qty: item.qty,
        unit_price: unit,
        stock: product.stock,
      };
    });

    const subtotal = round2(lines.reduce((s, l) => s + l.qty * l.unit_price, 0));
    const shipping = shippingFor(subtotal, rules);
    const discount = round2((subtotal * paymentDiscountPercent(data.paymentMethod, rules)) / 100);
    const total = round2(subtotal + shipping - discount);

    const address = {
      zip: data.customer.zip,
      street: data.customer.street,
      number: data.customer.number,
      complement: data.customer.complement,
      city: data.customer.city,
      state: data.customer.state,
    };

    const { data: order, error: orderError } = await db
      .from("orders")
      .insert({
        // Pedido de cliente com conta no site aparece em "Meus pedidos" dele.
        user_id: data.userId ?? null,
        customer_name: data.customer.name,
        customer_email: data.customer.email || "televendas@sos3d.com.br",
        customer_phone: data.customer.phone || null,
        customer_document: data.customer.document || null,
        shipping_address: address,
        payment_method: data.paymentMethod,
        notes: [`Televendas`, data.notes].filter(Boolean).join(" - "),
        subtotal,
        shipping,
        discount,
        total,
        status: data.status,
      })
      .select("id, reference, total")
      .single();
    if (orderError) throw new Error(orderError.message);

    const { error: itemsError } = await db.from("order_items").insert(
      lines.map((l) => ({
        order_id: order.id,
        product_id: l.product_id,
        product_slug: l.product_slug,
        product_name: l.product_name,
        qty: l.qty,
        unit_price: l.unit_price,
      })),
    );
    if (itemsError) throw new Error(itemsError.message);

    for (const l of lines) {
      await db
        .from("products")
        .update({ stock: Math.max(0, l.stock - l.qty) })
        .eq("id", l.product_id);
    }

    // Mantém a ficha do cliente atualizada (e cria a ficha vinculada para contas do site).
    if (data.customerId || data.userId) {
      await upsertCustomerRow(db, {
        id: data.customerId,
        userId: data.userId,
        ...data.customer,
      });
    }

    return {
      reference: order.reference,
      total: Number(order.total),
      subtotal,
      shipping,
      discount,
    };
  });

// ============================ Baixa de estoque ============================

const stockWithdrawalSchema = z.object({
  productId: z.string().uuid(),
  kind: z.enum(["consumo", "avaria"]),
  quantity: z.number().int().min(1).max(1_000_000),
  reason: z.string().trim().min(3, "Informe o motivo / destino.").max(500),
});

/** Registra uma baixa de estoque (consumo interno ou avaria) com motivo/destino. */
export const registerStockWithdrawal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => stockWithdrawalSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { assertAdmin, adminClient } = await import("@/lib/admin-guard.server");
    await assertAdmin(context.supabase, context.userId);
    const db = await adminClient();
    const { data: profile } = await db
      .from("profiles")
      .select("full_name, email")
      .eq("id", context.userId)
      .maybeSingle();
    const actorName = profile?.full_name || profile?.email || "Administrador";
    const { data: id, error } = await db.rpc("register_stock_withdrawal", {
      _product_id: data.productId,
      _kind: data.kind,
      _quantity: data.quantity,
      _reason: data.reason,
      _actor: context.userId,
      _actor_name: actorName,
    });
    if (error) throw new Error(error.message);
    return { id };
  });

/** Lista as baixas de estoque mais recentes. */
export const listStockWithdrawals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdmin, adminClient } = await import("@/lib/admin-guard.server");
    await assertAdmin(context.supabase, context.userId);
    const db = await adminClient();
    const { data, error } = await db
      .from("stock_withdrawals")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return data ?? [];
  });
