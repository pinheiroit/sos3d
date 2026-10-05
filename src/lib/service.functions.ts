import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  BUDGET_STATUS,
  CLOSED_ORDER_STATUS,
  ORDER_STATUS,
  REQUEST_STATUS,
  WARRANTY_STATUS,
  osNumber,
  paNumber,
} from "@/lib/service";

const uuid = z.string().uuid();
const optDate = z.string().max(20).nullable().optional();

const equipmentSchema = z.object({
  id: uuid.nullable().optional(),
  brand: z.string().trim().min(1).max(80),
  model: z.string().trim().min(1).max(120),
  serial: z.string().trim().min(2).max(80),
  purchase_date: optDate,
  order_reference: z.string().trim().max(40).default(""),
  invoice_number: z.string().trim().max(60).default(""),
  invoice_date: optDate,
});

async function ctx(userId: string) {
  const s = await import("@/lib/service.server");
  const db = await s.serviceDb();
  return { db, s, staff: await s.isStaff(db, userId) };
}

async function requireStaff(userId: string) {
  const c = await ctx(userId);
  if (!c.staff) throw new Error("Acesso restrito ao atendimento.");
  return c;
}

// ============ CLIENTE ============

export const myService = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { db } = await ctx(context.userId);
    const [equipment, requests, orders, purchases] = await Promise.all([
      db.from("equipment").select("*").eq("owner_id", context.userId).order("created_at", { ascending: false }),
      db
        .from("service_requests")
        .select("id, number, status, problem, failure_type, created_at, updated_at, service_order_id, equipment:equipment_id(brand, model, serial)")
        .eq("user_id", context.userId)
        .order("created_at", { ascending: false }),
      db
        .from("service_orders")
        .select("id, number, status, warranty_status, budget_status, received_at, updated_at, closed_at, closing, equipment:equipment_id(brand, model, serial)")
        .eq("user_id", context.userId)
        .order("received_at", { ascending: false }),
      db
        .from("orders")
        .select("reference, created_at, order_items(product_name, product_slug, product_id)")
        .eq("user_id", context.userId)
        .order("created_at", { ascending: false })
        .limit(30),
    ]);
    if (equipment.error) throw new Error(equipment.error.message);

    // Sugestões de equipamentos comprados na SOS 3D (itens da categoria impressoras).
    const ids = Array.from(
      new Set((purchases.data ?? []).flatMap((o) => (o.order_items ?? []).map((i: { product_id: string | null }) => i.product_id)).filter(Boolean)),
    ) as string[];
    const printers = ids.length
      ? await db.from("products").select("id, name, brand").in("id", ids).eq("category", "impressoras")
      : { data: [] as { id: string; name: string; brand: string }[] };
    const byId = new Map((printers.data ?? []).map((p) => [p.id, p]));
    const suggestions = (purchases.data ?? []).flatMap((o) =>
      (o.order_items ?? [])
        .filter((i: { product_id: string | null }) => i.product_id && byId.has(i.product_id))
        .map((i: { product_id: string }) => ({
          order_reference: o.reference as string,
          purchase_date: String(o.created_at).slice(0, 10),
          brand: byId.get(i.product_id)!.brand,
          model: byId.get(i.product_id)!.name,
        })),
    );

    return {
      equipment: equipment.data ?? [],
      requests: requests.data ?? [],
      orders: orders.data ?? [],
      suggestions,
    };
  });

