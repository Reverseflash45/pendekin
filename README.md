# Pendekin

Pemendek URL massal: tempel sampai 20 tautan sekaligus dan dapatkan tautan pendek, QR code, serta statistik klik untuk masing-masing. Gratis dan tanpa akun.

## Fitur

- **Massal**: sampai 20 URL per proses, bisa impor dari CSV. Duplikat dibuang otomatis, dan URL yang gagal dikembalikan ke kotak input untuk diperbaiki.
- **Alias kustom** (`/promo-agustus`) dan **kedaluwarsa** (1, 7, atau 30 hari).
- **QR code** per tautan, bisa diunduh sebagai PNG.
- **Statistik klik**: grafik klik per hari (30 hari), negara, sumber perujuk, dan perangkat. Bot pratinjau (WhatsApp, Telegram, crawler) tidak ikut dihitung.
- **Ekspor**: salin semua hasil atau unduh sebagai CSV.
- **Riwayat** tersimpan di peramban (localStorage), tanpa perlu akun.
- **Pemeriksaan tautan berbahaya** lewat Google Safe Browsing (opsional).

## Keputusan teknis

| Keputusan | Alasan |
|---|---|
| Semua penulisan lewat fungsi Postgres (`security definer`), tanpa policy insert/update | Kunci publik tidak bisa menulis baris sembarangan. Validasi dilakukan di basis data, bukan hanya di klien. |
| Redirect memakai 302, bukan 301 | Peramban menyimpan 301 selamanya, sehingga klik berikutnya tidak tercatat dan tautan tidak bisa kedaluwarsa. |
| Cari tujuan dan catat klik dalam satu RPC | Satu perjalanan ke basis data per redirect. |
| Tabel `klik` tidak bisa dibaca langsung | Halaman statistik hanya mendapat agregat. Alamat IP tidak disimpan, hanya negara, host perujuk, dan jenis perangkat. |
| Kode acak 6 karakter tanpa `l o 0 1` | Tidak ada karakter yang mirip saat tautan diketik ulang dari cetakan atau QR. |
| Klien Supabase hanya ada di server (`server-only`) | Pengunjung tidak pernah berbicara langsung dengan basis data. |

## Stack

Next.js 16 (App Router) · React 19 · Tailwind CSS 4 · Supabase (Postgres) · Vercel

## Menjalankan secara lokal

1. Jalankan `supabase.sql` di Supabase → SQL Editor.
2. Salin `.env.example` ke `.env.local`, lalu isi `SUPABASE_URL` dan `SUPABASE_KEY`.
3. Jalankan:
   ```bash
   npm install
   npm run dev
   ```

## Struktur

```
src/app/page.tsx               beranda + form
src/app/[kode]/route.ts        redirect + pencatatan klik
src/app/api/pendekkan/route.ts membuat tautan (validasi, Safe Browsing)
src/app/stats/[kode]/page.tsx  halaman statistik
supabase.sql                   skema, RLS, dan fungsi
```
