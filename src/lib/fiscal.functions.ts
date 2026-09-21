import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type FiscalSettings = {
  serie: number;
  proximoNumero: number;
  naturezaOperacao: string;
  cfopInterno: string;
  cfopInterestadual: string;
  ncmPadrao: string;
  unidadePadrao: string;
  csosn: string;
  codigoMunicipioPadrao: string;
  informacoesAdicionais: string;
};

export const defaultFiscalSettings: FiscalSettings = {
  serie: 1,
  proximoNumero: 1,
  naturezaOperacao: "Venda de mercadoria",
  cfopInterno: "5102",
  cfopInterestadual: "6102",
  ncmPadrao: "84779000",
  unidadePadrao: "UN",
  csosn: "102",
  codigoMunicipioPadrao: "1200401",
  informacoesAdicionais: "",
};

const settingsSchema = z.object({
  serie: z.number().int().min(1).max(999),
  proximoNumero: z.number().int().min(1).max(999999999),
  naturezaOperacao: z.string().trim().min(2).max(60),
  cfopInterno: z.string().trim().regex(/^\d{4}$/),
  cfopInterestadual: z.string().trim().regex(/^\d{4}$/),
  ncmPadrao: z.string().trim().regex(/^\d{8}$/),
  unidadePadrao: z.string().trim().min(1).max(6),
  csosn: z.string().trim().min(3).max(4),
  codigoMunicipioPadrao: z.string().trim().regex(/^\d{7}$/),
  informacoesAdicionais: z.string().trim().max(2000).default(""),
});

const itemSchema = z.object({
  codigo: z.string().trim().min(1).max(60),
  descricao: z.string().trim().min(1).max(120),
  ncm: z.string().trim().regex(/^\d{8}$/),
  cfop: z.string().trim().regex(/^\d{4}$/),
  unidade: z.string().trim().min(1).max(6),
  quantidade: z.number().positive().max(100000),
  valorUnitario: z.number().nonnegative().max(10_000_000),
});

const issueSchema = z.object({
  orderId: z.string().uuid().nullable().default(null),
  numero: z.number().int().min(1).max(999999999),
  serie: z.number().int().min(1).max(999),
  naturezaOperacao: z.string().trim().min(2).max(60),
  destinatario: z.object({
    nome: z.string().trim().min(2).max(120),
    documento: z.string().trim().min(11).max(18),
    ie: z.string().trim().max(20).default(""),
    email: z.string().trim().max(180).default(""),
    endereco: z.object({
      logradouro: z.string().trim().min(2).max(180),
      numero: z.string().trim().min(1).max(20),
      complemento: z.string().trim().max(120).default(""),
      bairro: z.string().trim().min(1).max(120),
      municipio: z.string().trim().min(2).max(120),
      codigoMunicipio: z.string().trim().regex(/^\d{7}$/),
      uf: z.string().trim().length(2),
      cep: z.string().trim().min(8).max(9),
      fone: z.string().trim().max(20).default(""),
    }),
  }),
  itens: z.array(itemSchema).min(1).max(200),
  frete: z.number().nonnegative().default(0),
  desconto: z.number().nonnegative().default(0),
  pagamento: z.object({
    forma: z.enum(["pix", "boleto", "cartao", "dinheiro", "outros"]),
    valor: z.number().nonnegative(),
  }),
  informacoesAdicionais: z.string().trim().max(2000).default(""),
});

type ServiceCall = { path: string; body?: unknown; method?: "GET" | "POST" };

async function callNfeService({ path, body, method = "POST" }: ServiceCall) {
  const baseUrl = process.env["NFE_SERVICE_URL"];
  const token = process.env["NFE_SERVICE_TOKEN"];
  if (!baseUrl || !token) {
    throw new Error(
      "O serviço de NF-e ainda não foi configurado. Salve o endereço e o token do servidor de emissão.",
    );
  }

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { "content-type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const text = await response.text();
  let payload: Record<string, unknown> = {};
  try {
    payload = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    payload = { message: text.slice(0, 500) };
  }

  return { httpStatus: response.status, payload };
}

async function adminContext(context: { supabase: unknown; userId: string }) {
  const { assertAdmin, adminClient } = await import("@/lib/admin-guard.server");
  await assertAdmin(context.supabase as never, context.userId);
  return adminClient();
}

export const getFiscalPanel = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await adminContext(context);

    const [settingsRow, documents, orders] = await Promise.all([
      db.from("site_settings").select("value").eq("key", "fiscal").maybeSingle(),
      db
        .from("nfe_documents")
        .select(
          "id, order_id, environment, status, numero, serie, chave, protocolo, recipient_name, recipient_document, total, xml_url, danfe_url, error_message, cancel_reason, cancelled_at, created_at",
        )
        .order("created_at", { ascending: false })
        .limit(60),
      db
        .from("orders")
        .select(
          "id, reference, customer_name, customer_email, customer_phone, customer_document, shipping_address, payment_method, subtotal, shipping, discount, total, status, created_at, order_items(product_slug, product_name, qty, unit_price)",
        )
        .order("created_at", { ascending: false })
        .limit(40),
    ]);

    const raw = (settingsRow.data?.value ?? {}) as Partial<FiscalSettings>;
    const settings: FiscalSettings = { ...defaultFiscalSettings, ...raw };

    return {
      settings,
      configured: Boolean(process.env["NFE_SERVICE_URL"] && process.env["NFE_SERVICE_TOKEN"]),
      documents: documents.data ?? [],
      orders: orders.data ?? [],
    };
  });

