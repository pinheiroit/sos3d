import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  assertIsPicker,
  canRelease,
  claimBlockReason,
  pickedIds,
  pickingProgress,
  toggleItem,
} from "@/lib/picking";

const orderInput = z.object({ orderId: z.string().uuid() });

async function loadContext(supabase: Parameters<typeof import("@/lib/admin-guard.server").getRoles>[0], userId: string) {
  const { getRoles, adminClient } = await import("@/lib/admin-guard.server");
  const roles = await getRoles(supabase, userId);
  if (!roles.isAdmin) throw new Error("Acesso restrito ao painel administrativo.");
  return { roles, db: await adminClient() };
}

async function loadOrder(db: Awaited<ReturnType<typeof loadContext>>["db"], orderId: string) {
  const { data, error } = await db
    .from("orders")
    .select("id, status, picker_id, picking_status, picked_item_ids, order_items(id)")
    .eq("id", orderId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Pedido não encontrado.");
  return data;
}

/** Vendedor pega o pedido para separar; a venda passa a ficar no nome dele. */
export const claimOrderPicking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => orderInput.parse(input))
  .handler(async ({ data, context }) => {
    const { roles, db } = await loadContext(context.supabase, context.userId);
    const order = await loadOrder(db, data.orderId);
    const blocked = claimBlockReason(order, { id: context.userId, isSeller: roles.isSeller });
    if (blocked) throw new Error(blocked);
    if (order.picker_id === context.userId) return { ok: true };

    const { data: profile } = await db
      .from("profiles")
      .select("full_name, email")
      .eq("id", context.userId)
      .maybeSingle();
    const name = profile?.full_name?.trim() || profile?.email || "Vendedor";

    // Atualização condicional: só pega se ninguém pegou antes (evita dois vendedores no mesmo pedido).
    const { data: updated, error } = await db
      .from("orders")
      .update({
        picker_id: context.userId,
        picker_name: name,
        picking_status: "em_separacao",
        picking_started_at: new Date().toISOString(),
        picked_at: null,
        picked_item_ids: [],
      })
      .eq("id", data.orderId)
      .is("picker_id", null)
      .select("id");
    if (error) throw new Error(error.message);
    if (!updated?.length) throw new Error("Outro vendedor acabou de pegar esse pedido.");
    return { ok: true };
  });

/** Marca ou desmarca um item como separado. */
export const togglePickedItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    orderInput.extend({ itemId: z.string().uuid(), picked: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { db } = await loadContext(context.supabase, context.userId);
    const order = await loadOrder(db, data.orderId);
    const blocked = assertIsPicker(order, context.userId);
    if (blocked) throw new Error(blocked);
    if (!order.order_items.some((i) => i.id === data.itemId))
      throw new Error("Item não pertence a esse pedido.");
    const next = toggleItem(pickedIds(order), data.itemId, data.picked);
    const { error } = await db
      .from("orders")
      .update({ picked_item_ids: next })
      .eq("id", data.orderId)
      .eq("picker_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true, picked: next };
  });

/** Conclui a separação quando todos os itens foram marcados. */
export const completeOrderPicking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => orderInput.parse(input))
  .handler(async ({ data, context }) => {
    const { db } = await loadContext(context.supabase, context.userId);
    const order = await loadOrder(db, data.orderId);
    const blocked = assertIsPicker(order, context.userId);
    if (blocked) throw new Error(blocked);
    if (!pickingProgress(order).complete)
      throw new Error("Marque todos os itens como separados antes de concluir.");
    const { error } = await db
      .from("orders")
      .update({ picking_status: "separado", picked_at: new Date().toISOString() })
      .eq("id", data.orderId)
      .eq("picker_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Devolve o pedido para a fila (o próprio vendedor ou um administrador). */
export const releaseOrderPicking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => orderInput.parse(input))
  .handler(async ({ data, context }) => {
    const { roles, db } = await loadContext(context.supabase, context.userId);
    const order = await loadOrder(db, data.orderId);
    if (!canRelease(order, { id: context.userId, isAdmin: roles.isAdmin }))
      throw new Error("Você não pode liberar esse pedido.");
    const { error } = await db
      .from("orders")
      .update({
        picker_id: null,
        picker_name: "",
        picking_status: "aguardando",
        picking_started_at: null,
        picked_at: null,
        picked_item_ids: [],
      })
      .eq("id", data.orderId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Liga/desliga o papel de vendedor. Vendedor sempre tem acesso de administrador. */
export const setMemberSeller = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ userId: z.string().uuid(), isSeller: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { db } = await loadContext(context.supabase, context.userId);
    if (data.isSeller) {
      const { error } = await db.from("user_roles").upsert(
        [
          { user_id: data.userId, role: "seller" },
          { user_id: data.userId, role: "admin" },
        ],
        { onConflict: "user_id,role", ignoreDuplicates: true },
      );
      if (error) throw new Error(error.message);
      return { ok: true };
    }
    const { error } = await db
      .from("user_roles")
      .delete()
      .eq("user_id", data.userId)
      .eq("role", "seller");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Cria a conta de um vendedor com e-mail e senha, já liberada para entrar. */
export const createSeller = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        fullName: z.string().trim().min(2, "Informe o nome").max(120),
        email: z.string().trim().toLowerCase().email("E-mail inválido").max(200),
        phone: z.string().trim().max(30).default(""),
        password: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres").max(72),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { db } = await loadContext(context.supabase, context.userId);
    const { data: created, error } = await db.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName, phone: data.phone },
    });
    if (error || !created.user) {
      const msg = error?.message ?? "";
      if (/already|registered|exists/i.test(msg))
        throw new Error(
          "Já existe uma conta com esse e-mail. Ligue a chave Vendedor no cadastro dela.",
        );
      throw new Error(msg || "Não foi possível criar a conta.");
    }
    const userId = created.user.id;
    await db
      .from("profiles")
      .upsert({ id: userId, email: data.email, full_name: data.fullName, phone: data.phone || null });
    const { error: roleError } = await db.from("user_roles").upsert(
      [
        { user_id: userId, role: "seller" },
        { user_id: userId, role: "admin" },
      ],
      { onConflict: "user_id,role", ignoreDuplicates: true },
    );
    if (roleError) throw new Error(roleError.message);
    return { ok: true, userId };
  });
