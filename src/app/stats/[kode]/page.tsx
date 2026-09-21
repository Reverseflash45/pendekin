import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GrafikHarian } from "@/components/GrafikHarian";
import { TombolSalin } from "@/components/TombolSalin";
import { supabase, type Statistik, type Tautan } from "@/lib/supabase";
import { POLA_ALIAS } from "@/lib/url";

type Props = { params: Promise<{ kode: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { kode } = await params;
  return { title: `Statistik /${kode} — Pendekin`, robots: { index: false } };
}

const fmtTanggal = new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Jakarta" });
const namaNegara = new Intl.DisplayNames(["id"], { type: "region" });
const LABEL_PERANGKAT: Record<string, string> = { desktop: "Desktop", mobile: "Ponsel", tablet: "Tablet", lainnya: "Lainnya" };

export default async function HalamanStatistik({ params }: Props) {
  const kode = (await params).kode.toLowerCase();
  if (!supabase || !POLA_ALIAS.test(kode)) notFound();

  const [{ data: tautan }, { data: statistik }] = await Promise.all([
    supabase.from("tautan").select("*").eq("kode", kode).maybeSingle<Tautan>(),
    supabase.rpc("statistik_tautan", { p_kode: kode, p_hari: 30 }),
  ]);
  if (!tautan) notFound();

  const s = statistik as Statistik;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? "https";
  const pendek = `${proto}://${host}/${tautan.kode}`;
  const klik30 = s.harian.reduce((n, d) => n + d.klik, 0);
  const lewat = tautan.kedaluwarsa_pada !== null && new Date(tautan.kedaluwarsa_pada) < new Date();

  return (
    <div className="pt-6">
      <Link href="/" className="text-sm text-muted hover:text-fg">
        ← Buat tautan baru
      </Link>

      <header className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-mono text-2xl font-semibold break-all sm:text-3xl">
            {host}/<span className="text-accent">{tautan.kode}</span>
          </h1>
          <p className="mt-1 truncate text-sm text-muted">
            → <a href={tautan.url_tujuan} className="hover:underline" rel="noreferrer nofollow">{tautan.url_tujuan}</a>
          </p>
        </div>
        <TombolSalin teks={pendek} label="Salin tautan" className="self-start sm:self-auto" />
      </header>

      <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-4">
        <Angka label="Total klik" nilai={tautan.jumlah_klik.toLocaleString("id-ID")} besar />
        <Angka label="30 hari terakhir" nilai={klik30.toLocaleString("id-ID")} />
        <Angka label="Dibuat" nilai={fmtTanggal.format(new Date(tautan.dibuat_pada))} kecil />
        <Angka
          label="Kedaluwarsa"
          nilai={tautan.kedaluwarsa_pada ? fmtTanggal.format(new Date(tautan.kedaluwarsa_pada)) : "Tidak pernah"}
          kecil
          catatan={lewat ? "sudah lewat" : undefined}
        />
      </dl>

      <section className="mt-6 rounded-2xl border border-border bg-surface p-4 sm:p-6">
        <h2 className="font-display font-extrabold">Klik per hari</h2>
        <p className="text-sm text-muted">30 hari terakhir · zona waktu UTC</p>
        <div className="mt-4">
          {klik30 === 0 ? (
            <p className="grid h-40 place-items-center rounded-xl bg-sunken text-sm text-muted">
              Belum ada klik. Bagikan tautannya dan kembali lagi nanti.
            </p>
          ) : (
            <GrafikHarian data={s.harian} />
          )}
        </div>
      </section>

      <div className="mt-6 grid gap-6 sm:grid-cols-3">
        <Peringkat judul="Negara" data={s.negara} label={(n) => (n === "??" ? "Tidak diketahui" : (namaNegara.of(n) ?? n))} />
        <Peringkat judul="Sumber" data={s.perujuk} label={(n) => (n === "langsung" ? "Langsung / aplikasi" : n)} />
        <Peringkat judul="Perangkat" data={s.perangkat} label={(n) => LABEL_PERANGKAT[n] ?? n} />
      </div>

      <p className="mt-6 text-sm text-muted">
        Halaman ini publik bagi siapa pun yang tahu kodenya. Tidak ada alamat IP yang disimpan — hanya negara, nama situs
        perujuk, dan jenis perangkat.
      </p>
    </div>
  );
}

function Angka({ label, nilai, besar, kecil, catatan }: { label: string; nilai: string; besar?: boolean; kecil?: boolean; catatan?: string }) {
  return (
    <div className="bg-surface p-4">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className={`mt-1 font-display font-extrabold ${besar ? "text-3xl" : kecil ? "text-sm leading-snug" : "text-2xl"}`}>
        {nilai}
        {catatan && <span className="ml-1 font-sans text-xs font-normal text-bad">({catatan})</span>}
      </dd>
    </div>
  );
}

function Peringkat({ judul, data, label }: { judul: string; data: { nama: string; klik: number }[]; label: (n: string) => string }) {
  const total = data.reduce((n, d) => n + d.klik, 0);
  const maks = Math.max(1, ...data.map((d) => d.klik));
  return (
    <section className="rounded-2xl border border-border bg-surface p-4">
      <h2 className="font-display font-extrabold">{judul}</h2>
      {data.length === 0 ? (
        <p className="mt-3 text-sm text-muted">Belum ada data.</p>
      ) : (
        <ol className="mt-3 space-y-2.5">
          {data.map((d) => (
            <li key={d.nama} title={`${label(d.nama)}: ${d.klik} klik (${Math.round((d.klik / total) * 100)}%)`}>
              <div className="flex justify-between gap-2 text-sm">
                <span className="truncate">{label(d.nama)}</span>
                <span className="font-mono text-muted">{d.klik.toLocaleString("id-ID")}</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-sunken">
                <div className="h-full rounded-full bg-chart" style={{ width: `${(d.klik / maks) * 100}%` }} />
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
