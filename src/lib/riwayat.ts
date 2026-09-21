/* Riwayat tautan disimpan di peramban pengguna saja — tanpa akun, jadi ini
   satu-satunya cara "mengingat" tautan milik seseorang. Setiap akses dibungkus
   try/catch karena localStorage bisa diblokir (mode privat, cookie dimatikan). */

export type EntriRiwayat = { kode: string; url: string; dibuat: string; kedaluwarsa: string | null };

const KUNCI = "pendekin:riwayat";
const MAKS = 50;

function bacaRiwayat(): EntriRiwayat[] {
  return uraiRiwayat(snapshotRiwayat());
}

export function tambahRiwayat(baru: EntriRiwayat[]) {
  const kodeBaru = new Set(baru.map((e) => e.kode));
  const gabung = [...baru, ...bacaRiwayat().filter((e) => !kodeBaru.has(e.kode))].slice(0, MAKS);
  simpan(gabung);
}

export function hapusRiwayat(kode?: string) {
  const sisa = kode ? bacaRiwayat().filter((e) => e.kode !== kode) : [];
  simpan(sisa);
}

function simpan(isi: EntriRiwayat[]) {
  try {
    localStorage.setItem(KUNCI, JSON.stringify(isi));
  } catch {
    /* penyimpanan tidak tersedia — riwayat hanya hilang, aplikasi tetap jalan */
  }
  window.dispatchEvent(new Event(PERISTIWA));
}

/* Untuk useSyncExternalStore: snapshot berupa string mentah supaya stabil
   dibandingkan antar-render; komponen yang mem-parse-nya. */
const PERISTIWA = "pendekin:riwayat";

export function langganRiwayat(cb: () => void) {
  window.addEventListener(PERISTIWA, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(PERISTIWA, cb);
    window.removeEventListener("storage", cb);
  };
}

export function snapshotRiwayat(): string {
  try {
    return localStorage.getItem(KUNCI) ?? "[]";
  } catch {
    return "[]";
  }
}

export function uraiRiwayat(mentah: string): EntriRiwayat[] {
  try {
    const isi = JSON.parse(mentah);
    return Array.isArray(isi) ? isi : [];
  } catch {
    return [];
  }
}