export const saveMyEquipment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => equipmentSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { db } = await ctx(context.userId);
    const values = {
      brand: data.brand,
      model: data.model,
      serial: data.serial,
      purchase_date: data.purchase_date || null,
      order_reference: data.order_reference,
      invoice_number: data.invoice_number,
      invoice_date: data.invoice_date || null,
      updated_at: new Date().toISOString(),
    };
    if (data.id) {
      const { error } = await db.from("equipment").update(values).eq("id", data.id).eq("owner_id", context.userId);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const existing = await db.from("equipment").select("id, owner_id").ilike("serial", data.serial).maybeSingle();
    if (existing.data) {
      if (existing.data.owner_id === context.userId) return { id: existing.data.id as string };
      throw new Error(
        "Este número de série já está cadastrado para outro proprietário. Peça a transferência ao proprietário atual ou fale com o atendimento.",
      );
    }
    const { data: row, error } = await db
      .from("equipment")
      .insert({ ...values, owner_id: context.userId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    await db.from("equipment_ownership").insert({
      equipment_id: row.id,
      previous_owner_id: null,
      new_owner_id: context.userId,
      requested_by: context.userId,
      notes: "Cadastro inicial pelo cliente",
    });
    return { id: row.id as string };
  });

async function transfer(
  db: Awaited<ReturnType<typeof ctx>>["db"],
  input: { equipmentId: string; email: string; proof: string; notes: string },
  actor: string,
  ownerCheck: string | null,
) {
  const eq = await db.from("equipment").select("id, owner_id, brand, model, serial").eq("id", input.equipmentId).single();
  if (eq.error) throw new Error("Equipamento não encontrado.");
  if (ownerCheck && eq.data.owner_id !== ownerCheck) throw new Error("Você não é o proprietário atual.");
  const target = await db.from("profiles").select("id").ilike("email", input.email.trim()).maybeSingle();
  if (!target.data) throw new Error("Nenhuma conta encontrada com esse e-mail. O novo proprietário precisa criar a conta antes.");
  if (target.data.id === eq.data.owner_id) throw new Error("Esse e-mail já é do proprietário atual.");
  const open = await db
    .from("service_orders")
    .select("id")
    .eq("equipment_id", input.equipmentId)
    .not("status", "in", `(${CLOSED_ORDER_STATUS.join(",")})`);
  if ((open.data ?? []).length) throw new Error("Há uma O.S. em andamento para este equipamento. Conclua-a antes de transferir.");
  const { error } = await db
    .from("equipment")
    .update({ owner_id: target.data.id, updated_at: new Date().toISOString() })
    .eq("id", input.equipmentId);
  if (error) throw new Error(error.message);
  await db.from("equipment_ownership").insert({
    equipment_id: input.equipmentId,
    previous_owner_id: eq.data.owner_id,
    new_owner_id: target.data.id,
    requested_by: actor,
    proof: input.proof,
    notes: input.notes,
  });
  return { ok: true };
}

const transferSchema = z.object({
  equipmentId: uuid,
  email: z.string().trim().email().max(200),
  proof: z.string().trim().max(500).default(""),
  notes: z.string().trim().max(1000).default(""),
});

export const transferMyEquipment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => transferSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { db } = await ctx(context.userId);
    return transfer(db, data, context.userId, context.userId);
  });

export const createServiceRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        equipmentId: uuid,
        failure_type: z.string().max(30),
        problem: z.string().trim().min(10).max(4000),
        started_when: z.string().trim().max(200).default(""),
        frequency: z.string().trim().max(200).default(""),
        error_code: z.string().trim().max(120).default(""),
        steps_tried: z.string().trim().max(3000).default(""),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { db, s } = await ctx(context.userId);
    const eq = await db.from("equipment").select("id").eq("id", data.equipmentId).eq("owner_id", context.userId).maybeSingle();
    if (!eq.data) throw new Error("Selecione um equipamento seu.");
    const { equipmentId, ...rest } = data;
    const { data: row, error } = await db
      .from("service_requests")
      .insert({ ...rest, equipment_id: equipmentId, user_id: context.userId })
      .select("id, number")
      .single();
    if (error) throw new Error(error.message);
    await s.logEvent(db, {
      request_id: row.id,
      kind: "status",
      description: `Pré-atendimento ${paNumber(row.number)} aberto pelo cliente.`,
      new_value: "recebida",
      visible_to_client: true,
      actor_id: context.userId,
    });
    return { id: row.id as string, number: row.number as number };
  });

