-- Da incollare in Supabase: SQL Editor → New query → Run. Si può eseguire più volte. Serve schema-8.sql prima.
-- @tag scelto dall'utente: da 3 a 10 caratteri (lettere minuscole, numeri, punto, trattino basso),
-- con filtro parolacce e nomi riservati, al massimo un cambio al giorno.
-- "Segnala": con 3 segnalazioni di persone diverse il tag torna automaticamente quello generato;
-- il titolare vede le segnalazioni nelle Statistiche e può resettare un tag.

-- Il tag non è più ricavato dal nome: diventa una colonna normale (i tag attuali restano).
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'profiles' and column_name = 'tag' and is_generated = 'ALWAYS') then
    alter table public.profiles alter column tag drop expression;
  end if;
end;
$$;
alter table public.profiles add column if not exists tag_custom boolean not null default false;
alter table public.profiles add column if not exists tag_changed_at timestamptz;

create table if not exists public.reports (
  reporter uuid not null references public.profiles (user_id) on delete cascade,
  reported uuid not null references public.profiles (user_id) on delete cascade,
  tag text not null,
  created_at timestamptz not null default now(),
  primary key (reporter, reported)
);
alter table public.reports enable row level security;

create or replace function public.social_card(p public.profiles)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object('handle', p.handle, 'avatar', p.avatar, 'code', p.code, 'tag', p.tag, 'tag_custom', p.tag_custom);
$$;

-- Tag generato dal nome (come prima).
create or replace function public.social_auto_tag(p_handle text)
returns text
language sql
immutable
set search_path = ''
as $$
  select lower(replace(p_handle, ' ', ''));
$$;

-- Parole vietate (anche scritte con numeri al posto delle lettere) e nomi riservati.
create or replace function public.social_tag_allowed(p_tag text)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  plain text := translate(replace(replace(p_tag, '.', ''), '_', ''), '013457$@', 'oieastsa');
  bad text;
begin
  foreach bad in array array[
    -- riservati
    'admin', 'swipe', 'shopping', 'support', 'staff', 'moderat', 'official', 'ufficial', 'amazon', 'help', 'aiuto', 'assistenz', 'root', 'system',
    -- italiano
    'cazz', 'figa', 'merd', 'stronz', 'puttan', 'troia', 'mignott', 'zoccol', 'vaffa', 'fancul', 'coglion', 'minchi', 'frocio', 'froci',
    'ricchion', 'culatton', 'finocch', 'negro', 'negri', 'terron', 'handicap', 'mongol', 'ritardat', 'pompin', 'sega', 'scopa', 'bastard', 'porco',
    'porcod', 'dioca', 'diob', 'madonn', 'nazi', 'hitler', 'duce', 'mussolin', 'isis', 'pedo', 'stupr', 'suicid', 'droga', 'cocain', 'eroina',
    -- inglese
    'fuck', 'shit', 'bitch', 'cunt', 'dick', 'cock', 'pussy', 'whore', 'slut', 'nigg', 'fag', 'retard', 'porn', 'sex', 'rape', 'kill', 'nude'
  ] loop
    if position(bad in plain) > 0 then return false; end if;
  end loop;
  return true;
end;
$$;

-- Profilo creato al primo uso: il tag iniziale è quello generato dal nome.
create or replace function public.social_me()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  me public.profiles;
  h record;
begin
  if auth.uid() is null then raise exception 'accesso richiesto'; end if;
  select * into me from public.profiles where user_id = auth.uid();
  if not found then
    select * into h from public.social_new_handle();
    insert into public.profiles (user_id, handle, avatar, code, tag)
    values (auth.uid(), h.handle, h.avatar, substr(md5(random()::text || clock_timestamp()::text), 1, 10), public.social_auto_tag(h.handle))
    on conflict (user_id) do nothing;
    select * into me from public.profiles where user_id = auth.uid();
  end if;
  return public.social_card(me) || jsonb_build_object(
    'share_saves', me.share_saves,
    'birth_day', me.birth_day,
    'birth_month', me.birth_month,
    'followers', (select count(*) from public.follows where followee = me.user_id),
    'following', (select count(*) from public.follows where follower = me.user_id)
  );
end;
$$;

-- Nome nuovo: unico anche come tag generato.
create or replace function public.social_new_handle(out handle text, out avatar text)
language plpgsql
volatile
set search_path = ''
as $$
declare
  animals text[] := array['Volpe','Panda','Koala','Tigre','Leone','Rana','Scimmia','Pinguino','Unicorno','Polpo','Ape','Farfalla','Tartaruga','Delfino','Gufo','Coniglio','Gatto','Cane','Riccio','Lontra','Fenicottero','Balena','Lupo','Orso','Criceto','Pulcino'];
  emojis text[] := array['🦊','🐼','🐨','🐯','🦁','🐸','🐵','🐧','🦄','🐙','🐝','🦋','🐢','🐬','🦉','🐰','🐱','🐶','🦔','🦦','🦩','🐳','🐺','🐻','🐹','🐥'];
  colors text[] := array['Rosa','Blu','Viola','Lilla','Fucsia','Turchese','Indaco','Corallo','Menta','Lavanda','Cobalto','Ambra','Oro','Argento','Pesca','Ciliegia','Salvia','Cipria'];
  i int;
