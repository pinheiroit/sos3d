import { describe, expect, it } from "vitest";
import { canRelease, claimBlockReason, pickingProgress, toggleItem, assertIsPicker } from "./picking";

const seller = { id: "s1", isSeller: true };
const free = { status: "pago", picker_id: null, picking_status: "aguardando" };

describe("separação de pedidos", () => {
  it("só vendedor pode pegar um pedido", () => {
    expect(claimBlockReason(free, { id: "a1", isSeller: false })).not.toBeNull();
    expect(claimBlockReason(free, seller)).toBeNull();
  });

  it("pedido pego por outro vendedor fica com ele", () => {
    const taken = { ...free, picker_id: "s2", picking_status: "em_separacao" };
    expect(claimBlockReason(taken, seller)).toBe("Outro vendedor já pegou esse pedido.");
  });

  it("pedido cancelado ou enviado não pode ser pego", () => {
    expect(claimBlockReason({ ...free, status: "cancelado" }, seller)).not.toBeNull();
    expect(claimBlockReason({ ...free, status: "enviado" }, seller)).not.toBeNull();
  });

  it("só conclui quando todos os itens foram marcados", () => {
    const order = { picked_item_ids: ["i1"], order_items: [{ id: "i1" }, { id: "i2" }] };
    expect(pickingProgress(order).complete).toBe(false);
    const all = { ...order, picked_item_ids: toggleItem(["i1"], "i2", true) };
    expect(pickingProgress(all)).toEqual({ done: 2, total: 2, complete: true });
  });

  it("itens marcados que saíram do pedido não contam", () => {
    const order = { picked_item_ids: ["velho"], order_items: [{ id: "novo" }] };
    expect(pickingProgress(order).done).toBe(0);
  });

  it("só quem pegou marca os itens", () => {
    const order = { picker_id: "s2", picking_status: "em_separacao" };
    expect(assertIsPicker(order, "s1")).not.toBeNull();
    expect(assertIsPicker(order, "s2")).toBeNull();
  });

  it("o próprio vendedor ou um administrador devolve o pedido para a fila", () => {
    const order = { picker_id: "s2" };
    expect(canRelease(order, { id: "s1", isAdmin: false })).toBe(false);
    expect(canRelease(order, { id: "s2", isAdmin: false })).toBe(true);
    expect(canRelease(order, { id: "a1", isAdmin: true })).toBe(true);
  });
});
