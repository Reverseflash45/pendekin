import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt = "Pendekin — pendekkan banyak tautan sekaligus";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Tiap tautan pendek dicetak di pita label timbul, warnanya bergantian seperti di halaman.
const contoh = [
  ["pendek.raffstw.my.id/promo", "#121212", -1.2],
  ["pendek.raffstw.my.id/daftar", "#d7261e", 0.8],
  ["pendek.raffstw.my.id/k7Qx2", "#1f5fd6", -0.5],
] as const;

// Font disimpan di repo (subset latin, .woff) supaya gambar dibuat tanpa akses jaringan saat build.
const font = (nama: string) => readFile(join(process.cwd(), "src/app/_og", nama));

export default async function Gambar() {
  const [pita, judul, teks, kode] = await Promise.all([
    font("rubik-mono-one-400.woff"),
    font("manrope-800.woff"),
    font("manrope-500.woff"),
    font("jetbrains-mono-700.woff"),
  ]);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 80px",
          background: "#e6eaee",
          color: "#121212",
          fontFamily: "Manrope",
        }}
      >
        <div style={{ display: "flex" }}>
          <span
            style={{
              display: "flex",
              padding: "10px 18px 8px",
              borderRadius: 4,
              background: "#d7261e",
              color: "#fff",
              fontFamily: "Rubik Mono One",
              fontSize: 26,
              letterSpacing: 1.5,
            }}
          >
            PENDEKIN
          </span>
        </div>

        <div style={{ display: "flex", fontSize: 84, fontFamily: "Manrope Judul", lineHeight: 1, letterSpacing: -3 }}>
          Pendekkan banyak tautan sekaligus.
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 16 }}>
          {contoh.map(([url, warna, putar]) => (
            <span
              key={url}
              style={{
                display: "flex",
                padding: "14px 24px 12px",
                borderRadius: 4,
                background: warna,
                color: "#fff",
                fontFamily: "JetBrains Mono",
                fontSize: 32,
                letterSpacing: 1,
                transform: `rotate(${putar}deg)`,
                boxShadow: "0 3px 4px rgba(0,0,0,0.25)",
              }}
            >
              {url}
            </span>
          ))}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Rubik Mono One", data: pita, weight: 400, style: "normal" },
        { name: "Manrope Judul", data: judul, weight: 800, style: "normal" },
        { name: "Manrope", data: teks, weight: 500, style: "normal" },
        { name: "JetBrains Mono", data: kode, weight: 700, style: "normal" },
      ],
    },
  );
}
