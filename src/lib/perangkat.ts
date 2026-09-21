/** Tebakan kasar jenis perangkat dari User-Agent. Cukup untuk statistik;
 *  tidak ada yang disimpan selain satu kata ini. */
export function jenisPerangkat(ua: string | null): string {
  if (!ua) return "lainnya";
  const s = ua.toLowerCase();
  if (/bot|crawl|spider|preview|facebookexternalhit|whatsapp|telegram|slack|discord|curl|wget|python|go-http/.test(s)) return "bot";
  if (/ipad|tablet|(android(?!.*mobile))/.test(s)) return "tablet";
  if (/mobi|iphone|android/.test(s)) return "mobile";
  return "desktop";
}

/** Nama host perujuk, tanpa path atau query (yang bisa berisi data pribadi). */
export function hostPerujuk(referer: string | null, hostSendiri: string): string | null {
  if (!referer) return null;
  try {
    const h = new URL(referer).hostname.replace(/^www\./, "");
    return h === hostSendiri ? null : h;
  } catch {
    return null;
  }
}
