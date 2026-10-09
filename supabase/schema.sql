-- Da incollare in Supabase: SQL Editor → New query → Run.
-- Una riga per utente con preferiti, scartati e filtri. Ogni utente vede e modifica solo la propria.

create table if not exists public.user_data (
  user_id uuid primary key references auth.users (id) on delete cascade,
  wishlist jsonb not null default '[]'::jsonb,
  disliked jsonb not null default '[]'::jsonb,
  filters jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_data enable row level security;

drop policy if exists "Leggo solo i miei dati" on public.user_data;
create policy "Leggo solo i miei dati" on public.user_data
  for select using (auth.uid() = user_id);

drop policy if exists "Creo solo i miei dati" on public.user_data;
create policy "Creo solo i miei dati" on public.user_data
  for insert with check (auth.uid() = user_id);

drop policy if exists "Modifico solo i miei dati" on public.user_data;
create policy "Modifico solo i miei dati" on public.user_data
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Cancello solo i miei dati" on public.user_data;
create policy "Cancello solo i miei dati" on public.user_data
  for delete using (auth.uid() = user_id);

-- Permette all'utente di eliminare il proprio account (diritto alla cancellazione, GDPR).
create or replace function public.delete_my_account()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from auth.users where id = auth.uid();
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
