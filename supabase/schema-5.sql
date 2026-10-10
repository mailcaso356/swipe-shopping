-- Da incollare in Supabase: SQL Editor → New query → Run. Si può eseguire più volte. Serve schema-4.sql prima.
-- Amici, seconda parte: tutto dentro l'app e sempre senza testo libero.
--  • "Per te": consigli, sondaggi, liste e inviti a Swipe insieme mandati agli amici (messaggi fissi)
--  • reazioni con emoji fisse su sondaggi e liste
--  • match: prodotti salvati sia da me sia da un amico (solo se entrambi mostrano i preferiti)
--  • Swipe insieme: lo stesso mazzo per due amici, alla fine i prodotti piaciuti a entrambi
--  • compleanni: solo giorno e mese, visibili a chi ti segue

alter table public.profiles add column if not exists birth_day smallint check (birth_day between 1 and 31);
alter table public.profiles add column if not exists birth_month smallint check (birth_month between 1 and 12);

create table if not exists public.inbox (
  id bigint generated always as identity primary key,
  recipient uuid not null references public.profiles (user_id) on delete cascade,
  sender uuid not null references public.profiles (user_id) on delete cascade,
  kind text not null check (kind in ('consiglio', 'sondaggio', 'lista', 'swipe', 'reazione')),
  product_id text check (product_id is null or public.social_valid_products(array[product_id], 1, 1)),
  ref_id uuid,
  emoji text,
  created_at timestamptz not null default now(),
  seen boolean not null default false
);
create index if not exists inbox_recipient on public.inbox (recipient, created_at desc);
create index if not exists inbox_sender on public.inbox (sender, created_at desc);

