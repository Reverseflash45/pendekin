-- ============================================================
-- Skema Pendekin — pemendek URL massal
-- Jalankan sekali di Supabase → SQL Editor → New query → Run.
-- Aman dijalankan ulang (idempoten).
-- ============================================================

create table if not exists public.tautan (
  kode             text        primary key,
  url_tujuan       text        not null,
  dibuat_pada      timestamptz not null default now(),
  kedaluwarsa_pada timestamptz,
  jumlah_klik      bigint      not null default 0,

  -- Kode selalu huruf kecil: "Promo" dan "promo" tidak boleh jadi dua tautan
  -- berbeda yang membingungkan orang yang mengetiknya ulang.
  constraint kode_wajar check (kode ~ '^[a-z0-9][a-z0-9-]{2,31}$'),
  constraint url_wajar  check (url_tujuan ~* '^https?://' and char_length(url_tujuan) <= 2048)
);

create table if not exists public.klik (
  id        bigint generated always as identity primary key,
  kode      text        not null references public.tautan (kode) on delete cascade,
  waktu     timestamptz not null default now(),
  negara    text,  -- kode ISO 2 huruf dari header Vercel, tanpa IP
  perujuk   text,  -- hanya nama host, bukan URL lengkap
  perangkat text   -- 'desktop' | 'mobile' | 'tablet' | 'bot'
);

create index if not exists klik_kode_waktu_idx on public.klik (kode, waktu desc);

alter table public.tautan enable row level security;
alter table public.klik   enable row level security;

-- Tautan boleh dibaca siapa pun (halaman statistik bersifat publik, seperti
-- bit.ly+). Tidak ada policy insert/update/delete: semua penulisan lewat
-- fungsi di bawah, yang memvalidasi masukan.
drop policy if exists "baca tautan" on public.tautan;
create policy "baca tautan" on public.tautan for select to anon, authenticated using (true);
-- Tabel klik sama sekali tidak bisa dibaca langsung; hanya agregatnya.

-- Kata yang tidak boleh jadi kode karena bentrok dengan rute aplikasi.
create or replace function public._kode_terlarang(p text) returns boolean
language sql immutable as $$
  select p = any (array['api','stats','hilang','_next','favicon.ico','robots.txt','sitemap.xml','admin','login']);
$$;

-- ------------------------------------------------------------
-- buat_tautan: membuat satu tautan. Alias opsional; bila kosong,
-- kode acak 6 karakter dibuat (36^6 ≈ 2,2 miliar kombinasi).
-- ------------------------------------------------------------
create or replace function public.buat_tautan(
  p_url text,
  p_alias text default null,
  p_kedaluwarsa timestamptz default null
) returns public.tautan
language plpgsql security definer set search_path = public as $$
declare
  abjad constant text := 'abcdefghijkmnpqrstuvwxyz23456789'; -- tanpa l, o, 0, 1 yang mirip
  v_kode text;
  v_baris public.tautan;
  percobaan int := 0;
begin
  p_url := btrim(p_url);
  if p_url !~* '^https?://[^\s/$.?#][^\s]*$' or char_length(p_url) > 2048 then
    raise exception 'URL tidak valid' using errcode = '22023';
  end if;
  if p_kedaluwarsa is not null and p_kedaluwarsa <= now() then
    raise exception 'Tanggal kedaluwarsa sudah lewat' using errcode = '22023';
  end if;

  if nullif(btrim(p_alias), '') is not null then
    v_kode := lower(btrim(p_alias));
    if v_kode !~ '^[a-z0-9][a-z0-9-]{2,31}$' or public._kode_terlarang(v_kode) then
      raise exception 'Alias harus 3–32 karakter: huruf, angka, atau tanda hubung' using errcode = '22023';
    end if;
    insert into public.tautan (kode, url_tujuan, kedaluwarsa_pada)
      values (v_kode, p_url, p_kedaluwarsa)
      on conflict (kode) do nothing
      returning * into v_baris;
    if v_baris.kode is null then
      raise exception 'Alias "%" sudah dipakai', v_kode using errcode = '23505';
    end if;
    return v_baris;
  end if;

  loop
    percobaan := percobaan + 1;
    select string_agg(substr(abjad, 1 + floor(random() * length(abjad))::int, 1), '')
      into v_kode from generate_series(1, 6);
    insert into public.tautan (kode, url_tujuan, kedaluwarsa_pada)
      values (v_kode, p_url, p_kedaluwarsa)
      on conflict (kode) do nothing
      returning * into v_baris;
    exit when v_baris.kode is not null;
    if percobaan >= 8 then
      raise exception 'Gagal membuat kode unik, coba lagi';
    end if;
  end loop;
  return v_baris;
