import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getRequestHeader } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const checkoutSchema = z.object({
  items: z
    .array(z.object({ slug: z.string().trim().max(120), qty: z.number().int().min(1).max(99) }))
    .min(1)
    .max(50),
  customer: z.object({
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().email().max(180),
    phone: z.string().trim().max(40).optional().default(""),
    document: z.string().trim().max(40).optional().default(""),
  }),
  address: z.object({
    zip: z.string().trim().max(20).optional().default(""),
    street: z.string().trim().max(180).optional().default(""),
    number: z.string().trim().max(20).optional().default(""),
    complement: z.string().trim().max(120).optional().default(""),
    city: z.string().trim().max(120).optional().default(""),
    state: z.string().trim().max(60).optional().default(""),
  }),
  paymentMethod: z.enum(["pix", "boleto", "cartao"]),
  notes: z.string().trim().max(1000).optional().default(""),
});

export const createOrder = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => checkoutSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { resolveOptionalUserId } = await import("@/lib/orders.server");
    const userId = await resolveOptionalUserId(getRequestHeader("authorization"));

    const slugs = data.items.map((i) => i.slug);
    const [{ data: rows, error }, settings] = await Promise.all([
      supabaseAdmin
        .from("products")
        .select("id, slug, name, brand, category, price, stock, active")
        .in("slug", slugs),
      supabaseAdmin.from("site_settings").select("value").eq("key", "pricing").maybeSingle(),
    ]);
    if (error) throw new Error(error.message);

    const { normalizeRules, effectivePrice, paymentDiscountPercent, shippingFor, round2 } =
      await import("@/lib/pricing");
    const rules = normalizeRules(settings.data?.value ?? null);

    const lines = data.items.map((item) => {
      const product = (rows ?? []).find((r) => r.slug === item.slug);
      if (!product || !product.active) throw new Error(`Produto indisponível: ${item.slug}`);
      return {
        product_id: product.id,
        product_slug: product.slug,
        product_name: product.name,
        qty: item.qty,
        unit_price: effectivePrice(
          {
            slug: product.slug,
            brand: product.brand,
            category: product.category,
            price: Number(product.price),
          },
          rules,
        ),
        stock: product.stock,
      };
    });

    const subtotal = round2(lines.reduce((s, l) => s + l.qty * l.unit_price, 0));
    const shipping = shippingFor(subtotal, rules);
    const discount = round2((subtotal * paymentDiscountPercent(data.paymentMethod, rules)) / 100);
    const total = round2(subtotal + shipping - discount);


    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .insert({
        user_id: userId,
        customer_name: data.customer.name,
        customer_email: data.customer.email,
        customer_phone: data.customer.phone || null,
        customer_document: data.customer.document || null,
        shipping_address: data.address,
        payment_method: data.paymentMethod,
        notes: data.notes || null,
        subtotal,
        shipping,
        discount,
        total,
        status: "pendente",
      })
      .select("id, reference, total")
      .single();
    if (orderError) throw new Error(orderError.message);

    const { error: itemsError } = await supabaseAdmin.from("order_items").insert(
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
      await supabaseAdmin
        .from("products")
        .update({ stock: Math.max(0, l.stock - l.qty) })
        .eq("id", l.product_id);
    }

    return { reference: order.reference, total: Number(order.total) };
  });

export const listMyOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("orders")
      .select("id, reference, status, total, created_at, order_items(product_name, qty, unit_price)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });
