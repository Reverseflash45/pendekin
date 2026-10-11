/**
 * Pembatas laju sederhana per alamat IP, disimpan di memori instans fungsi.
 *
 * Tujuannya menahan skrip yang membuat ribuan tautan sekaligus (biasanya untuk
 * spam/phishing), yang bisa membuat seluruh domain masuk daftar hitam. Setiap
 * instans serverless punya hitungannya sendiri, jadi ini penghalang, bukan
 * jaminan; batas yang benar-benar ketat perlu disimpan di basis data.
 */

const JENDELA_MS = 60 * 60_000;
const MAKS_URL_PER_JAM = 100;
const MAKS_ENTRI = 5_000;

const catatan = new Map<string, number[]>();

/** IP pengirim dari header Vercel; "?" bila tidak ada (pengembangan lokal). */
export function ipDari(headers: Headers): string {
  return headers.get("x-real-ip") ?? headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "?";
}

/**
 * Catat `jumlah` URL baru untuk `kunci`. Mengembalikan detik tunggu bila batas
 * terlampaui (tanpa mencatat), atau 0 bila boleh lanjut.
 */
export function ambilJatah(kunci: string, jumlah: number, sekarang = Date.now()): number {
  const batas = sekarang - JENDELA_MS;
  const daftar = (catatan.get(kunci) ?? []).filter((w) => w > batas);
  if (daftar.length + jumlah > MAKS_URL_PER_JAM) {
    catatan.set(kunci, daftar);
    const tertua = daftar[0] ?? sekarang;
    return Math.max(1, Math.ceil((tertua + JENDELA_MS - sekarang) / 1000));
  }
  for (let i = 0; i < jumlah; i++) daftar.push(sekarang);
  catatan.set(kunci, daftar);
  // Jangan biarkan peta tumbuh tanpa batas di instans yang hidup lama.
  if (catatan.size > MAKS_ENTRI) {
    for (const [k, v] of catatan) if (!v.some((w) => w > batas)) catatan.delete(k);
  }
  return 0;
}

export const BATAS = { MAKS_URL_PER_JAM, JENDELA_MS };
