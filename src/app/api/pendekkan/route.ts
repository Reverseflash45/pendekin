import type { NextRequest } from "next/server";
import { supabase, type Tautan } from "@/lib/supabase";
import { MAKS_URL, POLA_ALIAS, rapikanUrl } from "@/lib/url";

type Masukan = { url: string; alias?: string };
export type Hasil =
  | { masukan: string; ok: true; kode: string; url: string; kedaluwarsa: string | null }
  | { masukan: string; ok: false; galat: string };

const KEDALUWARSA_HARI = new Set([1, 7, 30]);

export async function POST(req: NextRequest) {
  if (!supabase) return Response.json({ galat: "Server belum dikonfigurasi." }, { status: 503 });

  let body: { items?: Masukan[]; kedaluwarsaHari?: number | null };
  try {
    body = await req.json();
  } catch {
    return Response.json({ galat: "Permintaan tidak bisa dibaca." }, { status: 400 });
  }

  const items = Array.isArray(body.items) ? body.items : [];
  if (items.length === 0) return Response.json({ galat: "Belum ada URL." }, { status: 400 });
  if (items.length > MAKS_URL)
    return Response.json({ galat: `Maksimal ${MAKS_URL} URL sekali proses.` }, { status: 400 });

  const hari = body.kedaluwarsaHari;
  const kedaluwarsa =
    typeof hari === "number" && KEDALUWARSA_HARI.has(hari)
      ? new Date(Date.now() + hari * 86_400_000).toISOString()
      : null;

  const hostSendiri = req.nextUrl.hostname;
  const rapi = items.map((it) => {
    const masukan = String(it?.url ?? "").slice(0, 2100);
    const url = rapikanUrl(masukan);
    const alias = typeof it?.alias === "string" ? it.alias.trim().toLowerCase() : "";
    return { masukan, url, alias };
  });

  const berbahaya = await cekSafeBrowsing(rapi.flatMap((r) => (r.url ? [r.url] : [])));

  const hasil: Hasil[] = await Promise.all(
    rapi.map(async ({ masukan, url, alias }): Promise<Hasil> => {
      if (!url) return { masukan, ok: false, galat: "Bukan URL http/https yang valid" };
      if (new URL(url).hostname === hostSendiri)
        return { masukan, ok: false, galat: "Tidak bisa memendekkan tautan Pendekin sendiri" };
      if (berbahaya.has(url)) return { masukan, ok: false, galat: "Ditandai berbahaya oleh Google Safe Browsing" };
      if (alias && !POLA_ALIAS.test(alias))
        return { masukan, ok: false, galat: "Alias harus 3–32 karakter: huruf, angka, atau tanda hubung" };

      const { data, error } = await supabase!.rpc("buat_tautan", {
        p_url: url,
        p_alias: alias || null,
        p_kedaluwarsa: kedaluwarsa,
      });
      if (error) return { masukan, ok: false, galat: pesanGalat(error.message) };
      const t = data as Tautan;
      return { masukan, ok: true, kode: t.kode, url: t.url_tujuan, kedaluwarsa: t.kedaluwarsa_pada };
    }),
  );

  return Response.json({ hasil });
}

/** Pesan dari fungsi SQL sudah berbahasa Indonesia; selain itu jangan bocorkan detail. */
function pesanGalat(pesan: string): string {
  if (/alias|URL tidak valid|kedaluwarsa|kode unik/i.test(pesan)) return pesan;
  return "Gagal menyimpan, coba lagi";
}

/** Cek ke Google Safe Browsing bila kuncinya dipasang. Bila layanan gagal,
 *  jangan menahan pengguna — kembalikan himpunan kosong. */
async function cekSafeBrowsing(urls: string[]): Promise<Set<string>> {
  const kunci = process.env.GOOGLE_SAFE_BROWSING_KEY;
  if (!kunci || urls.length === 0) return new Set();
  try {
    const res = await fetch(`https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${kunci}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        client: { clientId: "pendekin", clientVersion: "1.0" },
        threatInfo: {
          threatTypes: ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE", "POTENTIALLY_HARMFUL_APPLICATION"],
          platformTypes: ["ANY_PLATFORM"],
          threatEntryTypes: ["URL"],
          threatEntries: urls.map((url) => ({ url })),
        },
      }),
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return new Set();
    const json = (await res.json()) as { matches?: { threat: { url: string } }[] };
    return new Set((json.matches ?? []).map((m) => m.threat.url));
  } catch {
    return new Set();
  }
}