create table if not exists public.reactions (
  target_kind text not null check (target_kind in ('poll', 'list')),
  target_id uuid not null,
  reactor uuid not null references public.profiles (user_id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  primary key (target_kind, target_id, reactor)
);

create table if not exists public.swipe_sessions (
  id uuid primary key default gen_random_uuid(),
  creator uuid not null references public.profiles (user_id) on delete cascade,
  partner uuid not null references public.profiles (user_id) on delete cascade,
  product_ids text[] not null check (public.social_valid_products(product_ids, 4, 12)),
  created_at timestamptz not null default now(),
  check (creator <> partner)
);
create index if not exists swipe_sessions_creator on public.swipe_sessions (creator);
create index if not exists swipe_sessions_partner on public.swipe_sessions (partner);

create table if not exists public.swipe_votes (
  session_id uuid not null references public.swipe_sessions (id) on delete cascade,
  user_id uuid not null references public.profiles (user_id) on delete cascade,
  product_id text not null,
  yes boolean not null,
  primary key (session_id, user_id, product_id)
);

alter table public.inbox enable row level security;
alter table public.reactions enable row level security;
alter table public.swipe_sessions enable row level security;
alter table public.swipe_votes enable row level security;

-- Le liste e i sondaggi spariscono: via anche reazioni e messaggi che li citano.
create or replace function public.social_cleanup_ref()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.reactions where target_id = old.id;
  delete from public.inbox where ref_id = old.id;
  return old;
end;
$$;
drop trigger if exists polls_cleanup on public.polls;
create trigger polls_cleanup after delete on public.polls for each row execute function public.social_cleanup_ref();
drop trigger if exists gift_lists_cleanup on public.gift_lists;
create trigger gift_lists_cleanup after delete on public.gift_lists for each row execute function public.social_cleanup_ref();
drop trigger if exists swipe_sessions_cleanup on public.swipe_sessions;
create trigger swipe_sessions_cleanup after delete on public.swipe_sessions for each row execute function public.social_cleanup_ref();

-- Amici = uno segue l'altro (in un verso o nell'altro) e nessuno ha bloccato l'altro.
create or replace function public.social_are_friends(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select a is not null and b is not null and a <> b
    and exists (select 1 from public.follows where (follower = a and followee = b) or (follower = b and followee = a))
    and not exists (select 1 from public.blocks where (blocker = a and blocked = b) or (blocker = b and blocked = a));
$$;
revoke all on function public.social_are_friends(uuid, uuid) from public, anon, authenticated;

create or replace function public.social_reaction_emojis()
returns text[]
language sql
immutable
set search_path = ''
as $$
  select array['❤️', '🔥', '😍', '😂', '💸'];
$$;

-- ---------- Profilo: anche il compleanno ----------

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
    insert into public.profiles (user_id, handle, avatar, code)
    values (auth.uid(), h.handle, h.avatar, substr(md5(random()::text || clock_timestamp()::text), 1, 10))
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

drop function if exists public.social_update(boolean, text, boolean);
-- new_birth_month = 0 cancella il compleanno.
create or replace function public.social_update(
  regenerate boolean default false, new_avatar text default null, new_share_saves boolean default null,
  new_birth_day int default null, new_birth_month int default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  h record;
begin
  perform public.social_me();
  if regenerate then
    select * into h from public.social_new_handle();
    update public.profiles set handle = h.handle where user_id = auth.uid();
  end if;
  if new_avatar is not null then
    if not (new_avatar = any (public.social_avatars())) then raise exception 'avatar non valido'; end if;
    update public.profiles set avatar = new_avatar where user_id = auth.uid();
  end if;
  if new_share_saves is not null then
    update public.profiles set share_saves = new_share_saves where user_id = auth.uid();
  end if;
  if new_birth_month = 0 then
    update public.profiles set birth_day = null, birth_month = null where user_id = auth.uid();
  elsif new_birth_month is not null then
    -- Controllo della data (29 febbraio ammesso).
    perform make_date(2000, new_birth_month, new_birth_day);
    update public.profiles set birth_day = new_birth_day, birth_month = new_birth_month where user_id = auth.uid();
  end if;
  return public.social_me();
end;
$$;

-- Compleanni dei prossimi 21 giorni di chi seguo, con la sua lista Compleanno se c'è.
create or replace function public.social_birthdays()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object('who', public.social_card(p), 'day', p.birth_day, 'month', p.birth_month,
      'days_left', d.days_left,
      'list_id', (select l.id from public.gift_lists l where l.owner = p.user_id and l.template = 'compleanno' order by l.updated_at desc limit 1))
    order by d.days_left), '[]')
  from public.follows f
  join public.profiles p on p.user_id = f.followee and p.birth_month is not null
  cross join lateral (
    select min(make_date(y, p.birth_month, least(p.birth_day, extract(day from (make_date(y, p.birth_month, 1) + interval '1 month - 1 day'))::int)) - current_date) as days_left
    from unnest(array[extract(year from current_date)::int, extract(year from current_date)::int + 1]) as y
    where make_date(y, p.birth_month, least(p.birth_day, extract(day from (make_date(y, p.birth_month, 1) + interval '1 month - 1 day'))::int)) >= current_date
  ) d
  where f.follower = auth.uid() and d.days_left <= 21;
$$;

-- ---------- Posta "Per te" ----------

-- Manda a uno o più amici: un prodotto consigliato, un mio sondaggio o una mia lista. Messaggi fissi.
create or replace function public.inbox_send(p_codes text[], p_kind text, p_product_id text default null, p_ref uuid default null)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  sent int := 0;
  r public.profiles;
