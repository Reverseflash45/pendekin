import type { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { hostPerujuk, jenisPerangkat } from "@/lib/perangkat";
import { POLA_ALIAS } from "@/lib/url";

export async function GET(req: NextRequest, { params }: { params: Promise<{ kode: string }> }) {
  const kode = (await params).kode.toLowerCase();
  const hilang = new URL(`/hilang?kode=${encodeURIComponent(kode)}`, req.url);

  if (!supabase || !POLA_ALIAS.test(kode)) return Response.redirect(hilang, 307);

  const { data: tujuan, error } = await supabase.rpc("buka_tautan", {
    p_kode: kode,
    p_negara: req.headers.get("x-vercel-ip-country"),
    p_perujuk: hostPerujuk(req.headers.get("referer"), req.nextUrl.hostname),
    p_perangkat: jenisPerangkat(req.headers.get("user-agent")),
  });

  if (error) console.error("buka_tautan gagal:", error.message);
  if (error || typeof tujuan !== "string") return Response.redirect(hilang, 307);

  // 302, bukan 301: peramban menyimpan 301 selamanya dan berhenti bertanya ke
  // server, sehingga klik berikutnya tidak tercatat dan tautan tak bisa kedaluwarsa.
  return new Response(null, {
    status: 302,
    headers: { location: tujuan, "cache-control": "private, no-store" },
  });
}