/** URL assinada para envio de arquivo (cliente ou atendimento). */
export const requestServiceUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        scope: z.enum(["equipment", "request", "order"]),
        id: uuid,
        name: z.string().trim().min(1).max(200),
        mime: z.string().max(120).default(""),
        size: z.number().int().min(0).max(200 * 1024 * 1024),
        category: z.string().max(30).default("outro"),
        stage: z.string().max(30).optional(),
        visible_to_client: z.boolean().default(true),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { db, s, staff } = await ctx(context.userId);
    let ownerId: string | null = null;
    let equipmentId: string | null = null;
    let requestId: string | null = null;
    let orderId: string | null = null;
    let stage = data.stage ?? "pre_atendimento";

    if (data.scope === "equipment") {
      const r = await db.from("equipment").select("id, owner_id").eq("id", data.id).single();
      if (r.error) throw new Error("Equipamento não encontrado.");
      ownerId = r.data.owner_id;
      equipmentId = r.data.id;
      stage = "equipamento";
    } else if (data.scope === "request") {
      const r = await db.from("service_requests").select("id, user_id, equipment_id, status").eq("id", data.id).single();
      if (r.error) throw new Error("Pré-atendimento não encontrado.");
      if (!staff && ["convertida", "cancelado"].includes(r.data.status)) throw new Error("Este pré-atendimento não aceita mais anexos.");
      ownerId = r.data.user_id;
      equipmentId = r.data.equipment_id;
      requestId = r.data.id;
    } else {
      const r = await db.from("service_orders").select("id, user_id, equipment_id, request_id").eq("id", data.id).single();
      if (r.error) throw new Error("O.S. não encontrada.");
      if (!staff) throw new Error("Anexos da O.S. são enviados pelo atendimento.");
      ownerId = r.data.user_id;
      equipmentId = r.data.equipment_id;
      requestId = r.data.request_id;
      orderId = r.data.id;
    }
    if (!staff && ownerId !== context.userId) throw new Error("Sem permissão.");

    await s.ensureBucket(db);
    const safe = data.name.normalize("NFD").replace(/[^\w.-]+/g, "_").slice(-80);
    const path = `${ownerId ?? "sem-dono"}/${equipmentId}/${orderId ? `os-${orderId}` : requestId ? `pa-${requestId}` : "equipamento"}/${Date.now()}-${safe}`;
    const signed = await db.storage.from(s.SERVICE_BUCKET).createSignedUploadUrl(path);
    if (signed.error) throw new Error(signed.error.message);
    const { error } = await db.from("service_files").insert({
      owner_id: ownerId,
      equipment_id: equipmentId,
      request_id: requestId,
      order_id: orderId,
      stage,
      category: data.category,
      path,
      name: data.name,
      mime: data.mime,
      size: data.size,
      visible_to_client: staff ? data.visible_to_client : true,
      locked: Boolean(orderId),
      uploaded_by: context.userId,
    });
    if (error) throw new Error(error.message);
    return { path, token: signed.data.token, bucket: s.SERVICE_BUCKET };
  });

export const deleteServiceFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    const { db, s, staff } = await ctx(context.userId);
    const f = await db.from("service_files").select("*").eq("id", data.id).single();
    if (f.error) throw new Error("Arquivo não encontrado.");
    if (f.data.locked) throw new Error("Evidências registradas após o recebimento não podem ser apagadas.");
    if (!staff && f.data.uploaded_by !== context.userId) throw new Error("Sem permissão.");
    await db.storage.from(s.SERVICE_BUCKET).remove([f.data.path]);
    await db.from("service_files").delete().eq("id", data.id);
    return { ok: true };
  });

