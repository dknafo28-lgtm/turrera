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

-- Table permissions (newer Supabase projects don't grant these automatically).
grant usage on schema public to anon, authenticated, service_role;
grant select on public.lots to anon, authenticated;
grant all on public.lots to service_role;

-- The website can only READ. Collectors write with the service-role key, which bypasses this.
alter table public.lots enable row level security;

drop policy if exists "Public read access" on public.lots;
create policy "Public read access" on public.lots
  for select using (true);

-- Resale value estimates (added Nov 2026). Safe to run more than once.
alter table public.lots add column if not exists year int;
alter table public.lots add column if not exists make text;
alter table public.lots add column if not exists model text;
alter table public.lots add column if not exists est_value numeric;
alter table public.lots add column if not exists est_low numeric;
alter table public.lots add column if not exists est_high numeric;
alter table public.lots add column if not exists comps_count int;
alter table public.lots add column if not exists value_source text;
alter table public.lots add column if not exists value_updated timestamptz;
-- Spread only counts when there is a real bid; a missing or $0 bid is not a price.
do $$ begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'lots'
             and column_name = 'spread' and generation_expression not ilike '%case%') then
    alter table public.lots drop column spread;
  end if;
end $$;
alter table public.lots add column if not exists spread numeric generated always as (case when current_bid > 0 then est_value - current_bid end) stored;
create index if not exists lots_spread_idx on public.lots (spread);

-- Condition summaries (added Nov 2026). Safe to run more than once.
alter table public.lots add column if not exists condition text;
alter table public.lots add column if not exists condition_updated timestamptz;
alter table public.lots add column if not exists details_fetched timestamptz;

-- Market value + ease of sale (added Nov 2026). Safe to run more than once.
alter table public.lots add column if not exists sell_ease text;
alter table public.lots add column if not exists sell_note text;
alter table public.lots add column if not exists appraisal_updated timestamptz;

-- All photos for a lot (added Nov 2026). Safe to run more than once.
alter table public.lots add column if not exists photos jsonb;

-- ============================================================
-- Buyers, sellers and email: newsletter, search alerts,
-- "Buy this for me" requests, "Sell your fleet" leads.
-- The website can only INSERT through the functions below;
-- reading these tables needs the service-role key (admin page, collectors).
-- ============================================================


create table if not exists public.subscribers (
  id          uuid primary key default gen_random_uuid(),
  email       text not null unique,
  name        text,
  source      text,                        -- where they signed up: footer, home, lot, buy-request
  token       text not null default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  status      text not null default 'active', -- active | unsubscribed
  created_at  timestamptz not null default now(),
  unsubscribed_at timestamptz
);

create table if not exists public.saved_searches (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  params      jsonb not null,              -- same keys as the search page: q, category, state, min, max, source, deal
  label       text,
  token       text not null default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  active      boolean not null default true,
  last_sent   timestamptz not null default now(),
  created_at  timestamptz not null default now()
);
create index if not exists saved_searches_active_idx on public.saved_searches (active);

