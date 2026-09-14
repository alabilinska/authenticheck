-- S-05: saved verifications, visible only to their owner (PRD Access Control).
-- Additive only: this project is shared by local development and production.

create table public.verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  listing_url text not null check (char_length(listing_url) <= 2000),
  declared_year integer,
  price numeric(10, 2),
  -- What the buyer entered (TagObservation); the evaluation is recomputed on read.
  observation jsonb not null,
  -- Denormalised from the evaluation at save time, so the list needs no recomputation.
  outcome text not null,
  risk_level text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.verifications enable row level security;

-- Auto-expose of new tables is off: the Data API sees the table only through this grant.
grant select, insert, update, delete on public.verifications to authenticated;

create policy "verifications_select_own" on public.verifications
  for select to authenticated using (user_id = (select auth.uid()));

create policy "verifications_insert_own" on public.verifications
  for insert to authenticated with check (user_id = (select auth.uid()));

create policy "verifications_update_own" on public.verifications
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "verifications_delete_own" on public.verifications
  for delete to authenticated using (user_id = (select auth.uid()));

create index verifications_user_created_idx on public.verifications (user_id, created_at desc);
