import type { Metadata } from "next";
import { JetBrains_Mono, Manrope, Rubik_Mono_One } from "next/font/google";
import Link from "next/link";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const heading = Manrope({ subsets: ["latin"], variable: "--font-heading", weight: ["700", "800"] });
const body = Manrope({ subsets: ["latin"], variable: "--font-body" });
const label = Rubik_Mono_One({ subsets: ["latin"], variable: "--font-label", weight: "400" });
const code = JetBrains_Mono({ subsets: ["latin"], variable: "--font-code", weight: ["400", "600", "700"] });

const judul = "Pendekin — pendekkan banyak tautan sekaligus";
const deskripsi = "Pemendek URL gratis: sampai 20 tautan sekali proses, lengkap dengan QR code dan statistik klik.";

export const metadata: Metadata = {
  metadataBase: new URL("https://pendek.raffstw.my.id"),
  title: judul,
  description: deskripsi,
  openGraph: { title: judul, description: deskripsi, url: "/", siteName: "Pendekin", locale: "id_ID", type: "website" },
  twitter: { card: "summary_large_image", title: judul, description: deskripsi },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${heading.variable} ${body.variable} ${code.variable} ${label.variable}`}>
      <body className="flex min-h-dvh flex-col font-sans antialiased">
        <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-5 sm:px-6">
          <Link href="/" className="pita pita-merek pita-1 text-sm">
            pendekin
          </Link>
          <span className="rounded-full border border-border px-2.5 py-1 font-mono text-[11px] text-muted">
            gratis, tanpa akun
          </span>
        </header>
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 sm:px-6">{children}</main>
        <footer className="mx-auto w-full max-w-3xl px-4 py-10 text-sm text-muted sm:px-6">
          Dibuat oleh Rafi Fernandito. Next.js + Supabase.
        </footer>
        <Analytics />
      </body>
    </html>
  );
}