create table if not exists public.buy_requests (
  id            uuid primary key default gen_random_uuid(),
  lot_id        text not null,
  lot_title     text,
  lot_url       text,
  name          text not null,
  email         text not null,
  phone         text,
  max_bid       numeric not null,
  destination   text,                      -- zip, city or export port
  notes         text,
  deposit       numeric,
  status        text not null default 'new', -- new | deposit_paid | bidding | won | lost | paid | shipped | done | cancelled
  stripe_session text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.sell_leads (
  id           uuid primary key default gen_random_uuid(),
  kind         text,                       -- business | government | nonprofit
  company      text not null,
  name         text not null,
  email        text not null,
  phone        text,
  call_consent boolean not null default false,
  location     text,
  fleet_size   text,
  items        text,                       -- what they want to sell
  timeline     text,
  status       text not null default 'new', -- new | contacted | booked | listed | sold | lost
  created_at   timestamptz not null default now()
);

create table if not exists public.newsletters (
  id          uuid primary key default gen_random_uuid(),
  subject     text not null,
  intro       text,
  html        text not null,
  social      jsonb,                       -- [{ lot_id, text }]
  lot_ids     text[],
  status      text not null default 'draft', -- draft | approved | sending | sent | discarded
  sent_count  int,
  created_at  timestamptz not null default now(),
  approved_at timestamptz,
  sent_at     timestamptz
);

grant all on public.subscribers, public.saved_searches, public.buy_requests, public.sell_leads, public.newsletters to service_role;
alter table public.subscribers    enable row level security;
alter table public.saved_searches enable row level security;
alter table public.buy_requests   enable row level security;
alter table public.sell_leads     enable row level security;
alter table public.newsletters    enable row level security;

-- Inserts from the website go through these functions, so the anon key never reads anyone's email.
create or replace function public.subscribe(p_email text, p_name text default null, p_source text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(p_email) > 200 then raise exception 'invalid email'; end if;
  insert into subscribers (email, name, source) values (lower(trim(p_email)), left(p_name, 120), left(p_source, 40))
  on conflict (email) do update set status = 'active', unsubscribed_at = null,
    name = coalesce(subscribers.name, excluded.name);
end $$;

create or replace function public.unsubscribe(p_token text)
returns text language plpgsql security definer set search_path = public as $$
declare e text;
begin
  update subscribers set status = 'unsubscribed', unsubscribed_at = now() where token = p_token returning email into e;
  if e is not null then
    update saved_searches set active = false where lower(email) = e;
    return e;
  end if;
  update saved_searches set active = false where token = p_token returning email into e;
  return e;
end $$;

create or replace function public.save_search(p_email text, p_params jsonb, p_label text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(p_email) > 200 then raise exception 'invalid email'; end if;
  if (select count(*) from saved_searches where lower(email) = lower(trim(p_email)) and active) >= 20 then
    raise exception 'too many saved searches';
  end if;
  insert into saved_searches (email, params, label) values (lower(trim(p_email)), p_params, left(p_label, 160));
end $$;

create or replace function public.request_buy(p_lot_id text, p_name text, p_email text, p_phone text,
  p_max_bid numeric, p_destination text, p_notes text, p_deposit numeric)
returns uuid language plpgsql security definer set search_path = public as $$
declare rid uuid; t text; u text;
begin
  if p_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'invalid email'; end if;
  if p_max_bid is null or p_max_bid <= 0 or p_max_bid > 10000000 then raise exception 'invalid max bid'; end if;
  select title, lot_url into t, u from lots where id = p_lot_id;
  if t is null and u is null then raise exception 'lot not found'; end if;
  insert into buy_requests (lot_id, lot_title, lot_url, name, email, phone, max_bid, destination, notes, deposit)
  values (p_lot_id, t, u, left(p_name, 120), lower(trim(p_email)), left(p_phone, 40), p_max_bid,
          left(p_destination, 160), left(p_notes, 2000), p_deposit)
  returning id into rid;
  return rid;
end $$;

create or replace function public.submit_sell_lead(p_kind text, p_company text, p_name text, p_email text, p_phone text,
  p_call_consent boolean, p_location text, p_fleet_size text, p_items text, p_timeline text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'invalid email'; end if;
  insert into sell_leads (kind, company, name, email, phone, call_consent, location, fleet_size, items, timeline)
  values (left(p_kind, 20), left(p_company, 160), left(p_name, 120), lower(trim(p_email)), left(p_phone, 40),
          coalesce(p_call_consent, false), left(p_location, 160), left(p_fleet_size, 40), left(p_items, 3000), left(p_timeline, 60));
end $$;

revoke all on function public.subscribe(text, text, text) from public;
revoke all on function public.unsubscribe(text) from public;
revoke all on function public.save_search(text, jsonb, text) from public;
revoke all on function public.request_buy(text, text, text, text, numeric, text, text, numeric) from public;
revoke all on function public.submit_sell_lead(text, text, text, text, text, boolean, text, text, text, text) from public;
grant execute on function public.subscribe(text, text, text) to anon, authenticated, service_role;
grant execute on function public.unsubscribe(text) to anon, authenticated, service_role;
grant execute on function public.save_search(text, jsonb, text) to anon, authenticated, service_role;
grant execute on function public.request_buy(text, text, text, text, numeric, text, text, numeric) to anon, authenticated, service_role;
grant execute on function public.submit_sell_lead(text, text, text, text, text, boolean, text, text, text, text) to anon, authenticated, service_role;

alter table public.buy_requests add column if not exists notified_at timestamptz;
alter table public.sell_leads   add column if not exists notified_at timestamptz;

-- Financing pre-approval requests. Turrera doesn't lend; these are passed to a lending partner.
create table if not exists public.finance_requests (
  id            uuid primary key default gen_random_uuid(),
  lot_id        text,
  lot_title     text,
  buyer_type    text,                      -- business | personal
  name          text not null,
  company       text,
  email         text not null,
  phone         text,
  state         text,
  amount        numeric,
  credit        text,                      -- self-reported range
  years_in_business text,
  what          text,                      -- what they want to buy
  contact_consent boolean not null default false,
  status        text not null default 'new', -- new | sent_to_lender | approved | declined | funded | closed
  notified_at   timestamptz,
  created_at    timestamptz not null default now()
);
grant all on public.finance_requests to service_role;
alter table public.finance_requests enable row level security;

create or replace function public.request_financing(p_lot_id text, p_buyer_type text, p_name text, p_company text, p_email text,
  p_phone text, p_state text, p_amount numeric, p_credit text, p_years text, p_what text, p_consent boolean)
returns void language plpgsql security definer set search_path = public as $$
declare t text;
begin
  if p_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'invalid email'; end if;
  if p_amount is not null and (p_amount <= 0 or p_amount > 50000000) then raise exception 'invalid amount'; end if;
  if p_lot_id is not null then select title into t from lots where id = p_lot_id; end if;
  insert into finance_requests (lot_id, lot_title, buyer_type, name, company, email, phone, state, amount, credit, years_in_business, what, contact_consent)
  values (nullif(p_lot_id, ''), t, left(p_buyer_type, 20), left(p_name, 120), left(p_company, 160), lower(trim(p_email)), left(p_phone, 40),
          left(p_state, 40), p_amount, left(p_credit, 40), left(p_years, 40), left(p_what, 2000), coalesce(p_consent, false));
end $$;
revoke all on function public.request_financing(text, text, text, text, text, text, text, numeric, text, text, text, boolean) from public;
grant execute on function public.request_financing(text, text, text, text, text, text, text, numeric, text, text, text, boolean) to anon, authenticated, service_role;

-- Clicks out to lending partners, to show them volume when negotiating referral fees.
create table if not exists public.finance_clicks (
  id         bigint generated always as identity primary key,
  lender     text not null,
  lot_id     text,
  amount     numeric,
  created_at timestamptz not null default now()
);
grant all on public.finance_clicks to service_role;
alter table public.finance_clicks enable row level security;

create or replace function public.log_finance_click(p_lender text, p_lot_id text, p_amount numeric)
returns void language sql security definer set search_path = public as $$
  insert into finance_clicks (lender, lot_id, amount) values (left(p_lender, 30), left(p_lot_id, 200), p_amount);
$$;
revoke all on function public.log_finance_click(text, text, numeric) from public;
grant execute on function public.log_finance_click(text, text, numeric) to anon, authenticated, service_role;

-- Types within each category (e.g. boats -> outboards, pwc, pontoons) and boat length.
alter table public.lots add column if not exists subcategory text;
alter table public.lots add column if not exists length_ft numeric;
create index if not exists lots_category_sub_idx on public.lots (category, subcategory);

-- Final results of ended auctions (true closing price, not the last bid we happened to see).
alter table public.lots add column if not exists final_price numeric;
alter table public.lots add column if not exists bid_count int;
alter table public.lots add column if not exists sold boolean;
alter table public.lots add column if not exists result_checked timestamptz;
create index if not exists lots_sold_idx on public.lots (sold, end_time desc);

-- David's own flips and customer purchases, shown on /our-sales with photos and reviews.
create table if not exists public.showcase (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  category      text,
  photos        text[] not null default '{}',
  bought_price  numeric,
  sold_price    numeric,
  bought_from   text,          -- e.g. "GSA Auctions, Florida"
  sold_to       text,          -- e.g. "Nassau, Bahamas"
  sold_on       date,
  story         text,
  customer_name text,
  review        text,
  rating        int check (rating between 1 and 5),
  kind          text not null default 'flip', -- flip (David bought and resold) | customer (bought for a customer)
  published     boolean not null default true,
  created_at    timestamptz not null default now()
);
grant all on public.showcase to service_role;
grant select on public.showcase to anon, authenticated;
alter table public.showcase enable row level security;
drop policy if exists "showcase is public" on public.showcase;
create policy "showcase is public" on public.showcase for select to anon, authenticated using (published);

insert into storage.buckets (id, name, public) values ('showcase', 'showcase', true) on conflict (id) do nothing;

-- Paid requests for a local inspector to look at a lot before the buyer bids.
create table if not exists public.inspection_requests (
  id             uuid primary key default gen_random_uuid(),
  lot_id         text not null,
  lot_title      text,
  lot_url        text,
  lot_place      text,
  lot_end        timestamptz,
  name           text not null,
  email          text not null,
  phone          text,
  questions      text,
  fee            numeric not null,
  status         text not null default 'new', -- new | paid | scheduled | done | cancelled | refunded
  stripe_session text,
  notified_at    timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
grant all on public.inspection_requests to service_role;
alter table public.inspection_requests enable row level security;

create or replace function public.request_inspection(p_lot_id text, p_name text, p_email text, p_phone text, p_questions text, p_fee numeric)
returns uuid language plpgsql security definer set search_path = public as $$
declare rid uuid; t text; u text; pl text; e timestamptz;
begin
  if p_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'invalid email'; end if;
  if p_fee is null or p_fee < 0 or p_fee > 5000 then raise exception 'invalid fee'; end if;
  select title, lot_url, concat_ws(', ', city, state, zip), end_time into t, u, pl, e from lots where id = p_lot_id;
  if t is null and u is null then raise exception 'lot not found'; end if;
  insert into inspection_requests (lot_id, lot_title, lot_url, lot_place, lot_end, name, email, phone, questions, fee)
  values (p_lot_id, t, u, pl, e, left(p_name, 120), lower(trim(p_email)), left(p_phone, 40), left(p_questions, 2000), p_fee)
  returning id into rid;
  return rid;
end $$;
revoke all on function public.request_inspection(text, text, text, text, text, numeric) from public;
grant execute on function public.request_inspection(text, text, text, text, text, numeric) to anon, authenticated, service_role;

-- ── Accounts ─────────────────────────────────────────────────────────────────
-- People sign in with Supabase Auth. Their watchlist lives here, and their alerts and
-- requests are tagged with their user id (auth.uid() is filled in automatically when
-- the request is made while signed in, including inside the request_* functions).
create table if not exists public.watchlist_items (
  user_id    uuid not null references auth.users (id) on delete cascade,
  lot_id     text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, lot_id)
);
alter table public.watchlist_items enable row level security;
grant select, insert, delete on public.watchlist_items to authenticated;
grant all on public.watchlist_items to service_role;
drop policy if exists "own watchlist read" on public.watchlist_items;
create policy "own watchlist read" on public.watchlist_items for select to authenticated using (user_id = auth.uid());
drop policy if exists "own watchlist add" on public.watchlist_items;
create policy "own watchlist add" on public.watchlist_items for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "own watchlist remove" on public.watchlist_items;
create policy "own watchlist remove" on public.watchlist_items for delete to authenticated using (user_id = auth.uid());

alter table public.saved_searches      add column if not exists user_id uuid default auth.uid() references auth.users (id) on delete set null;
alter table public.buy_requests        add column if not exists user_id uuid default auth.uid() references auth.users (id) on delete set null;
alter table public.finance_requests    add column if not exists user_id uuid default auth.uid() references auth.users (id) on delete set null;
alter table public.inspection_requests add column if not exists user_id uuid default auth.uid() references auth.users (id) on delete set null;
create index if not exists saved_searches_user_idx      on public.saved_searches (user_id);
create index if not exists buy_requests_user_idx        on public.buy_requests (user_id);
create index if not exists finance_requests_user_idx    on public.finance_requests (user_id);
create index if not exists inspection_requests_user_idx on public.inspection_requests (user_id);

-- Signed-in people can see their own alerts and requests (never anyone else's) and turn off their own alerts.
grant select on public.saved_searches, public.buy_requests, public.finance_requests, public.inspection_requests to authenticated;
grant update (active) on public.saved_searches to authenticated;
drop policy if exists "own alerts read" on public.saved_searches;
create policy "own alerts read" on public.saved_searches for select to authenticated using (user_id = auth.uid());
drop policy if exists "own alerts toggle" on public.saved_searches;
create policy "own alerts toggle" on public.saved_searches for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "own buy requests" on public.buy_requests;
create policy "own buy requests" on public.buy_requests for select to authenticated using (user_id = auth.uid());
drop policy if exists "own finance requests" on public.finance_requests;
create policy "own finance requests" on public.finance_requests for select to authenticated using (user_id = auth.uid());
drop policy if exists "own inspection requests" on public.inspection_requests;
create policy "own inspection requests" on public.inspection_requests for select to authenticated using (user_id = auth.uid());

-- ── Text alerts ──────────────────────────────────────────────────────────────
-- Per-account settings: a phone number and how many hours before a watched lot closes to text.
create table if not exists public.profiles (
  user_id        uuid primary key references auth.users (id) on delete cascade,
  phone          text,
  sms_on         boolean not null default false,
  sms_hours      int not null default 3 check (sms_hours between 1 and 48),
  sms_consent_at timestamptz,
  updated_at     timestamptz not null default now()
);
alter table public.profiles enable row level security;
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
drop policy if exists "own profile read" on public.profiles;
create policy "own profile read" on public.profiles for select to authenticated using (user_id = auth.uid());
drop policy if exists "own profile add" on public.profiles;
create policy "own profile add" on public.profiles for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "own profile edit" on public.profiles;
create policy "own profile edit" on public.profiles for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- One text per person, lot and kind, so nobody gets the same alert twice.
create table if not exists public.sms_sent (
  user_id uuid not null references auth.users (id) on delete cascade,
  lot_id  text not null,
  kind    text not null default 'closing',
  sent_at timestamptz not null default now(),
  primary key (user_id, lot_id, kind)
);
alter table public.sms_sent enable row level security;
grant all on public.sms_sent to service_role;

-- ── Reviews ──────────────────────────────────────────────────────────────────
-- Reviews of the site or of a lot. Nothing shows until David approves it in admin.
-- "Verified buyer" is set by the database: the reviewer is signed in and has sent a buy-for-me
-- or inspection request. Reviews are never edited to change what the person said.
create table if not exists public.reviews (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid default auth.uid() references auth.users (id) on delete set null,
  lot_id      text,
  lot_title   text,
  name        text not null,
  email       text not null,
  rating      int not null check (rating between 1 and 5),
  body        text not null,
  verified    boolean not null default false,
  status      text not null default 'pending', -- pending | approved | rejected
  notified_at timestamptz,
  created_at  timestamptz not null default now(),
  approved_at timestamptz
);
create index if not exists reviews_status_idx on public.reviews (status, created_at desc);
create index if not exists reviews_lot_idx on public.reviews (lot_id) where lot_id is not null;
alter table public.reviews enable row level security;
grant all on public.reviews to service_role;
-- Everyone can read approved reviews, but never the reviewer's email.
grant select (id, lot_id, lot_title, name, rating, body, verified, status, created_at, approved_at) on public.reviews to anon, authenticated;
drop policy if exists "approved reviews are public" on public.reviews;
create policy "approved reviews are public" on public.reviews for select to anon, authenticated using (status = 'approved');

create or replace function public.submit_review(p_name text, p_email text, p_rating int, p_body text, p_lot_id text)
returns uuid language plpgsql security definer set search_path = public as $$
declare rid uuid; t text; v boolean := false; uid uuid := auth.uid();
begin
  if p_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'invalid email'; end if;
  if p_rating is null or p_rating < 1 or p_rating > 5 then raise exception 'invalid rating'; end if;
  if length(trim(coalesce(p_body, ''))) < 10 then raise exception 'review too short'; end if;
  if length(trim(coalesce(p_name, ''))) < 2 then raise exception 'name required'; end if;
  -- One review per email per subject per day keeps out floods; David still approves each one.
  if exists (select 1 from reviews where lower(email) = lower(trim(p_email)) and coalesce(lot_id, '') = coalesce(p_lot_id, '') and created_at > now() - interval '1 day') then
    raise exception 'already reviewed';
  end if;
  if p_lot_id is not null then select title into t from lots where id = p_lot_id; end if;
  if uid is not null then
    select exists (select 1 from buy_requests where user_id = uid) or exists (select 1 from inspection_requests where user_id = uid) into v;
  end if;
  insert into reviews (user_id, lot_id, lot_title, name, email, rating, body, verified)
  values (uid, p_lot_id, t, left(trim(p_name), 60), lower(trim(p_email)), p_rating, left(trim(p_body), 2000), v)
  returning id into rid;
  return rid;
end $$;
revoke all on function public.submit_review(text, text, int, text, text) from public;
grant execute on function public.submit_review(text, text, int, text, text) to anon, authenticated, service_role;
