export const MAKS_URL = 20;
export const POLA_ALIAS = /^[a-z0-9][a-z0-9-]{2,31}$/;

/** Rapikan masukan jadi URL http(s) yang sah, atau null.
 *  "contoh.com/a" diterima dan dianggap https://contoh.com/a. */
export function rapikanUrl(masukan: string): string | null {
  let s = masukan.trim();
  if (!s) return null;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(s)) s = "https://" + s;

  let u: URL;
  try {
    u = new URL(s);
  } catch {
    return null;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;
  // Harus nama domain sungguhan, bukan "localhost" atau kata tunggal.
  if (!u.hostname.includes(".") || u.hostname.endsWith(".")) return null;
  if (u.href.length > 2048) return null;
  return u.href;
}

/** Ambil daftar URL dari teks bebas: satu per baris, atau isi berkas CSV. */
export function pisahkanBaris(teks: string): string[] {
  return teks
    .split(/[\r\n]+/)
    .flatMap((baris) => baris.split(/[,;\t]/))
    .map((s) => s.trim().replace(/^"|"$/g, ""))
    .filter(Boolean);
}