/** Detalhe de P.A. ou O.S. — o cliente só vê o que é destinado a ele. */
export const getServiceDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ kind: z.enum(["request", "order"]), id: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    const { db, s, staff } = await ctx(context.userId);
    const table = data.kind === "request" ? "service_requests" : "service_orders";
    const row = await db.from(table).select("*, equipment:equipment_id(*)").eq("id", data.id).single();
    if (row.error) throw new Error("Atendimento não encontrado.");
    if (!staff && row.data.user_id !== context.userId) throw new Error("Sem permissão.");

    const key = data.kind === "request" ? "request_id" : "order_id";
    let events = db.from("service_events").select("*").eq(key, data.id).order("created_at", { ascending: true });
    if (!staff) events = events.eq("visible_to_client", true);
    let files = db.from("service_files").select("*").eq(key, data.id).order("created_at", { ascending: true });
    if (!staff) files = files.eq("visible_to_client", true);

    // A O.S. também mostra o histórico e os anexos do P.A. de origem.
    const reqId = data.kind === "order" ? (row.data.request_id as string | null) : null;
    const [ev, fl, reqEv, reqFl, request] = await Promise.all([
      events,
      files,
      reqId
        ? (staff ? db.from("service_events").select("*").eq("request_id", reqId) : db.from("service_events").select("*").eq("request_id", reqId).eq("visible_to_client", true)).order("created_at")
        : Promise.resolve({ data: [] }),
      reqId ? db.from("service_files").select("*").eq("request_id", reqId).is("order_id", null) : Promise.resolve({ data: [] }),
      reqId ? db.from("service_requests").select("*").eq("id", reqId).maybeSingle() : Promise.resolve({ data: null }),
    ]);

    const owner = await s.customerInfo(db, row.data.user_id);
    const signed = await s.signFiles(db, [...(reqFl.data ?? []), ...(fl.data ?? [])] as { path: string }[]);
    const allEvents = [...(reqEv.data ?? []), ...(ev.data ?? [])].sort((a, b) =>
      String(a.created_at).localeCompare(String(b.created_at)),
    );

    const out = { ...row.data } as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    if (!staff) {
      // anotações internas de bancada não vão para o cliente
      const diag = { ...(row.data.diagnosis ?? {}) } as any; // eslint-disable-line @typescript-eslint/no-explicit-any
      delete diag.internal_notes;
      out.diagnosis = diag;
    }
    return {
      kind: data.kind,
      row: out as Record<string, any>, // eslint-disable-line @typescript-eslint/no-explicit-any
      request: request.data,
      events: allEvents,
      files: signed,
      owner,
      staff,
    };
  });

/** Histórico do equipamento por número de série, respeitando a privacidade entre proprietários. */
export const getEquipmentHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    const { db, s, staff } = await ctx(context.userId);
    const eq = await db.from("equipment").select("*").eq("id", data.id).single();
    if (eq.error) throw new Error("Equipamento não encontrado.");
    if (!staff && eq.data.owner_id !== context.userId) throw new Error("Sem permissão.");
    const [orders, owners, files] = await Promise.all([
      db
        .from("service_orders")
        .select("id, number, status, user_id, received_at, closed_at, reported, closing")
        .eq("equipment_id", data.id)
        .order("received_at", { ascending: false }),
      staff
        ? db.from("equipment_ownership").select("*").eq("equipment_id", data.id).order("transferred_at", { ascending: false })
        : Promise.resolve({ data: [] }),
      db.from("service_files").select("*").eq("equipment_id", data.id).eq("stage", "equipamento"),
    ]);
    const list = (orders.data ?? []).map((o) => {
      const mine = staff || o.user_id === context.userId;
      return {
        id: o.id,
        number: o.number,
        status: o.status,
        received_at: o.received_at,
        closed_at: o.closed_at,
        title: mine ? ((o.reported as { problem?: string })?.problem ?? "").slice(0, 80) : "Atendimento de proprietário anterior",
        mine,
      };
    });
    let ownerList: { id: string; previous: string; next: string; at: string; notes: string; proof: string }[] = [];
    if (staff) {
      const ids = Array.from(new Set((owners.data ?? []).flatMap((o) => [o.previous_owner_id, o.new_owner_id]).filter(Boolean)));
      const profs = ids.length ? await db.from("profiles").select("id, full_name, email").in("id", ids) : { data: [] };
      const name = (id: string | null) => {
        const p = (profs.data ?? []).find((x) => x.id === id);
        return p ? p.full_name || p.email : "—";
      };
      ownerList = (owners.data ?? []).map((o) => ({
        id: o.id,
        previous: name(o.previous_owner_id),
        next: name(o.new_owner_id),
        at: o.transferred_at,
        notes: o.notes,
        proof: o.proof,
      }));
    }
    const ownFiles = staff ? files.data ?? [] : (files.data ?? []).filter((f) => f.owner_id === context.userId);
    return {
      equipment: eq.data,
      orders: list,
      owners: ownerList,
      files: await s.signFiles(db, ownFiles as { path: string }[]),
    };
  });

