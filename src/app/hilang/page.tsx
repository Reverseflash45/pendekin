import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Tautan tidak ditemukan — Pendekin", robots: { index: false } };

export default async function Hilang({ searchParams }: { searchParams: Promise<{ kode?: string }> }) {
  const { kode } = await searchParams;
  return (
    <section className="py-20 text-center">
      <p className="font-mono text-sm text-muted">/{kode ?? ""}</p>
      <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight">Tautan ini tidak ada.</h1>
      <p className="mx-auto mt-3 max-w-md text-muted">
        Mungkin salah ketik, sudah kedaluwarsa, atau memang belum pernah dibuat. Periksa lagi tautan yang kamu terima.
      </p>
      <Link href="/" className="mt-8 inline-block rounded-xl bg-fg px-5 py-3 font-semibold text-bg hover:opacity-90">
        Buat tautan pendek
      </Link>
    </section>
  );
}
