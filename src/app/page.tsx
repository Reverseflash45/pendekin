import { Pemendek } from "@/components/Pemendek";

const FITUR = [
  { judul: "Sampai 20 sekaligus", isi: "Tempel daftar atau impor CSV. Duplikat dibuang otomatis, yang gagal dikembalikan untuk diperbaiki." },
  { judul: "QR untuk setiap tautan", isi: "Unduh sebagai PNG siap cetak — untuk poster, banner, atau kemasan." },
  { judul: "Statistik klik", isi: "Klik per hari, negara, sumber, dan perangkat. Bot pratinjau WhatsApp tidak ikut dihitung." },
];

export default function Beranda() {
  return (
    <>
      <section className="kertas -mx-4 px-4 pt-10 pb-8 sm:-mx-6 sm:px-6 sm:pt-16">
        <h1 className="max-w-xl font-display text-4xl leading-[1.05] font-extrabold tracking-tight text-balance sm:text-6xl">
          Pendekkan banyak tautan <span className="text-accent">sekaligus.</span>
        </h1>
        <p className="mt-4 max-w-lg text-lg text-pretty text-muted">
          Satu tempel, sampai 20 tautan pendek — masing-masing dengan QR code dan statistik klik. Gratis, tanpa daftar.
        </p>
      </section>

      <Pemendek />

      <section className="mt-16 grid gap-6 border-t border-border pt-8 sm:grid-cols-3">
        {FITUR.map((f, i) => (
          <div key={f.judul}>
            <p className="font-mono text-xs text-accent">0{i + 1}</p>
            <h2 className="mt-1 font-display font-extrabold">{f.judul}</h2>
            <p className="mt-1 text-sm text-muted">{f.isi}</p>
          </div>
        ))}
      </section>
    </>
  );
}