export const cancelMyRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    const { db, s } = await ctx(context.userId);
    const r = await db.from("service_requests").select("status, user_id").eq("id", data.id).single();
    if (r.error || r.data.user_id !== context.userId) throw new Error("Sem permissão.");
    if (["convertida", "cancelado"].includes(r.data.status)) throw new Error("Não é possível cancelar.");
    await db.from("service_requests").update({ status: "cancelado", updated_at: new Date().toISOString() }).eq("id", data.id);
    await s.logEvent(db, {
      request_id: data.id,
      kind: "status",
      description: "Pré-atendimento cancelado pelo cliente.",
      old_value: r.data.status,
      new_value: "cancelado",
      visible_to_client: true,
      actor_id: context.userId,
    });
    return { ok: true };
  });

/** Cliente aprova/recusa o orçamento pelo site. */
export const respondBudget = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: uuid, approve: z.boolean() }).parse(i))
  .handler(async ({ data, context }) => {
    const { db, s } = await ctx(context.userId);
    const o = await db.from("service_orders").select("user_id, budget_status, budget").eq("id", data.id).single();
    if (o.error || o.data.user_id !== context.userId) throw new Error("Sem permissão.");
    if (!["enviado", "aguardando"].includes(o.data.budget_status)) throw new Error("Não há orçamento aguardando sua resposta.");
    const status = data.approve ? "aprovado" : "recusado";
    const budget = {
      ...(o.data.budget ?? {}),
      authorized_at: new Date().toISOString(),
      authorized_by: await s.actorName(db, context.userId),
      authorization_method: "site",
    };
    await db.from("service_orders").update({ budget_status: status, budget, updated_at: new Date().toISOString() }).eq("id", data.id);
    await s.logEvent(db, {
      order_id: data.id,
      kind: "orcamento",
      field: "budget_status",
      description: `Orçamento ${data.approve ? "aprovado" : "recusado"} pelo cliente no site.`,
      old_value: o.data.budget_status,
      new_value: status,
      visible_to_client: true,
      actor_id: context.userId,
    });
    return { ok: true };
  });

/** Cliente assina eletronicamente o termo de atendimento particular. */
export const signPrivateTerm = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: uuid, signature: z.string().trim().min(3).max(160) }).parse(i))
  .handler(async ({ data, context }) => {
    const { db, s } = await ctx(context.userId);
    const o = await db.from("service_orders").select("user_id, private_term").eq("id", data.id).single();
    if (o.error || o.data.user_id !== context.userId) throw new Error("Sem permissão.");
    const term = o.data.private_term as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    if (!term) throw new Error("Não há termo para assinar.");
    if (term.signed_at) throw new Error("Este termo já foi assinado.");
    const signed = { ...term, signed_at: new Date().toISOString(), signature: data.signature, signature_method: "Aceite eletrônico no Minha SOS-3D" };
    await db.from("service_orders").update({ private_term: signed, updated_at: new Date().toISOString() }).eq("id", data.id);
    await s.logEvent(db, {
      order_id: data.id,
      kind: "garantia",
      description: `Termo de atendimento particular assinado eletronicamente por "${data.signature}".`,
      visible_to_client: true,
      actor_id: context.userId,
    });
    return { ok: true };
  });

// ============ ATENDIMENTO (ADMIN) ============

export const adminServiceBoard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { db } = await requireStaff(context.userId);
    const [requests, orders] = await Promise.all([
      db
        .from("service_requests")
        .select("id, number, status, problem, error_code, created_at, updated_at, user_id, equipment:equipment_id(id, brand, model, serial)")
        .order("created_at", { ascending: false })
        .limit(500),
      db
        .from("service_orders")
        .select("id, number, status, warranty_status, budget_status, received_at, due_at, closed_at, updated_at, user_id, request_id, equipment:equipment_id(id, brand, model, serial)")
        .order("received_at", { ascending: false })
        .limit(500),
    ]);
    const userIds = Array.from(new Set([...(requests.data ?? []), ...(orders.data ?? [])].map((r) => r.user_id).filter(Boolean)));
    const [profiles, docs] = await Promise.all([
      userIds.length ? db.from("profiles").select("id, full_name, email, phone").in("id", userIds) : Promise.resolve({ data: [] }),
      userIds.length
        ? db.from("orders").select("user_id, customer_document, customer_phone").in("user_id", userIds)
        : Promise.resolve({ data: [] }),
    ]);
    const customers: Record<string, { name: string; email: string; phone: string; document: string }> = {};
    for (const p of profiles.data ?? []) {
      customers[p.id] = { name: p.full_name ?? "", email: p.email ?? "", phone: p.phone ?? "", document: "" };
    }
    for (const d of docs.data ?? []) {
      const c = customers[d.user_id];
      if (c) {
        if (!c.document && d.customer_document) c.document = d.customer_document;
        if (!c.phone && d.customer_phone) c.phone = d.customer_phone;
      }
    }
    return { requests: requests.data ?? [], orders: orders.data ?? [], customers };
  });