end $$;

-- ------------------------------------------------------------
-- buka_tautan: dipanggil saat seseorang membuka tautan pendek.
-- Mengembalikan URL tujuan (null bila tidak ada / kedaluwarsa)
-- sekaligus mencatat klik — satu perjalanan ke basis data.
-- ------------------------------------------------------------
create or replace function public.buka_tautan(
  p_kode text,
  p_negara text default null,
  p_perujuk text default null,
  p_perangkat text default null
) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_url text;
begin
  select url_tujuan into v_url
    from public.tautan
   where kode = lower(p_kode)
     and (kedaluwarsa_pada is null or kedaluwarsa_pada > now());

  -- Bot (pratinjau WhatsApp, crawler) tetap diarahkan, tapi tidak dihitung
  -- supaya statistik tidak menggelembung setiap kali tautan dibagikan.
  if v_url is null or p_perangkat = 'bot' then
    return v_url;
  end if;

  update public.tautan set jumlah_klik = jumlah_klik + 1 where kode = lower(p_kode);
  insert into public.klik (kode, negara, perujuk, perangkat)
    values (lower(p_kode), left(upper(p_negara), 2), left(p_perujuk, 253), left(p_perangkat, 10));

  return v_url;
end $$;

-- ------------------------------------------------------------
-- statistik_tautan: agregat klik untuk halaman statistik.
-- Tidak pernah mengembalikan baris klik mentah.
-- ------------------------------------------------------------
create or replace function public.statistik_tautan(p_kode text, p_hari int default 30)
returns jsonb
language sql stable security definer set search_path = public as $$
  with k as (
    select * from public.klik
     where kode = lower(p_kode)
       and waktu >= date_trunc('day', now()) - make_interval(days => least(greatest(p_hari, 1), 90) - 1)
  ),
  hari as (
    select d::date as tanggal
      from generate_series(date_trunc('day', now()) - make_interval(days => least(greatest(p_hari, 1), 90) - 1),
                           date_trunc('day', now()), interval '1 day') d
  )
  select jsonb_build_object(
    'harian', (select coalesce(jsonb_agg(jsonb_build_object('tanggal', h.tanggal, 'klik', coalesce(c.n, 0)) order by h.tanggal), '[]')
                 from hari h
                 left join (select waktu::date as tanggal, count(*) n from k group by 1) c using (tanggal)),
    'negara', (select coalesce(jsonb_agg(jsonb_build_object('nama', nama, 'klik', n) order by n desc), '[]')
                 from (select coalesce(negara, '??') nama, count(*) n from k group by 1 order by 2 desc limit 8) x),
    'perujuk', (select coalesce(jsonb_agg(jsonb_build_object('nama', nama, 'klik', n) order by n desc), '[]')
                 from (select coalesce(perujuk, 'langsung') nama, count(*) n from k group by 1 order by 2 desc limit 8) x),
    'perangkat', (select coalesce(jsonb_agg(jsonb_build_object('nama', nama, 'klik', n) order by n desc), '[]')
                 from (select coalesce(perangkat, 'lainnya') nama, count(*) n from k group by 1 order by 2 desc) x)
  );
$$;

revoke all on function public.buat_tautan(text, text, timestamptz)        from public;
revoke all on function public.buka_tautan(text, text, text, text)         from public;
revoke all on function public.statistik_tautan(text, int)                 from public;
grant execute on function public.buat_tautan(text, text, timestamptz)     to anon, authenticated;
grant execute on function public.buka_tautan(text, text, text, text)      to anon, authenticated;
grant execute on function public.statistik_tautan(text, int)              to anon, authenticated;
