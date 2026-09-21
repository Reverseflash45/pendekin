"use client";

import Link from "next/link";
import { useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { Hasil } from "@/app/api/pendekkan/route";
import { DialogQr } from "@/components/DialogQr";
import { TombolSalin } from "@/components/TombolSalin";
import { hapusRiwayat, langganRiwayat, snapshotRiwayat, tambahRiwayat, uraiRiwayat } from "@/lib/riwayat";
import { MAKS_URL, pisahkanBaris, POLA_ALIAS, rapikanUrl } from "@/lib/url";

type Mode = "banyak" | "satu";
const PILIHAN_KEDALUWARSA = [
  { nilai: null, label: "Tidak pernah" },
  { nilai: 1, label: "1 hari" },
  { nilai: 7, label: "7 hari" },
  { nilai: 30, label: "30 hari" },
] as const;

const tanpaLangganan = () => () => {};
const useOrigin = () => useSyncExternalStore(tanpaLangganan, () => location.origin, () => "");

export function Pemendek() {
  const origin = useOrigin();
  const host = origin.replace(/^https?:\/\//, "");

  const [mode, setMode] = useState<Mode>("banyak");
  const [teks, setTeks] = useState("");
  const [urlSatu, setUrlSatu] = useState("");
  const [alias, setAlias] = useState("");
  const [hari, setHari] = useState<number | null>(null);
  const [memproses, setMemproses] = useState(false);
  const [hasil, setHasil] = useState<Hasil[] | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const berkasRef = useRef<HTMLInputElement>(null);

  const riwayatMentah = useSyncExternalStore(langganRiwayat, snapshotRiwayat, () => "[]");
  const riwayat = useMemo(() => uraiRiwayat(riwayatMentah), [riwayatMentah]);

  // Baris unik dari textarea. Duplikat dibuang di sini supaya satu URL yang
  // tak sengaja ditempel dua kali tidak menghasilkan dua kode.
  const baris = useMemo(() => {
    const semua = pisahkanBaris(teks);
    const unik = [...new Set(semua)];
    return { unik, duplikat: semua.length - unik.length };
  }, [teks]);

  const aliasRapi = alias.trim().toLowerCase();
  const aliasSalah = aliasRapi !== "" && !POLA_ALIAS.test(aliasRapi);
  const jumlah = mode === "banyak" ? baris.unik.length : urlSatu.trim() ? 1 : 0;
  const kelebihan = mode === "banyak" && jumlah > MAKS_URL;
  const bisaKirim = jumlah > 0 && !kelebihan && !aliasSalah && !memproses;

  const pendek = (kode: string) => `${origin}/${kode}`;

  async function kirim(e: React.FormEvent) {
    e.preventDefault();
    if (!bisaKirim) return;
    setMemproses(true);
    setGalat(null);

    const items =
      mode === "banyak" ? baris.unik.map((url) => ({ url })) : [{ url: urlSatu, alias: aliasRapi || undefined }];

    try {
      const res = await fetch("/api/pendekkan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ items, kedaluwarsaHari: hari }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.galat ?? "Terjadi kesalahan");

      const h = json.hasil as Hasil[];
      setHasil(h);
      tambahRiwayat(
        h.flatMap((x) =>
          x.ok ? [{ kode: x.kode, url: x.url, dibuat: new Date().toISOString(), kedaluwarsa: x.kedaluwarsa }] : [],
        ),
      );
      // Kosongkan hanya yang berhasil; yang gagal dibiarkan untuk diperbaiki.
      if (mode === "banyak") setTeks(h.filter((x) => !x.ok).map((x) => x.masukan).join("\n"));
      else if (h[0]?.ok) {
        setUrlSatu("");
        setAlias("");
      }
    } catch (err) {
      setGalat(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setMemproses(false);
    }
  }

  async function imporBerkas(e: React.ChangeEvent<HTMLInputElement>) {
    const berkas = e.target.files?.[0];
    e.target.value = "";
    if (!berkas) return;
    // Hanya sel yang berbentuk URL yang diambil, jadi header dan kolom lain di CSV terlewati.
    const urls = pisahkanBaris(await berkas.text()).filter((s) => rapikanUrl(s) && /[./]/.test(s));
    if (urls.length === 0) {
      setGalat(`Tidak ada URL yang ditemukan di ${berkas.name}.`);
      return;
    }
    setMode("banyak");
    setTeks((t) => [t.trim(), ...urls].filter(Boolean).join("\n"));
  }

  const berhasil = hasil?.filter((h) => h.ok) ?? [];
  const gagal = hasil?.filter((h) => !h.ok) ?? [];

  function unduhCsv() {
    const sel = (s: string) => `"${s.replaceAll('"', '""')}"`;
    const isi = [
      "url_asli,url_pendek,statistik,kedaluwarsa",
      ...berhasil.map((h) =>
        h.ok ? [h.url, pendek(h.kode), `${origin}/stats/${h.kode}`, h.kedaluwarsa ?? ""].map(sel).join(",") : "",
      ),
    ].join("\n");
    const a = Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(new Blob(["﻿" + isi], { type: "text/csv;charset=utf-8" })),
      download: `pendekin-${new Date().toISOString().slice(0, 10)}.csv`,
    });
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <>
      <form onSubmit={kirim} className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-6">
        <div role="tablist" className="inline-flex rounded-xl bg-sunken p-1 text-sm font-medium">
          {(["banyak", "satu"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              className="rounded-lg px-3.5 py-1.5 text-muted transition aria-selected:bg-surface aria-selected:text-fg aria-selected:shadow-sm"
            >
              {m === "banyak" ? "Banyak sekaligus" : "Satu + alias"}
            </button>
          ))}
        </div>

        {mode === "banyak" ? (
          <div className="mt-4">
            <div className="flex items-baseline justify-between gap-3">
              <label htmlFor="daftar" className="text-sm font-semibold">
                Tempel URL, satu per baris
              </label>
              <span className={`font-mono text-xs ${kelebihan ? "font-semibold text-bad" : "text-muted"}`}>
                {jumlah}/{MAKS_URL}
                {baris.duplikat > 0 && ` · ${baris.duplikat} duplikat diabaikan`}
              </span>
            </div>
            <textarea
              id="daftar"
              value={teks}
              onChange={(e) => setTeks(e.target.value)}
              rows={7}
              spellCheck={false}
              placeholder={"https://contoh.com/artikel-yang-panjang-sekali\ntokopedia.com/toko/produk?ref=abc\nhttps://docs.google.com/forms/d/…"}
              className="mt-2 w-full resize-y rounded-xl border border-border bg-sunken px-3.5 py-3 font-mono text-[13px] leading-6 outline-none placeholder:text-muted/60 focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
              <button type="button" onClick={() => berkasRef.current?.click()} className="font-medium text-fg underline decoration-border underline-offset-4 hover:decoration-fg">
                Impor dari CSV
              </button>
              <input ref={berkasRef} type="file" accept=".csv,.txt,text/csv,text/plain" onChange={imporBerkas} hidden />
              <span>URL tanpa https:// tetap diterima.</span>
            </div>
          </div>
        ) : (
          <div className="mt-4 grid gap-4">
            <div>
              <label htmlFor="url-satu" className="text-sm font-semibold">
                URL tujuan
              </label>
              <input
                id="url-satu"
                value={urlSatu}
                onChange={(e) => setUrlSatu(e.target.value)}
                placeholder="https://contoh.com/halaman-panjang"
                spellCheck={false}
                className="mt-2 w-full rounded-xl border border-border bg-sunken px-3.5 py-2.5 font-mono text-[13px] outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
            </div>
            <div>
              <label htmlFor="alias" className="text-sm font-semibold">
                Alias <span className="font-normal text-muted">(opsional)</span>
              </label>
              <div
                className={`mt-2 flex items-center rounded-xl border bg-sunken font-mono text-[13px] focus-within:ring-2 ${
                  aliasSalah ? "border-bad focus-within:ring-bad/20" : "border-border focus-within:border-accent focus-within:ring-accent/20"
                }`}
              >
                <span className="shrink-0 truncate py-2.5 pl-3.5 text-muted">{host || "pendekin"}/</span>
                <input
                  id="alias"
                  value={alias}
                  onChange={(e) => setAlias(e.target.value)}
                  placeholder="promo-agustus"
                  spellCheck={false}
                  maxLength={32}
                  className="min-w-0 flex-1 bg-transparent py-2.5 pr-3.5 outline-none"
                />
              </div>
              {aliasSalah && (
                <p className="mt-1.5 text-sm text-bad">3–32 karakter: huruf, angka, atau tanda hubung (tidak diawali -).</p>
              )}
            </div>
          </div>
        )}

        <div className="mt-5 flex flex-col gap-4 border-t border-border pt-5 sm:flex-row sm:items-end sm:justify-between">
          <fieldset>
            <legend className="text-sm font-semibold">Kedaluwarsa</legend>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {PILIHAN_KEDALUWARSA.map((p) => (
                <label
                  key={p.label}
                  className="cursor-pointer rounded-lg border border-border px-3 py-1.5 text-sm transition has-checked:border-fg has-checked:bg-fg has-checked:text-bg hover:border-fg/40"
                >
                  <input type="radio" name="kedaluwarsa" className="sr-only" checked={hari === p.nilai} onChange={() => setHari(p.nilai)} />
                  {p.label}
                </label>
              ))}
            </div>
          </fieldset>
          <button
            type="submit"
            disabled={!bisaKirim}
            className="rounded-xl bg-accent px-5 py-3 font-semibold text-accent-fg transition hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {memproses ? "Memproses…" : jumlah > 1 ? `Pendekkan ${jumlah} tautan` : "Pendekkan"}
          </button>
        </div>

        {galat && <p className="mt-4 rounded-lg bg-bad/10 px-3 py-2 text-sm text-bad">{galat}</p>}
      </form>

      {hasil && (
        <section aria-labelledby="judul-hasil" className="muncul mt-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="judul-hasil" className="flex items-center gap-2 font-display text-xl font-extrabold">
              Hasil
              <span className="rounded-md bg-ok/10 px-2 py-0.5 font-mono text-xs font-semibold text-ok">{berhasil.length} berhasil</span>
              {gagal.length > 0 && (
                <span className="rounded-md bg-bad/10 px-2 py-0.5 font-mono text-xs font-semibold text-bad">{gagal.length} gagal</span>
              )}
            </h2>
            {berhasil.length > 1 && (
              <div className="flex gap-2">
                <TombolSalin
                  label="Salin semua"
                  teks={berhasil.map((h) => (h.ok ? pendek(h.kode) : "")).join("\n")}
                />
                <button type="button" onClick={unduhCsv} className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium transition hover:border-fg/40 hover:bg-sunken">
                  Unduh CSV
                </button>
              </div>
            )}
          </div>

          <ul className="mt-3 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
            {hasil.map((h, i) =>
              h.ok ? (
                <li key={h.kode} className="muncul flex flex-col gap-3 p-4 sm:flex-row sm:items-center" style={{ animationDelay: `${i * 30}ms` }}>
                  <div className="min-w-0 flex-1">
                    <a href={pendek(h.kode)} target="_blank" rel="noreferrer" className="font-mono text-[15px] font-semibold text-accent hover:underline">
                      {host}/{h.kode}
                    </a>
                    <p className="truncate text-sm text-muted" title={h.url}>
                      {h.url}
                    </p>
                  </div>
                  <Aksi kode={h.kode} url={pendek(h.kode)} onQr={setQr} />
                </li>
              ) : (
                <li key={`galat-${i}`} className="flex items-start gap-3 bg-bad/[0.04] p-4">
                  <span aria-hidden className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-bad/15 text-xs font-bold text-bad">!</span>
                  <div className="min-w-0">
                    <p className="truncate font-mono text-sm">{h.masukan || "(kosong)"}</p>
                    <p className="text-sm text-bad">{h.galat}</p>
                  </div>
                </li>
              ),
            )}
          </ul>
          {gagal.length > 0 && mode === "banyak" && (
            <p className="mt-2 text-sm text-muted">URL yang gagal dikembalikan ke kotak di atas supaya bisa diperbaiki.</p>
          )}
        </section>
      )}

      {riwayat.length > 0 && (
        <section aria-labelledby="judul-riwayat" className="mt-12">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="judul-riwayat" className="font-display text-xl font-extrabold">
              Riwayat di perangkat ini
            </h2>
            <button
              type="button"
              onClick={() => confirm("Hapus semua riwayat dari perangkat ini? Tautannya sendiri tetap aktif.") && hapusRiwayat()}
              className="text-sm text-muted hover:text-bad"
            >
              Bersihkan
            </button>
          </div>
          <p className="mt-1 text-sm text-muted">Tersimpan di peramban ini saja — tanpa akun, tanpa sinkronisasi.</p>
          <ul className="mt-3 divide-y divide-border rounded-2xl border border-border bg-surface">
            {riwayat.map((r) => {
              const lewat = r.kedaluwarsa !== null && new Date(r.kedaluwarsa) < new Date();
              return (
                <li key={r.kode} className={`flex flex-col gap-3 p-4 sm:flex-row sm:items-center ${lewat ? "opacity-50" : ""}`}>
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-sm font-semibold">
                      {host}/{r.kode}
                      {lewat && <span className="ml-2 font-sans text-xs font-normal text-muted">kedaluwarsa</span>}
                    </p>
                    <p className="truncate text-sm text-muted" title={r.url}>
                      {r.url}
                    </p>
                  </div>
                  <Aksi kode={r.kode} url={pendek(r.kode)} onQr={setQr} />
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <DialogQr url={qr} onTutup={() => setQr(null)} />
    </>
  );
}

function Aksi({ kode, url, onQr }: { kode: string; url: string; onQr: (url: string) => void }) {
  const tombol = "rounded-lg border border-border px-3 py-1.5 text-sm font-medium transition hover:border-fg/40 hover:bg-sunken";
  return (
    <div className="flex shrink-0 gap-2">
      <TombolSalin teks={url} />
      <button type="button" onClick={() => onQr(url)} className={tombol}>
        QR
      </button>
      <Link href={`/stats/${kode}`} className={tombol}>
        Statistik
      </Link>
    </div>
  );
}