export const adminUpdateRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        id: uuid,
        status: z.enum(["recebida", "aguardando_documentacao", "em_analise", "liberado_entrega", "cancelado"]),
        message: z.string().trim().max(2000).default(""),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { db, s } = await requireStaff(context.userId);
    const r = await db.from("service_requests").select("status").eq("id", data.id).single();
    if (r.error) throw new Error("P.A. não encontrado.");
    if (r.data.status === "convertida") throw new Error("Este P.A. já virou O.S.");
    await db
      .from("service_requests")
      .update({ status: data.status, staff_message: data.message, updated_at: new Date().toISOString() })
      .eq("id", data.id);
    if (r.data.status !== data.status) {
      await s.logEvent(db, {
        request_id: data.id,
        kind: "status",
        field: "status",
        description: `Status alterado para "${REQUEST_STATUS[data.status]}".${data.message ? ` ${data.message}` : ""}`,
        old_value: r.data.status,
        new_value: data.status,
        visible_to_client: true,
        actor_id: context.userId,
      });
    } else if (data.message) {
      await s.logEvent(db, { request_id: data.id, description: data.message, visible_to_client: true, actor_id: context.userId });
    }
    return { ok: true };
  });

const receptionSchema = z.object({
  accessories: z.string().trim().max(2000).default(""),
  visual_condition: z.string().trim().max(2000).default(""),
  damages: z.string().trim().max(2000).default(""),
  missing_parts: z.string().trim().max(2000).default(""),
  modifications: z.string().trim().max(2000).default(""),
  has_invoice: z.boolean().default(false),
  notes: z.string().trim().max(3000).default(""),
});

/** Confirmar recebimento: converte o P.A. em O.S. sequencial. */
export const adminConfirmReception = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ requestId: uuid, reception: receptionSchema, dueDays: z.number().int().min(1).max(180).default(15) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { db, s } = await requireStaff(context.userId);
    const r = await db.from("service_requests").select("*, equipment:equipment_id(*)").eq("id", data.requestId).single();
    if (r.error) throw new Error("P.A. não encontrado.");
    if (r.data.service_order_id) throw new Error("Este P.A. já foi convertido.");
    const now = new Date();
    const reported = {
      pa_number: r.data.number,
      equipment: `${r.data.equipment.brand} ${r.data.equipment.model}`.trim(),
      model: r.data.equipment.model,
      serial: r.data.equipment.serial,
      failure_type: r.data.failure_type,
      problem: r.data.problem,
      started_when: r.data.started_when,
      frequency: r.data.frequency,
      error_code: r.data.error_code,
      steps_tried: r.data.steps_tried,
      invoice_number: r.data.equipment.invoice_number,
      invoice_date: r.data.equipment.invoice_date,
    };
    const { data: os, error } = await db
      .from("service_orders")
      .insert({
        request_id: r.data.id,
        user_id: r.data.user_id,
        equipment_id: r.data.equipment_id,
        reported,
        reception: { ...data.reception, received_by_name: await s.actorName(db, context.userId) },
        received_at: now.toISOString(),
        due_at: new Date(now.getTime() + data.dueDays * 86400000).toISOString(),
        received_by: context.userId,
        diagnosis: { informed_symptom: r.data.problem, error_code: r.data.error_code },
      })
      .select("id, number")
      .single();
    if (error) throw new Error(error.message);
    await db
      .from("service_requests")
      .update({ status: "convertida", service_order_id: os.id, updated_at: now.toISOString() })
      .eq("id", r.data.id);
    // Evidências do P.A. passam a ser imutáveis para o cliente.
    await db.from("service_files").update({ locked: true }).eq("request_id", r.data.id);
    await s.logEvent(db, {
      request_id: r.data.id,
      order_id: os.id,
      kind: "status",
      description: `Equipamento recebido na SOS 3D. ${osNumber(os.number)} gerada a partir do ${paNumber(r.data.number)}.`,
      new_value: "recebido",
      visible_to_client: true,
      actor_id: context.userId,
    });
    return { id: os.id as string, number: os.number as number };
  });

