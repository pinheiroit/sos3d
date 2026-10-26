/** Identificação do carrinho e da visita no navegador (para carrinhos abandonados). */

const CART_ID_KEY = "sos3d.cart.session";
const VISIT_KEY = "sos3d.visit.v1";

export type VisitInfo = {
  entryPage: string;
  referrer: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
};

export function getCartSessionId(): string {
  try {
    let id = window.localStorage.getItem(CART_ID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      window.localStorage.setItem(CART_ID_KEY, id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

export function resetCartSessionId() {
  try {
    window.localStorage.setItem(CART_ID_KEY, crypto.randomUUID());
  } catch {
    /* ignora */
  }
}

/** Grava a página de entrada e a origem da primeira página desta visita. */
export function captureVisit(): VisitInfo {
  try {
    const saved = window.sessionStorage.getItem(VISIT_KEY);
    if (saved) return JSON.parse(saved) as VisitInfo;
    const url = new URL(window.location.href);
    let referrer = "";
    if (document.referrer) {
      try {
        const ref = new URL(document.referrer);
        if (ref.host !== url.host) referrer = ref.host;
      } catch {
        /* ignora */
      }
    }
    const info: VisitInfo = {
      entryPage: `${url.pathname}${url.search}`.slice(0, 300),
      referrer,
      utmSource: url.searchParams.get("utm_source") ?? "",
      utmMedium: url.searchParams.get("utm_medium") ?? "",
      utmCampaign: url.searchParams.get("utm_campaign") ?? "",
    };
    window.sessionStorage.setItem(VISIT_KEY, JSON.stringify(info));
    return info;
  } catch {
    return { entryPage: "", referrer: "", utmSource: "", utmMedium: "", utmCampaign: "" };
  }
}

export function currentDevice(): "mobile" | "desktop" {
  return window.matchMedia("(max-width: 767px)").matches ? "mobile" : "desktop";
}

/** Rótulo amigável da origem da visita. */
export function originLabel(row: { referrer: string; utm_source: string; utm_medium: string }) {
  const src = (row.utm_source || row.referrer || "").toLowerCase();
  if (!src) return "Direto / sem origem";
  if (src.includes("instagram")) return "Instagram";
  if (src.includes("facebook") || src === "fb") return "Facebook";
  if (src.includes("whatsapp") || src.includes("wa.me")) return "WhatsApp";
  if (src.includes("tiktok")) return "TikTok";
  if (src.includes("youtube")) return "YouTube";
  if (src.includes("google")) return row.utm_medium === "cpc" ? "Google Ads" : "Google";
  if (src.includes("bing")) return "Bing";
  return row.utm_source || row.referrer;
}
