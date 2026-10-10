-- Da incollare in Supabase: SQL Editor → New query → Run. Si può eseguire più volte. Serve schema-5.sql prima.
-- Notifiche push: i telefoni (app Android) da avvisare quando arriva qualcosa in "Per te".
-- Le manda scripts/push.ts da GitHub Actions; il testo è sempre fisso (nessun testo scritto dagli utenti).

create table if not exists public.push_tokens (
  token text primary key check (length(token) between 20 and 4096),
  user_id uuid not null references auth.users (id) on delete cascade,
  platform text not null check (platform in ('android', 'ios')),
  updated_at timestamptz not null default now()
);
create index if not exists push_tokens_user on public.push_tokens (user_id);
alter table public.push_tokens enable row level security;

-- Novità già avvisate. Quelle vecchie (prima di questo script) non vengono mai mandate.
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'inbox' and column_name = 'pushed') then
    alter table public.inbox add column pushed boolean not null default false;
    update public.inbox set pushed = true;
  end if;
end;
$$;
create index if not exists inbox_to_push on public.inbox (created_at) where not pushed;

create or replace function public.push_register(p_token text, p_platform text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'accesso richiesto'; end if;
  -- Un token appartiene a un solo account (il telefono può cambiare account).
  delete from public.push_tokens where token = p_token;
  insert into public.push_tokens (token, user_id, platform) values (p_token, auth.uid(), p_platform);
  -- Al massimo 10 telefoni per account.
  delete from public.push_tokens where user_id = auth.uid() and token in (
    select token from public.push_tokens where user_id = auth.uid() order by updated_at desc offset 10);
end;
$$;

create or replace function public.push_unregister(p_token text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.push_tokens where token = p_token and user_id = auth.uid();
$$;

revoke all on function public.push_register(text, text) from public, anon;
grant execute on function public.push_register(text, text) to authenticated;
revoke all on function public.push_unregister(text) from public, anon;
grant execute on function public.push_unregister(text) to authenticated;