begin
  perform public.social_me();
  if cardinality(p_codes) > 50 then raise exception 'troppi amici insieme'; end if;
  if p_kind = 'consiglio' then
    if p_product_id is null then raise exception 'prodotto mancante'; end if;
    p_ref := null;
  elsif p_kind = 'sondaggio' then
    if not exists (select 1 from public.polls where id = p_ref and owner = me) then raise exception 'sondaggio non trovato'; end if;
    p_product_id := null;
  elsif p_kind = 'lista' then
    if not exists (select 1 from public.gift_lists where id = p_ref and owner = me) then raise exception 'lista non trovata'; end if;
    p_product_id := null;
  else
    raise exception 'tipo non valido';
  end if;
  if (select count(*) from public.inbox where sender = me and created_at > now() - interval '1 day') + cardinality(p_codes) > 200 then
    raise exception 'hai mandato troppe cose oggi, riprova domani';
  end if;
  for r in select * from public.profiles where code = any (p_codes) loop
    if public.social_are_friends(me, r.user_id) then
      -- Lo stesso invio ripetuto non duplica il messaggio: torna in cima come nuovo.
      delete from public.inbox where recipient = r.user_id and sender = me and kind = p_kind
        and product_id is not distinct from p_product_id and ref_id is not distinct from p_ref;
      insert into public.inbox (recipient, sender, kind, product_id, ref_id) values (r.user_id, me, p_kind, p_product_id, p_ref);
      sent := sent + 1;
    end if;
  end loop;
  return sent;
end;
$$;

create or replace function public.inbox_list()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', i.id, 'kind', i.kind, 'product_id', i.product_id, 'ref_id', i.ref_id,
      'emoji', i.emoji, 'at', i.created_at, 'seen', i.seen, 'who', public.social_card(p),
      'product_ids', coalesce(o.product_ids, l.product_ids, s.product_ids),
      'template', l.template, 'ref_kind', case when o.id is not null then 'poll' when l.id is not null then 'list' end)
    order by i.created_at desc), '[]')
  from (select * from public.inbox where recipient = auth.uid() order by created_at desc limit 60) i
  join public.profiles p on p.user_id = i.sender
  left join public.polls o on o.id = i.ref_id
  left join public.gift_lists l on l.id = i.ref_id
  left join public.swipe_sessions s on s.id = i.ref_id
  where not exists (select 1 from public.blocks b where b.blocker = auth.uid() and b.blocked = i.sender);
$$;

create or replace function public.inbox_unseen()
returns int
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::int from public.inbox where recipient = auth.uid() and not seen;
$$;

create or replace function public.inbox_seen()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.inbox set seen = true where recipient = auth.uid() and not seen;
$$;

create or replace function public.inbox_delete(p_id bigint)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.inbox where id = p_id and recipient = auth.uid();
$$;

-- ---------- Reazioni ----------

create or replace function public.reaction_summary(p_kind text, p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'counts', (select coalesce(jsonb_object_agg(emoji, n), '{}') from (
      select emoji, count(*) as n from public.reactions where target_kind = p_kind and target_id = p_id group by emoji) c),
    'mine', (select emoji from public.reactions where target_kind = p_kind and target_id = p_id and reactor = auth.uid())
  );
$$;

