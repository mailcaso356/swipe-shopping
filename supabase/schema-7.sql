-- Da incollare in Supabase: SQL Editor → New query → Run. Si può eseguire più volte. Serve schema-5.sql prima.
-- Babbo Natale segreto: un gruppo di amici, l'app estrae a chi fa il regalo ognuno.
--  • il gruppo ha solo opzioni prestabilite (tipo di gruppo, budget, data dello scambio): nessun testo libero
--  • ognuno vede solo a chi fa il regalo, mai chi lo fa a lui (nemmeno l'organizzatore)
--  • ognuno può scegliere una delle sue liste regalo da far vedere a chi lo pesca
--  • gli inviti e l'estrazione arrivano in "Per te"

create table if not exists public.santa_groups (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references public.profiles (user_id) on delete cascade,
  theme text not null check (theme in ('famiglia', 'amici', 'ufficio', 'classe', 'squadra', 'casa')),
  budget smallint check (budget in (10, 15, 20, 25, 30, 50, 100)),
  exchange_on date,
  drawn_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists santa_groups_owner on public.santa_groups (owner);

create table if not exists public.santa_members (
  group_id uuid not null references public.santa_groups (id) on delete cascade,
  user_id uuid not null references public.profiles (user_id) on delete cascade,
  gives_to uuid references public.profiles (user_id) on delete set null,
  list_id uuid references public.gift_lists (id) on delete set null,
  ready boolean not null default false,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
create index if not exists santa_members_user on public.santa_members (user_id);

alter table public.santa_groups enable row level security;
alter table public.santa_members enable row level security;

-- Nuovi tipi in "Per te": invito a un gruppo e estrazione fatta.
alter table public.inbox drop constraint if exists inbox_kind_check;
alter table public.inbox add constraint inbox_kind_check
  check (kind in ('consiglio', 'sondaggio', 'lista', 'swipe', 'reazione', 'segreto', 'estrazione'));

drop trigger if exists santa_groups_cleanup on public.santa_groups;
create trigger santa_groups_cleanup after delete on public.santa_groups for each row execute function public.social_cleanup_ref();

create or replace function public.santa_create(p_theme text, p_budget int, p_exchange_on date)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  new_id uuid;
begin
  perform public.social_me();
  if p_exchange_on is not null and (p_exchange_on < current_date or p_exchange_on > current_date + 400) then
    raise exception 'data non valida';
  end if;
  if (select count(*) from public.santa_groups where owner = me) >= 10 then
    raise exception 'hai già 10 gruppi: eliminane uno';
  end if;
  insert into public.santa_groups (owner, theme, budget, exchange_on) values (me, p_theme, p_budget, p_exchange_on) returning id into new_id;
  insert into public.santa_members (group_id, user_id) values (new_id, me);
  return new_id;
end;
$$;

create or replace function public.santa_get(p_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  g public.santa_groups;
  m public.santa_members;
  target public.profiles;
  l public.gift_lists;
begin
  select * into g from public.santa_groups where id = p_id;
  if not found then return null; end if;
  select * into m from public.santa_members where group_id = p_id and user_id = me;
  if m.gives_to is not null then
    select * into target from public.profiles where user_id = m.gives_to;
    select * into l from public.gift_lists gl where gl.id = (select list_id from public.santa_members where group_id = p_id and user_id = m.gives_to);
  end if;
  return jsonb_build_object(
    'id', g.id, 'theme', g.theme, 'budget', g.budget, 'exchange_on', g.exchange_on, 'drawn', g.drawn_at is not null,
    'is_owner', g.owner = me, 'is_member', m.user_id is not null,
    'owner', (select public.social_card(p) from public.profiles p where p.user_id = g.owner),
    -- Dopo l'estrazione qualcuno è uscito: l'organizzatore deve rifarla.
    'broken', g.drawn_at is not null and exists (select 1 from public.santa_members x where x.group_id = p_id and x.gives_to is null),
    'members', (select coalesce(jsonb_agg(public.social_card(p) || jsonb_build_object('is_me', x.user_id = me, 'ready', x.ready,
        'has_list', x.list_id is not null) order by x.joined_at), '[]')
      from public.santa_members x join public.profiles p on p.user_id = x.user_id where x.group_id = p_id),
    'my_list_id', m.list_id, 'my_ready', coalesce(m.ready, false),
    'gives_to', case when target.user_id is null then null else public.social_card(target) end,
    'gives_to_list', case when l.id is null then null else jsonb_build_object('id', l.id, 'template', l.template, 'product_ids', l.product_ids) end
  );
end;
$$;

create or replace function public.santa_list()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', g.id, 'theme', g.theme, 'budget', g.budget, 'exchange_on', g.exchange_on,
      'drawn', g.drawn_at is not null, 'is_owner', g.owner = auth.uid(),
      'members', (select count(*) from public.santa_members x where x.group_id = g.id),
      'gives_to', (select public.social_card(p) from public.profiles p where p.user_id = m.gives_to))
    order by g.created_at desc), '[]')
  from public.santa_members m join public.santa_groups g on g.id = m.group_id
  where m.user_id = auth.uid();
$$;

create or replace function public.santa_join(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  g public.santa_groups;
begin
  perform public.social_me();
  select * into g from public.santa_groups where id = p_id;
  if not found then raise exception 'gruppo non trovato'; end if;
  if exists (select 1 from public.santa_members where group_id = p_id and user_id = me) then return; end if;
  if g.drawn_at is not null then raise exception 'l''estrazione è già stata fatta'; end if;
  if exists (select 1 from public.blocks where blocker = g.owner and blocked = me) then raise exception 'gruppo non trovato'; end if;
  if (select count(*) from public.santa_members where group_id = p_id) >= 30 then raise exception 'il gruppo è pieno (massimo 30)'; end if;
  insert into public.santa_members (group_id, user_id) values (p_id, me);
end;
$$;

-- Esci da un gruppo (p_code null) o, se sei l'organizzatore, togli qualcuno. Solo prima dell'estrazione.
create or replace function public.santa_leave(p_id uuid, p_code text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  g public.santa_groups;
  who uuid;
begin
  select * into g from public.santa_groups where id = p_id;
  if not found then return; end if;
  if p_code is null then
    who := me;
  else
    if g.owner <> me then raise exception 'solo l''organizzatore può togliere qualcuno'; end if;
    select user_id into who from public.profiles where code = p_code;
  end if;
  if who = g.owner then raise exception 'l''organizzatore può solo eliminare il gruppo'; end if;
  if g.drawn_at is not null then raise exception 'dopo l''estrazione non si può più uscire'; end if;
  delete from public.santa_members where group_id = p_id and user_id = who;
end;
$$;

-- La mia lista da mostrare a chi mi pesca, e "ho preso il regalo".
create or replace function public.santa_set(p_id uuid, p_list_id uuid, p_ready boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_list_id is not null and not exists (select 1 from public.gift_lists where id = p_list_id and owner = auth.uid()) then
    raise exception 'lista non trovata';
  end if;
  update public.santa_members set list_id = p_list_id, ready = coalesce(p_ready, ready)
  where group_id = p_id and user_id = auth.uid();
end;
$$;

-- Estrazione (anche di nuovo): un unico giro a caso, così nessuno pesca sé stesso.
create or replace function public.santa_draw(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  ids uuid[];
  n int;
begin
  if not exists (select 1 from public.santa_groups where id = p_id and owner = me) then raise exception 'gruppo non trovato'; end if;
  select array_agg(user_id order by random()) into ids from public.santa_members where group_id = p_id;
  n := coalesce(cardinality(ids), 0);
  if n < 3 then raise exception 'servono almeno 3 persone'; end if;
  for i in 1..n loop
    update public.santa_members set gives_to = ids[i % n + 1], ready = false where group_id = p_id and user_id = ids[i];
  end loop;
  update public.santa_groups set drawn_at = now() where id = p_id;
  delete from public.inbox where ref_id = p_id and kind = 'estrazione';
  insert into public.inbox (recipient, sender, kind, ref_id)
    select user_id, me, 'estrazione', p_id from public.santa_members where group_id = p_id and user_id <> me;
end;
$$;

-- Invita amici nel gruppo (chiunque ne faccia parte, prima dell'estrazione).
create or replace function public.santa_invite(p_id uuid, p_codes text[])
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
  if not exists (select 1 from public.santa_members where group_id = p_id and user_id = me) then raise exception 'gruppo non trovato'; end if;
  if (select drawn_at from public.santa_groups where id = p_id) is not null then raise exception 'l''estrazione è già stata fatta'; end if;
  if cardinality(p_codes) > 50 then raise exception 'troppi amici insieme'; end if;
  if (select count(*) from public.inbox where sender = me and created_at > now() - interval '1 day') + cardinality(p_codes) > 200 then
    raise exception 'hai mandato troppe cose oggi, riprova domani';
  end if;
  for r in select * from public.profiles where code = any (p_codes) loop
    if public.social_are_friends(me, r.user_id)
      and not exists (select 1 from public.santa_members where group_id = p_id and user_id = r.user_id) then
      delete from public.inbox where recipient = r.user_id and kind = 'segreto' and ref_id = p_id;
      insert into public.inbox (recipient, sender, kind, ref_id) values (r.user_id, me, 'segreto', p_id);
      sent := sent + 1;
    end if;
  end loop;
  return sent;
end;
$$;

create or replace function public.santa_delete(p_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.santa_groups where id = p_id and owner = auth.uid();
$$;

do $$
declare
  f text;
begin
  foreach f in array array[
    'santa_create(text, int, date)', 'santa_get(uuid)', 'santa_list()', 'santa_join(uuid)', 'santa_leave(uuid, text)',
    'santa_set(uuid, uuid, boolean)', 'santa_draw(uuid)', 'santa_invite(uuid, text[])', 'santa_delete(uuid)'
  ] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end;
$$;