export const saveFiscalSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => settingsSchema.parse(input))
  .handler(async ({ data, context }) => {
    const db = await adminContext(context);
    const { error } = await db
      .from("site_settings")
      .upsert({ key: "fiscal", value: data }, { onConflict: "key" });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const checkNfeService = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await adminContext(context);
    try {
      const { httpStatus, payload } = await callNfeService({ path: "/health", method: "GET" });
      return {
        online: httpStatus === 200 && payload["ok"] === true,
        ambiente: (payload["ambiente"] as string) ?? "",
        message: (payload["message"] as string) ?? "",
      };
    } catch (error) {
      return { online: false, ambiente: "", message: (error as Error).message };
    }
  });

export const issueNfe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => issueSchema.parse(input))
  .handler(async ({ data, context }) => {
    const db = await adminContext(context);

    const total =
      data.itens.reduce((sum, item) => sum + item.quantidade * item.valorUnitario, 0) +
      data.frete -
      data.desconto;

    const { httpStatus, payload } = await callNfeService({ path: "/nfe/emitir", body: data });
    const ok = httpStatus === 200 && payload["ok"] === true;
    const ambiente = String(payload["ambiente"] ?? "homologacao");

    const { data: saved, error } = await db
      .from("nfe_documents")
      .insert({
        order_id: data.orderId,
        environment: ambiente,
        status: ok ? "autorizada" : "rejeitada",
        numero: data.numero,
        serie: data.serie,
        chave: (payload["chave"] as string) ?? null,
        protocolo: (payload["protocolo"] as string) ?? null,
        recipient_name: data.destinatario.nome,
        recipient_document: data.destinatario.documento,
        total: Number(total.toFixed(2)),
        payload: data,
        response: payload,
        xml_url: (payload["xmlUrl"] as string) ?? null,
        danfe_url: (payload["danfeUrl"] as string) ?? null,
        error_message: ok ? null : ((payload["message"] as string) ?? "Falha na emissão."),
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    if (ok) {
      await db
        .from("site_settings")
        .upsert(
          {
            key: "fiscal",
            value: await nextSettings(db, data.numero + 1, data.serie),
          },
          { onConflict: "key" },
        );
    }

    return {
      ok,
      id: saved.id,
      message: (payload["message"] as string) ?? (ok ? "NF-e autorizada." : "Não foi possível emitir a NF-e."),
      chave: (payload["chave"] as string) ?? null,
    };
  });

async function nextSettings(
  db: Awaited<ReturnType<typeof adminContext>>,
  proximoNumero: number,
  serie: number,
) {
  const { data } = await db.from("site_settings").select("value").eq("key", "fiscal").maybeSingle();
  const current = { ...defaultFiscalSettings, ...((data?.value ?? {}) as Partial<FiscalSettings>) };
  return { ...current, proximoNumero, serie };
}

export const cancelNfe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ id: z.string().uuid(), justificativa: z.string().trim().min(15).max(255) })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const db = await adminContext(context);

    const { data: doc, error } = await db
      .from("nfe_documents")
      .select("id, chave, protocolo, status")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!doc) throw new Error("Nota não encontrada.");
    if (doc.status !== "autorizada") throw new Error("Só é possível cancelar uma nota autorizada.");
    if (!doc.chave || !doc.protocolo) throw new Error("Nota sem chave ou protocolo da SEFAZ.");

    const { httpStatus, payload } = await callNfeService({
      path: "/nfe/cancelar",
      body: { chave: doc.chave, protocolo: doc.protocolo, justificativa: data.justificativa },
    });
    const ok = httpStatus === 200 && payload["ok"] === true;

    const { error: updateError } = await db
      .from("nfe_documents")
      .update({
        status: ok ? "cancelada" : "autorizada",
        cancel_reason: ok ? data.justificativa : null,
        cancel_protocol: ok ? ((payload["protocolo"] as string) ?? null) : null,
        cancelled_at: ok ? new Date().toISOString() : null,
        error_message: ok ? null : ((payload["message"] as string) ?? "Falha no cancelamento."),
        response: payload,
      })
      .eq("id", doc.id);
    if (updateError) throw new Error(updateError.message);

    return {
      ok,
      message: (payload["message"] as string) ?? (ok ? "NF-e cancelada." : "Não foi possível cancelar."),
    };
  });