const orderPatch = z.object({
  id: uuid,
  status: z.string().max(40).optional(),
  warranty_status: z.string().max(40).optional(),
  budget_status: z.string().max(40).optional(),
  section: z.enum(["reception", "diagnosis", "warranty", "budget", "execution", "validation", "closing"]).optional(),
  values: z.record(z.string(), z.unknown()).optional(),
  note: z.string().trim().max(3000).optional(),
  visible_to_client: z.boolean().default(true),
});

const SECTION_LABEL: Record<string, string> = {
  reception: "Recebimento",
  diagnosis: "Diagnóstico técnico",
  warranty: "Garantia",
  budget: "Orçamento",
  execution: "Execução do serviço",
  validation: "Validação técnica final",
  closing: "Encerramento",
};

export const adminUpdateOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => orderPatch.parse(i))
  .handler(async ({ data, context }) => {
    const { db, s } = await requireStaff(context.userId);
    const o = await db.from("service_orders").select("*").eq("id", data.id).single();
    if (o.error) throw new Error("O.S. não encontrada.");
    const cur = o.data;
    if (cur.closed_at && data.section !== "closing") throw new Error("O.S. encerrada — não pode mais ser alterada.");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const update: any = { updated_at: new Date().toISOString() };

    const term = cur.private_term as { signed_at?: string } | null;
    const nextWarranty = data.warranty_status ?? cur.warranty_status;
    if (
      data.status &&
      ["em_manutencao", "em_testes", "pronto_retirada"].includes(data.status) &&
      nextWarranty === "particular" &&
      !term?.signed_at
    ) {
      throw new Error("O termo de atendimento particular precisa ser assinado antes de iniciar o reparo.");
    }

    const changes: { field: string; label: string; old: string; next: string; map: Record<string, string> }[] = [];
    if (data.status && data.status !== cur.status) {
      update.status = data.status;
      changes.push({ field: "status", label: "Status", old: cur.status, next: data.status, map: ORDER_STATUS });
    }
    if (data.warranty_status && data.warranty_status !== cur.warranty_status) {
      update.warranty_status = data.warranty_status;
      changes.push({ field: "warranty_status", label: "Garantia", old: cur.warranty_status, next: data.warranty_status, map: WARRANTY_STATUS });
    }
    if (data.budget_status && data.budget_status !== cur.budget_status) {
      update.budget_status = data.budget_status;
      changes.push({ field: "budget_status", label: "Orçamento", old: cur.budget_status, next: data.budget_status, map: BUDGET_STATUS });
    }
    if (data.section && data.values) {
      const before = (cur[data.section] ?? {}) as Record<string, unknown>;
      const merged = { ...before, ...data.values, updated_by: await s.actorName(db, context.userId), updated_at: new Date().toISOString() };
      update[data.section] = merged;
      const changed = Object.keys(data.values).filter((k) => JSON.stringify(before[k] ?? "") !== JSON.stringify(data.values![k] ?? ""));
      if (changed.length) {
        await s.logEvent(db, {
          order_id: data.id,
          kind: data.section,
          field: changed.join(", "),
          description: `${SECTION_LABEL[data.section]} atualizado (${changed.length} campo${changed.length > 1 ? "s" : ""}).`,
          old_value: JSON.stringify(Object.fromEntries(changed.map((k) => [k, before[k] ?? null]))).slice(0, 4000),
          new_value: JSON.stringify(Object.fromEntries(changed.map((k) => [k, data.values![k] ?? null]))).slice(0, 4000),
          visible_to_client: false,
          actor_id: context.userId,
        });
      }
    }
    if (data.section === "closing" && data.values?.["finalize"]) {
      if (cur.closed_at) throw new Error("O.S. já encerrada.");
      update.closed_at = new Date().toISOString();
      if (!data.status) {
        update.status = "entregue";
        changes.push({ field: "status", label: "Status", old: cur.status, next: "entregue", map: ORDER_STATUS });
      }
    }

    const { error } = await db.from("service_orders").update(update).eq("id", data.id);
    if (error) throw new Error(error.message);

    for (const c of changes) {
      await s.logEvent(db, {
        order_id: data.id,
        kind: "status",
        field: c.field,
        description: `${c.label}: ${c.map[c.old] ?? c.old} → ${c.map[c.next] ?? c.next}`,
        old_value: c.old,
        new_value: c.next,
        visible_to_client: true,
        actor_id: context.userId,
      });
    }
    if (data.note) {
      await s.logEvent(db, {
        order_id: data.id,
        kind: "nota",
        description: data.note,
        visible_to_client: data.visible_to_client,
        actor_id: context.userId,
      });
    }
    return { ok: true };
  });