begin
  loop
    i := 1 + floor(random() * array_length(animals, 1))::int;
    handle := animals[i] || ' ' || colors[1 + floor(random() * array_length(colors, 1))::int] || ' ' || (100 + floor(random() * 900))::int;
    avatar := emojis[i];
    exit when not exists (select 1 from public.profiles p
      where p.handle = social_new_handle.handle or p.tag = public.social_auto_tag(social_new_handle.handle));
  end loop;
end;
$$;
revoke all on function public.social_new_handle() from public, anon, authenticated;

-- Cambia nome generato: se il tag non è stato scelto a mano, segue il nome.
create or replace function public.social_regen_tag()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.handle is distinct from old.handle and not new.tag_custom then
    new.tag := public.social_auto_tag(new.handle);
  end if;
  return new;
end;
$$;
drop trigger if exists profiles_regen_tag on public.profiles;
create trigger profiles_regen_tag before update of handle on public.profiles for each row execute function public.social_regen_tag();

-- Scegli il tuo @tag. Ritorna il profilo aggiornato.
create or replace function public.social_set_tag(p_tag text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  t text := lower(regexp_replace(coalesce(p_tag, ''), '^\s*@|\s', '', 'g'));
  me public.profiles;
begin
  perform public.social_me();
  select * into me from public.profiles where user_id = auth.uid();
  if t = me.tag then return public.social_me(); end if;
  if t !~ '^[a-z0-9._]{3,10}$' then
    raise exception 'Il tag deve avere da 3 a 10 caratteri: lettere, numeri, punto o trattino basso.';
  end if;
  if t !~ '[a-z]' then raise exception 'Il tag deve contenere almeno una lettera.'; end if;
  if not public.social_tag_allowed(t) then raise exception 'Questo tag non è permesso, scegline un altro.'; end if;
  if me.tag_changed_at > now() - interval '1 day' then raise exception 'Puoi cambiare il tag una volta al giorno.'; end if;
  if exists (select 1 from public.profiles where tag = t) then raise exception 'Questo tag è già preso.'; end if;
  update public.profiles set tag = t, tag_custom = true, tag_changed_at = now() where user_id = auth.uid();
  -- Le segnalazioni vecchie riguardavano il tag precedente.
  delete from public.reports where reported = auth.uid();
  return public.social_me();
end;
$$;

-- Torna al tag generato dal nome.
create or replace function public.social_reset_tag(p_user uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.profiles set tag = public.social_auto_tag(handle), tag_custom = false where user_id = p_user;
  delete from public.reports where reported = p_user;
$$;

-- Segnala il tag di qualcuno. Con 3 segnalazioni il tag torna quello generato.
create or replace function public.social_report(p_code text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.profiles;
begin
  perform public.social_me();
  select * into p from public.profiles where code = p_code;
  if not found or p.user_id = auth.uid() or not p.tag_custom then return; end if;
  insert into public.reports (reporter, reported, tag) values (auth.uid(), p.user_id, p.tag) on conflict do nothing;
  if (select count(*) from public.reports where reported = p.user_id) >= 3 then
    perform public.social_reset_tag(p.user_id);
  end if;
end;
$$;

-- Statistiche (solo titolare): tag segnalati e reset.
create or replace function public.admin_reports()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if coalesce(auth.jwt() ->> 'email', '') <> 'kevinconti0118@gmail.com' then raise exception 'non autorizzato'; end if;
  return (select coalesce(jsonb_agg(jsonb_build_object('code', p.code, 'tag', p.tag, 'handle', p.handle, 'reports', r.n, 'last', r.last)
      order by r.n desc, r.last desc), '[]')
    from (select reported, count(*) as n, max(created_at) as last from public.reports group by reported) r
    join public.profiles p on p.user_id = r.reported);
end;
$$;

create or replace function public.admin_reset_tag(p_code text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(auth.jwt() ->> 'email', '') <> 'kevinconti0118@gmail.com' then raise exception 'non autorizzato'; end if;
  perform public.social_reset_tag((select user_id from public.profiles where code = p_code));
end;
$$;

do $$
declare
  f text;
begin
  foreach f in array array['social_set_tag(text)', 'social_report(text)', 'admin_reports()', 'admin_reset_tag(text)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
  revoke all on function public.social_reset_tag(uuid) from public, anon, authenticated;
  revoke all on function public.social_regen_tag() from public, anon, authenticated;
end;
$$;