-- Reazione (una per persona; null la toglie). Il proprietario la trova in "Per te".
create or replace function public.react(p_kind text, p_id uuid, p_emoji text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  owner_id uuid;
begin
  perform public.social_me();
  if p_kind = 'poll' then select owner into owner_id from public.polls where id = p_id;
  elsif p_kind = 'list' then select owner into owner_id from public.gift_lists where id = p_id;
  end if;
  if owner_id is null then raise exception 'non trovato'; end if;
  if owner_id = me then raise exception 'non puoi reagire alle tue cose'; end if;
  delete from public.inbox where recipient = owner_id and sender = me and kind = 'reazione' and ref_id = p_id;
  if p_emoji is null then
    delete from public.reactions where target_kind = p_kind and target_id = p_id and reactor = me;
  else
    if not (p_emoji = any (public.social_reaction_emojis())) then raise exception 'reazione non valida'; end if;
    insert into public.reactions (target_kind, target_id, reactor, emoji) values (p_kind, p_id, me, p_emoji)
    on conflict (target_kind, target_id, reactor) do update set emoji = excluded.emoji, created_at = now();
    if not exists (select 1 from public.blocks where blocker = owner_id and blocked = me) then
      insert into public.inbox (recipient, sender, kind, ref_id, emoji) values (owner_id, me, 'reazione', p_id, p_emoji);
    end if;
  end if;
  return public.reaction_summary(p_kind, p_id);
end;
$$;

create or replace function public.reactions_get(p_kind text, p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select public.reaction_summary(p_kind, p_id);
$$;

-- Attività di chi seguo (come prima, con le reazioni su sondaggi e liste).
create or replace function public.social_feed()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(e order by e ->> 'at' desc), '[]') from (
    select e from (
      select jsonb_build_object('kind', 'poll', 'id', o.id, 'product_ids', o.product_ids, 'at', o.created_at, 'who', public.social_card(p),
          'reactions', public.reaction_summary('poll', o.id)) as e
      from public.follows f join public.polls o on o.owner = f.followee join public.profiles p on p.user_id = o.owner
      where f.follower = auth.uid() and o.closes_at > now()
      union all
      select jsonb_build_object('kind', 'list', 'id', l.id, 'template', l.template, 'product_ids', l.product_ids, 'at', l.updated_at,
          'who', public.social_card(p), 'reactions', public.reaction_summary('list', l.id))
      from public.follows f join public.gift_lists l on l.owner = f.followee join public.profiles p on p.user_id = l.owner
      where f.follower = auth.uid() and l.updated_at > now() - interval '30 days'
      union all
      select jsonb_build_object('kind', 'saves', 'product_ids', s.ids, 'count', s.n, 'at', s.at, 'who', public.social_card(p))
      from public.follows f
      join public.profiles p on p.user_id = f.followee and p.share_saves
      join lateral (
        select (array_agg(x.id order by x.at desc))[1:6] as ids, count(*) as n, max(x.at) as at
        from (
          select w -> 'product' ->> 'id' as id, to_timestamp((w ->> 'savedAt')::double precision / 1000) as at
          from public.user_data u, jsonb_array_elements(u.wishlist) w
          where u.user_id = f.followee
        ) x
        where x.at > now() - interval '14 days'
      ) s on s.n > 0
      where f.follower = auth.uid()
    ) all_events
    order by e ->> 'at' desc
    limit 60
  ) t(e);
$$;

-- ---------- Match ----------

-- Preferiti degli amici (ultimi 500 a testa), solo se sia io sia loro mostriamo cosa salviamo.
create or replace function public.social_friend_saves()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'enabled', coalesce((select share_saves from public.profiles where user_id = auth.uid()), false),
    'saves', case when coalesce((select share_saves from public.profiles where user_id = auth.uid()), false) then (
      select coalesce(jsonb_agg(jsonb_build_object('product_id', s.id, 'who', s.who)), '[]') from (
        select x.id, jsonb_agg(distinct public.social_card(p)) as who
        from public.profiles p
        cross join lateral (
          select w -> 'product' ->> 'id' as id
          from public.user_data u, jsonb_array_elements(u.wishlist) w
          where u.user_id = p.user_id
          limit 500
        ) x
        where p.share_saves and public.social_are_friends(auth.uid(), p.user_id)
        group by x.id
      ) s) else '[]'::jsonb end
  );
$$;

-- ---------- Swipe insieme ----------

-- Invito un amico: stesso mazzo (da 4 a 12 prodotti) per tutti e due.
create or replace function public.swipe_create(p_code text, p_product_ids text[])
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  partner_id uuid;
  new_id uuid;
begin
  perform public.social_me();
  select user_id into partner_id from public.profiles where code = p_code;
  if not public.social_are_friends(me, partner_id) then raise exception 'puoi invitare solo i tuoi amici'; end if;
  if (select count(*) from public.swipe_sessions where creator = me and created_at > now() - interval '1 day') >= 20 then
    raise exception 'massimo 20 inviti al giorno';
  end if;
  insert into public.swipe_sessions (creator, partner, product_ids) values (me, partner_id, p_product_ids) returning id into new_id;
  insert into public.inbox (recipient, sender, kind, ref_id) values (partner_id, me, 'swipe', new_id);
  return new_id;
