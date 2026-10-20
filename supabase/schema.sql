-- TYT Takip: Supabase şeması.
-- Supabase panelinde SQL Editor'e yapıştırıp çalıştır.
-- Her kullanıcı yalnızca kendi satırlarını görebilir ve değiştirebilir (Row Level Security).

create table if not exists public.tyt_veri (
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  id text not null,
  tur text not null check (tur in ('kayit', 'deneme', 'odak', 'ayarlar')),
  veri jsonb not null,
  guncelleme timestamptz not null default now(),
  primary key (user_id, id)
);

create index if not exists tyt_veri_user_tur on public.tyt_veri (user_id, tur);

alter table public.tyt_veri enable row level security;

drop policy if exists "kendi verisini okur" on public.tyt_veri;
create policy "kendi verisini okur" on public.tyt_veri
  for select using (auth.uid() = user_id);

drop policy if exists "kendi verisini ekler" on public.tyt_veri;
create policy "kendi verisini ekler" on public.tyt_veri
  for insert with check (auth.uid() = user_id);

drop policy if exists "kendi verisini günceller" on public.tyt_veri;
create policy "kendi verisini günceller" on public.tyt_veri
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "kendi verisini siler" on public.tyt_veri;
create policy "kendi verisini siler" on public.tyt_veri
  for delete using (auth.uid() = user_id);