/** Gera o Termo de Ciência e Autorização para Atendimento Particular. */
export const adminCreatePrivateTerm = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ id: uuid, reason: z.string().trim().min(5).max(2000), signedInPerson: z.boolean().default(false), signature: z.string().trim().max(160).default("") }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { db, s } = await requireStaff(context.userId);
    const o = await db.from("service_orders").select("*, equipment:equipment_id(*)").eq("id", data.id).single();
    if (o.error) throw new Error("O.S. não encontrada.");
    const existing = o.data.private_term as { signed_at?: string } | null;
    if (existing?.signed_at) throw new Error("O termo já foi assinado e é imutável.");
    const customer = await s.customerInfo(db, o.data.user_id);
    const now = new Date().toISOString();
    const term: any = { // eslint-disable-line @typescript-eslint/no-explicit-any
      os_number: o.data.number,
      customer,
      equipment: `${o.data.equipment.brand} ${o.data.equipment.model}`.trim(),
      model: o.data.equipment.model,
      serial: o.data.equipment.serial,
      reason: data.reason,
      created_at: now,
      created_by: await s.actorName(db, context.userId),
    };
    if (data.signedInPerson) {
      if (!data.signature) throw new Error("Informe o nome de quem assinou.");
      term.signed_at = now;
      term.signature = data.signature;
      term.signature_method = "Assinatura presencial registrada pelo atendimento";
    }
    await db
      .from("service_orders")
      .update({ private_term: term, warranty_status: "particular", updated_at: now })
      .eq("id", data.id);
    await s.logEvent(db, {
      order_id: data.id,
      kind: "garantia",
      field: "warranty_status",
      description: data.signedInPerson
        ? "Termo de atendimento particular gerado e assinado presencialmente."
        : "Termo de atendimento particular gerado — aguardando assinatura do cliente no Minha SOS-3D.",
      old_value: o.data.warranty_status,
      new_value: "particular",
      visible_to_client: true,
      actor_id: context.userId,
    });
    return { ok: true };
  });

export const adminTransferEquipment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => transferSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { db } = await requireStaff(context.userId);
    return transfer(db, data, context.userId, null);
  });

/** Lista de equipamentos para o atendimento. */
export const adminListEquipment = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { db } = await requireStaff(context.userId);
    const { data, error } = await db.from("equipment").select("*").order("created_at", { ascending: false }).limit(1000);
    if (error) throw new Error(error.message);
    const ids = Array.from(new Set((data ?? []).map((e) => e.owner_id).filter(Boolean)));
    const profs = ids.length ? await db.from("profiles").select("id, full_name, email").in("id", ids) : { data: [] };
    const map = new Map((profs.data ?? []).map((p) => [p.id, p]));
    return (data ?? []).map((e) => ({
      ...e,
      owner_name: map.get(e.owner_id)?.full_name || map.get(e.owner_id)?.email || "—",
      owner_email: map.get(e.owner_id)?.email || "",
    }));
  });