end;
$$;

create or replace function public.swipe_get(p_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  s public.swipe_sessions;
  me uuid := auth.uid();
  other uuid;
  mine jsonb;
  other_n int;
  done boolean;
begin
  select * into s from public.swipe_sessions where id = p_id;
  if not found or me is null or me not in (s.creator, s.partner) then return null; end if;
  other := case when me = s.creator then s.partner else s.creator end;
  select coalesce(jsonb_object_agg(product_id, yes), '{}') into mine from public.swipe_votes where session_id = s.id and user_id = me;
  select count(*) into other_n from public.swipe_votes where session_id = s.id and user_id = other;
  done := (select count(*) from jsonb_object_keys(mine)) >= cardinality(s.product_ids) and other_n >= cardinality(s.product_ids);
  return jsonb_build_object(
    'id', s.id, 'product_ids', s.product_ids, 'created_at', s.created_at, 'is_creator', me = s.creator,
    'other', (select public.social_card(p) from public.profiles p where p.user_id = other),
    'my_votes', mine, 'other_done', other_n >= cardinality(s.product_ids),
    -- I prodotti piaciuti a entrambi, solo quando tutti e due hanno finito.
    'matches', case when done then (
      select coalesce(jsonb_agg(a.product_id), '[]') from public.swipe_votes a join public.swipe_votes b
        on b.session_id = a.session_id and b.product_id = a.product_id and b.user_id = other and b.yes
      where a.session_id = s.id and a.user_id = me and a.yes) else null end
  );
end;
$$;

create or replace function public.swipe_vote(p_id uuid, p_product_id text, p_yes boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.swipe_sessions;
begin
  select * into s from public.swipe_sessions where id = p_id;
  if not found or auth.uid() not in (s.creator, s.partner) or not (p_product_id = any (s.product_ids)) then
    raise exception 'non trovato';
  end if;
  insert into public.swipe_votes (session_id, user_id, product_id, yes) values (p_id, auth.uid(), p_product_id, p_yes)
  on conflict (session_id, user_id, product_id) do update set yes = excluded.yes;
end;
$$;

create or replace function public.swipe_list()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', s.id, 'created_at', s.created_at, 'other', public.social_card(p),
      'my_done', (select count(*) from public.swipe_votes v where v.session_id = s.id and v.user_id = auth.uid()) >= cardinality(s.product_ids),
      'other_done', (select count(*) from public.swipe_votes v where v.session_id = s.id and v.user_id = p.user_id) >= cardinality(s.product_ids),
      'product_ids', s.product_ids)
    order by s.created_at desc), '[]')
  from public.swipe_sessions s
  join public.profiles p on p.user_id = case when s.creator = auth.uid() then s.partner else s.creator end
  where auth.uid() in (s.creator, s.partner) and s.created_at > now() - interval '30 days';
$$;

create or replace function public.swipe_delete(p_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.swipe_sessions where id = p_id and auth.uid() in (creator, partner);
$$;

-- Permessi: tutto solo con account.
do $$
declare
  f text;
begin
  foreach f in array array[
    'social_me()', 'social_update(boolean, text, boolean, int, int)', 'social_birthdays()',
    'inbox_send(text[], text, text, uuid)', 'inbox_list()', 'inbox_unseen()', 'inbox_seen()', 'inbox_delete(bigint)',
    'react(text, uuid, text)', 'reactions_get(text, uuid)', 'social_feed()', 'social_friend_saves()',
    'swipe_create(text, text[])', 'swipe_get(uuid)', 'swipe_vote(uuid, text, boolean)', 'swipe_list()', 'swipe_delete(uuid)'
  ] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
  revoke all on function public.reaction_summary(text, uuid) from public, anon, authenticated;
  revoke all on function public.social_cleanup_ref() from public, anon, authenticated;
end;
$$;
