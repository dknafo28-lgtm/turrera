-- Turrera database setup. Paste this whole file into Supabase → SQL Editor → Run.

create table if not exists public.lots (
  id            text primary key,          -- e.g. "gsa:41QSCI26123001:7"
  source        text not null,             -- "gsa", later "govdeals", "publicsurplus", ...
  title         text,
  description   text,
  category      text,                      -- boats, trucks, buses, cars, equipment, golf carts, other
  current_bid   numeric,
  start_time    timestamptz,
  end_time      timestamptz,
  status        text,
  city          text,
  state         text,
  zip           text,
  agency        text,
  photo_url     text,
  lot_url       text,
  raw           jsonb,
  first_seen    timestamptz not null default now(),
  last_updated  timestamptz not null default now()
);

create index if not exists lots_end_time_idx on public.lots (end_time);
create index if not exists lots_category_idx on public.lots (category);
create index if not exists lots_state_idx    on public.lots (state);
create index if not exists lots_source_idx   on public.lots (source);

-- The website can only READ. Collectors write with the service-role key, which bypasses this.
alter table public.lots enable row level security;

drop policy if exists "Public read access" on public.lots;
create policy "Public read access" on public.lots
  for select using (true);
