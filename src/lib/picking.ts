/** Regras da separação física de pedidos pelos vendedores (puras, usadas no servidor e na tela). */

export type PickingStatus = "aguardando" | "em_separacao" | "separado";

export type PickingOrder = {
  status: string;
  picker_id: string | null;
  picking_status: string;
  picked_item_ids: unknown;
  order_items: { id: string }[];
};

/** Status de pedido que ainda podem ser separados fisicamente. */
export const PICKABLE_ORDER_STATUSES = ["pendente", "pago", "em_producao"] as const;

export const pickingStatusLabels: Record<PickingStatus, string> = {
  aguardando: "Aguardando separação",
  em_separacao: "Em separação",
  separado: "Separado",
};

export function pickedIds(order: Pick<PickingOrder, "picked_item_ids">): string[] {
  return Array.isArray(order.picked_item_ids)
    ? order.picked_item_ids.filter((x): x is string => typeof x === "string")
    : [];
}

/** Itens marcados que ainda existem no pedido (edições do pedido trocam os itens). */
export function pickingProgress(order: Pick<PickingOrder, "picked_item_ids" | "order_items">) {
  const ids = new Set(pickedIds(order));
  const total = order.order_items.length;
  const done = order.order_items.filter((i) => ids.has(i.id)).length;
  return { done, total, complete: total > 0 && done === total };
}

/** Motivo que impede o usuário de pegar o pedido, ou null se pode pegar. */
export function claimBlockReason(
  order: Pick<PickingOrder, "status" | "picker_id" | "picking_status">,
  user: { id: string; isSeller: boolean },
): string | null {
  if (!user.isSeller) return "Só vendedores podem pegar pedidos para separar.";
  if (!(PICKABLE_ORDER_STATUSES as readonly string[]).includes(order.status))
    return "Esse pedido não está mais disponível para separação.";
  if (order.picking_status === "separado") return "Esse pedido já foi separado.";
  if (order.picker_id && order.picker_id !== user.id)
    return "Outro vendedor já pegou esse pedido.";
  return null;
}

/** Só quem pegou o pedido marca itens e conclui. */
export function assertIsPicker(
  order: Pick<PickingOrder, "picker_id" | "picking_status">,
  userId: string,
): string | null {
  if (order.picker_id !== userId) return "Esse pedido está com outro vendedor.";
  if (order.picking_status !== "em_separacao") return "Esse pedido não está em separação.";
  return null;
}

/** Quem pode devolver o pedido para a fila: o próprio vendedor ou um administrador. */
export function canRelease(
  order: Pick<PickingOrder, "picker_id">,
  user: { id: string; isAdmin: boolean },
): boolean {
  if (!order.picker_id) return false;
  return order.picker_id === user.id || user.isAdmin;
}

export function toggleItem(ids: string[], itemId: string, picked: boolean): string[] {
  const set = new Set(ids);
  if (picked) set.add(itemId);
  else set.delete(itemId);
  return Array.from(set);
}
