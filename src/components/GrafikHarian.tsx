"use client";

import { useState } from "react";

type Titik = { tanggal: string; klik: number };

const TINGGI = 180;
const KIRI = 28; // ruang label sumbu-y
const BAWAH = 22; // ruang label sumbu-x
const fmtPendek = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", timeZone: "UTC" });
const fmtPanjang = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

/** Batas atas sumbu yang "bulat" (1, 2, 5, 10, 20, 50, …) supaya garis bantu mudah dibaca. */
function batasAtas(maks: number) {
  if (maks <= 4) return 4;
  const p = 10 ** Math.floor(Math.log10(maks));
  return [1, 2, 5, 10].map((k) => k * p).find((v) => v >= maks)!;
}

export function GrafikHarian({ data }: { data: Titik[] }) {
  const [aktif, setAktif] = useState<number | null>(null);
  const atas = batasAtas(Math.max(0, ...data.map((d) => d.klik)));
  const lebar = 600;
  const plotL = lebar - KIRI;
  const plotT = TINGGI - BAWAH;
  const kolom = plotL / data.length;
  const batang = Math.max(2, kolom - 2); // celah 2px antar batang
  const y = (v: number) => plotT - (v / atas) * plotT;
  const garis = [0, atas / 2, atas];
  const labelX = [0, Math.floor(data.length / 2), data.length - 1];

  const titikAktif = aktif !== null ? data[aktif] : null;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${lebar} ${TINGGI}`}
        className="h-auto w-full overflow-visible"
        role="img"
        aria-label={`Klik per hari, ${data.length} hari terakhir`}
        onMouseLeave={() => setAktif(null)}
      >
        {garis.map((g) => (
          <g key={g}>
            <line x1={KIRI} x2={lebar} y1={y(g)} y2={y(g)} stroke="var(--color-border)" strokeWidth={1} />
            <text x={KIRI - 6} y={y(g)} dy="0.32em" textAnchor="end" className="fill-muted font-mono text-[10px]">
              {g}
            </text>
          </g>
        ))}

        {data.map((d, i) => {
          const x = KIRI + i * kolom + 1;
          const h = plotT - y(d.klik);
          const r = Math.min(4, batang / 2, h);
          return (
            <g key={d.tanggal} onMouseEnter={() => setAktif(i)} onFocus={() => setAktif(i)} onBlur={() => setAktif(null)} tabIndex={0} className="outline-none">
              {/* Area sentuh setinggi plot, jauh lebih besar dari batangnya. */}
              <rect x={KIRI + i * kolom} y={0} width={kolom} height={plotT} fill="transparent" />
              {d.klik > 0 && (
                <path
                  d={`M${x},${plotT} v${-(h - r)} q0,${-r} ${r},${-r} h${batang - 2 * r} q${r},0 ${r},${r} v${h - r} z`}
                  fill="var(--color-chart)"
                  opacity={aktif === null || aktif === i ? 1 : 0.45}
                />
              )}
            </g>
          );
        })}

        {labelX.map((i) => (
          <text
            key={i}
            x={KIRI + i * kolom + kolom / 2}
            y={TINGGI - 4}
            textAnchor={i === 0 ? "start" : i === data.length - 1 ? "end" : "middle"}
            className="fill-muted text-[10px]"
          >
            {fmtPendek.format(new Date(data[i].tanggal))}
          </text>
        ))}
      </svg>

      {titikAktif && aktif !== null && (
        <div
          className="pointer-events-none absolute top-0 -translate-x-1/2 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs whitespace-nowrap shadow-lg"
          style={{ left: `${((KIRI + aktif * kolom + kolom / 2) / lebar) * 100}%` }}
        >
          <p className="text-muted">{fmtPanjang.format(new Date(titikAktif.tanggal))}</p>
          <p className="font-mono font-semibold">{titikAktif.klik.toLocaleString("id-ID")} klik</p>
        </div>
      )}
    </div>
  );
}
