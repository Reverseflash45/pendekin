import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt = "Pendekin — pendekkan banyak tautan sekaligus";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const contoh = [
  ["pendek.raffstw.my.id/promo", "128 klik"],
  ["pendek.raffstw.my.id/k7Qx2", "54 klik"],
  ["pendek.raffstw.my.id/daftar", "31 klik"],
];

// Font disimpan di repo (subset latin, .woff) supaya gambar dibuat tanpa akses jaringan saat build.
const font = (nama: string) => readFile(join(process.cwd(), "src/app/_og", nama));

export default async function Gambar() {
  const [judul, teks] = await Promise.all([font("bricolage-800.woff"), font("inter-500.woff")]);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "#f4f2ec",
          color: "#171613",
          fontFamily: "Inter",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 36, fontFamily: "Bricolage" }}>
          <div style={{ display: "flex", width: 56, height: 20, borderRadius: 10, background: "#c2410c" }}>
            <div style={{ width: 26, height: 20, borderRadius: 10, background: "#171613" }} />
          </div>
          pendekin
        </div>

        <div style={{ display: "flex", flexDirection: "column", fontSize: 96, fontFamily: "Bricolage", lineHeight: 1, letterSpacing: -3 }}>
          <span>Pendekkan banyak</span>
          <span style={{ display: "flex" }}>
            tautan&nbsp;<span style={{ color: "#c2410c" }}>sekaligus.</span>
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {contoh.map(([url, klik]) => (
            <div
              key={url}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "14px 22px",
                background: "#ffffff",
                border: "2px solid #e1ddd2",
                borderRadius: 14,
                fontSize: 26,
                width: 760,
              }}
            >
              <span>{url}</span>
              <span style={{ color: "#6b675e" }}>{klik}</span>
            </div>
          ))}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Bricolage", data: judul, weight: 800, style: "normal" },
        { name: "Inter", data: teks, weight: 500, style: "normal" },
      ],
    },
  );
}
