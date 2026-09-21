import "server-only";
import { createClient } from "@supabase/supabase-js";

/* Klien ini hanya hidup di server. Pengunjung tidak pernah berbicara langsung
   dengan Supabase: semua lewat route handler, yang memvalidasi dulu. */
const url = process.env.SUPABASE_URL ?? "";
const key = process.env.SUPABASE_KEY ?? "";

export const supabase = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;

export type Tautan = {
  kode: string;
  url_tujuan: string;
  dibuat_pada: string;
  kedaluwarsa_pada: string | null;
  jumlah_klik: number;
};

export type Statistik = {
  harian: { tanggal: string; klik: number }[];
  negara: { nama: string; klik: number }[];
  perujuk: { nama: string; klik: number }[];
  perangkat: { nama: string; klik: number }[];
};
