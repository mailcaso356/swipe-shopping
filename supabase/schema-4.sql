-- Da incollare in Supabase: SQL Editor → New query → Run. Si può eseguire più volte.
-- Parte social: profili, amici (seguire), liste regalo e sondaggi "Aiutami a scegliere".
-- Solo azioni prestabilite: niente testo libero scritto dagli utenti. Il nome utente è generato,
-- avatar e tipo di lista si scelgono da elenchi fissi. Le tabelle non hanno policy: si usano solo
-- con le funzioni qui sotto, che controllano chi può fare cosa.

-- Prodotti indicati come "negozio:codice" (es. amazon:B0ABC12345), come nel catalogo.
create or replace function public.social_valid_products(ids text[], min_n int, max_n int)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(cardinality(ids), 0) between min_n and max_n
    and not exists (select 1 from unnest(ids) as id where id !~ '^[a-z0-9_-]{2,20}:[A-Za-z0-9._-]{1,60}$')
    and cardinality(ids) = (select count(distinct id) from unnest(ids) as id);
$$;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  handle text not null unique,
  avatar text not null,
  -- Codice del link di invito (#/u/<code>): chi lo ha può seguire.
  code text not null unique,
  -- Gli amici vedono cosa salvo nei preferiti (spento di base).
  share_saves boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.follows (
  follower uuid not null references public.profiles (user_id) on delete cascade,
  followee uuid not null references public.profiles (user_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower, followee),
  check (follower <> followee)
);
create index if not exists follows_followee on public.follows (followee);

create table if not exists public.blocks (
  blocker uuid not null references public.profiles (user_id) on delete cascade,
  blocked uuid not null references public.profiles (user_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker, blocked)
);

create table if not exists public.gift_lists (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references public.profiles (user_id) on delete cascade,
  template text not null check (template in ('compleanno', 'natale', 'laurea', 'matrimonio', 'casa_nuova', 'idee_regalo', 'desideri')),
  product_ids text[] not null check (public.social_valid_products(product_ids, 1, 60)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists gift_lists_owner on public.gift_lists (owner);

-- "Lo prendo io": il proprietario della lista non lo vede, così il regalo resta una sorpresa.
create table if not exists public.gift_claims (
  list_id uuid not null references public.gift_lists (id) on delete cascade,
  product_id text not null,
  claimer uuid not null references public.profiles (user_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (list_id, product_id)
);

create table if not exists public.polls (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references public.profiles (user_id) on delete cascade,
  product_ids text[] not null check (public.social_valid_products(product_ids, 2, 5)),
  created_at timestamptz not null default now(),
  closes_at timestamptz not null default now() + interval '7 days'
);
create index if not exists polls_owner on public.polls (owner);

-- Voto sì/no su ogni prodotto. Votano anche gli amici senza account (voter = "anon:<id del telefono>").
create table if not exists public.poll_votes (
  poll_id uuid not null references public.polls (id) on delete cascade,
  voter text not null check (length(voter) <= 60),
  product_id text not null,
  yes boolean not null,
  created_at timestamptz not null default now(),
  primary key (poll_id, voter, product_id)
);

alter table public.profiles enable row level security;
alter table public.follows enable row level security;
alter table public.blocks enable row level security;
alter table public.gift_lists enable row level security;
alter table public.gift_claims enable row level security;
alter table public.polls enable row level security;
alter table public.poll_votes enable row level security;

-- ---------- Profilo ----------

-- Nome generato tipo "Volpe Rosa 482" (animale, colore, numero); l'avatar parte dall'animale.
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
    exit when not exists (select 1 from public.profiles p where p.handle = social_new_handle.handle);
  end loop;
end;
$$;
revoke all on function public.social_new_handle() from public, anon, authenticated;

create or replace function public.social_avatars()
returns text[]
language sql
immutable
set search_path = ''
as $$
  select array['🦊','🐼','🐨','🐯','🦁','🐸','🐵','🐧','🦄','🐙','🐝','🦋','🐢','🐬','🦉','🐰','🐱','🐶','🦔','🦦','🦩','🐳','🐺','🐻','🐹','🐥'];
$$;

create or replace function public.social_card(p public.profiles)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object('handle', p.handle, 'avatar', p.avatar, 'code', p.code);
$$;

-- Il mio profilo social (lo crea al primo uso).
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
    'followers', (select count(*) from public.follows where followee = me.user_id),
    'following', (select count(*) from public.follows where follower = me.user_id)
  );
end;
$$;

-- Nuovo nome, nuovo avatar (dall'elenco) o la scelta "mostra cosa salvo".
create or replace function public.social_update(regenerate boolean default false, new_avatar text default null, new_share_saves boolean default null)
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
  return public.social_me();
end;
$$;

-- ---------- Amici ----------

create or replace function public.social_by_code(p_code text)
returns public.profiles
language sql
stable
security definer
set search_path = ''
as $$
  select * from public.profiles where code = p_code;
$$;
revoke all on function public.social_by_code(text) from public, anon, authenticated;

-- Profilo di un amico (dal link #/u/<code>). Liste e sondaggi solo per chi lo segue.
create or replace function public.social_profile(p_code text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  p public.profiles;
  me uuid := auth.uid();
  is_me boolean;
  following boolean;
begin
  p := public.social_by_code(p_code);
  if p.user_id is null then return null; end if;
  if me is not null and exists (select 1 from public.blocks where blocker = p.user_id and blocked = me) then return null; end if;
  is_me := p.user_id = me;
  following := me is not null and exists (select 1 from public.follows where follower = me and followee = p.user_id);
  return public.social_card(p) || jsonb_build_object(
    'is_me', coalesce(is_me, false),
    'following', following,
    'follows_me', me is not null and exists (select 1 from public.follows where follower = p.user_id and followee = me),
    'followers', (select count(*) from public.follows where followee = p.user_id),
    'lists', case when is_me or following then (
      select coalesce(jsonb_agg(jsonb_build_object('id', l.id, 'template', l.template, 'product_ids', l.product_ids) order by l.updated_at desc), '[]')
      from public.gift_lists l where l.owner = p.user_id) else '[]' end,
    'polls', case when is_me or following then (
      select coalesce(jsonb_agg(jsonb_build_object('id', o.id, 'product_ids', o.product_ids, 'closes_at', o.closes_at) order by o.created_at desc), '[]')
      from public.polls o where o.owner = p.user_id and o.closes_at > now()) else '[]' end
  );
end;
$$;

create or replace function public.social_follow(p_code text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.profiles;
begin
  perform public.social_me();
  p := public.social_by_code(p_code);
  if p.user_id is null or p.user_id = auth.uid() then raise exception 'profilo non trovato'; end if;
  if exists (select 1 from public.blocks where blocker = p.user_id and blocked = auth.uid()) then raise exception 'profilo non trovato'; end if;
  if (select count(*) from public.follows where follower = auth.uid()) >= 500 then raise exception 'troppi amici'; end if;
  insert into public.follows (follower, followee) values (auth.uid(), p.user_id) on conflict do nothing;
end;
$$;

-- action: 'unfollow' (smetto di seguire), 'remove' (tolgo un mio follower), 'block' (lo tolgo e non può più seguirmi)
create or replace function public.social_unfriend(p_code text, action text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.profiles;
begin
  if auth.uid() is null then raise exception 'accesso richiesto'; end if;
  p := public.social_by_code(p_code);
  if p.user_id is null then return; end if;
  if action = 'unfollow' then
    delete from public.follows where follower = auth.uid() and followee = p.user_id;
  elsif action = 'remove' then
    delete from public.follows where follower = p.user_id and followee = auth.uid();
  elsif action = 'block' then
    delete from public.follows where (follower = p.user_id and followee = auth.uid()) or (follower = auth.uid() and followee = p.user_id);
    insert into public.blocks (blocker, blocked) values (auth.uid(), p.user_id) on conflict do nothing;
  else
    raise exception 'azione non valida';
  end if;
end;
$$;

create or replace function public.social_friends()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'following', (select coalesce(jsonb_agg(public.social_card(p) order by f.created_at desc), '[]')
      from public.follows f join public.profiles p on p.user_id = f.followee where f.follower = auth.uid()),
    'followers', (select coalesce(jsonb_agg(public.social_card(p) order by f.created_at desc), '[]')
      from public.follows f join public.profiles p on p.user_id = f.follower where f.followee = auth.uid())
  );
$$;

-- Attività di chi seguo: sondaggi aperti, liste regalo, preferiti salvati (se lo permettono).
create or replace function public.social_feed()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(e order by e ->> 'at' desc), '[]') from (
    select e from (
      select jsonb_build_object('kind', 'poll', 'id', o.id, 'product_ids', o.product_ids, 'at', o.created_at, 'who', public.social_card(p)) as e
      from public.follows f join public.polls o on o.owner = f.followee join public.profiles p on p.user_id = o.owner
      where f.follower = auth.uid() and o.closes_at > now()
      union all
      select jsonb_build_object('kind', 'list', 'id', l.id, 'template', l.template, 'product_ids', l.product_ids, 'at', l.updated_at, 'who', public.social_card(p))
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

-- ---------- Liste regalo ----------

-- Crea (p_id nullo) o aggiorna una mia lista. Ritorna l'id.
create or replace function public.gift_list_save(p_id uuid, p_template text, p_product_ids text[])
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_id uuid;
begin
  perform public.social_me();
  if p_id is null then
    if (select count(*) from public.gift_lists where owner = auth.uid()) >= 20 then raise exception 'massimo 20 liste'; end if;
    insert into public.gift_lists (owner, template, product_ids) values (auth.uid(), p_template, p_product_ids) returning id into new_id;
    return new_id;
  end if;
  update public.gift_lists set template = p_template, product_ids = p_product_ids, updated_at = now()
  where id = p_id and owner = auth.uid() returning id into new_id;
  if new_id is null then raise exception 'lista non trovata'; end if;
  -- Prenotazioni di prodotti tolti dalla lista: non servono più.
  delete from public.gift_claims where list_id = p_id and not (product_id = any (p_product_ids));
  return new_id;
end;
$$;

create or replace function public.gift_list_delete(p_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.gift_lists where id = p_id and owner = auth.uid();
$$;

-- Chi ha il link vede la lista; le prenotazioni le vedono tutti tranne il proprietario.
create or replace function public.gift_list_get(p_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  l public.gift_lists;
  p public.profiles;
  is_owner boolean;
begin
  select * into l from public.gift_lists where id = p_id;
  if not found then return null; end if;
  select * into p from public.profiles where user_id = l.owner;
  is_owner := l.owner = auth.uid();
  return jsonb_build_object(
    'id', l.id, 'template', l.template, 'product_ids', l.product_ids, 'updated_at', l.updated_at,
    'owner', public.social_card(p), 'is_owner', coalesce(is_owner, false),
    'claims', case when coalesce(is_owner, false) then '[]'::jsonb else (
      select coalesce(jsonb_agg(jsonb_build_object('product_id', c.product_id, 'mine', c.claimer = auth.uid())), '[]')
      from public.gift_claims c where c.list_id = l.id) end
  );
end;
$$;

create or replace function public.gift_list_claim(p_id uuid, p_product_id text, p_claim boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  l public.gift_lists;
begin
  perform public.social_me();
  select * into l from public.gift_lists where id = p_id;
  if not found or not (p_product_id = any (l.product_ids)) then raise exception 'prodotto non trovato'; end if;
  if l.owner = auth.uid() then raise exception 'non puoi prenotare dalla tua lista'; end if;
  if p_claim then
    insert into public.gift_claims (list_id, product_id, claimer) values (p_id, p_product_id, auth.uid()) on conflict do nothing;
    if not exists (select 1 from public.gift_claims where list_id = p_id and product_id = p_product_id and claimer = auth.uid()) then
      raise exception 'già preso da un altro amico';
    end if;
  else
    delete from public.gift_claims where list_id = p_id and product_id = p_product_id and claimer = auth.uid();
  end if;
end;
$$;

-- ---------- Sondaggi "Aiutami a scegliere" ----------

create or replace function public.poll_create(p_product_ids text[])
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_id uuid;
begin
  perform public.social_me();
  if (select count(*) from public.polls where owner = auth.uid() and created_at > now() - interval '1 day') >= 10 then
    raise exception 'massimo 10 sondaggi al giorno';
  end if;
  insert into public.polls (owner, product_ids) values (auth.uid(), p_product_ids) returning id into new_id;
  return new_id;
end;
$$;

create or replace function public.poll_delete(p_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.polls where id = p_id and owner = auth.uid();
$$;

create or replace function public.poll_voter(p_voter text)
returns text
language plpgsql
stable
set search_path = ''
as $$
begin
  if auth.uid() is not null then return 'user:' || auth.uid(); end if;
  if p_voter ~ '^anon:[0-9a-f-]{36}$' then return p_voter; end if;
  raise exception 'votante non valido';
end;
$$;

-- Chi ha il link vede il sondaggio; i risultati dopo aver votato tutto (o a sondaggio chiuso, o se è suo).
create or replace function public.poll_get(p_id uuid, p_voter text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  o public.polls;
  p public.profiles;
  v text := public.poll_voter(p_voter);
  is_owner boolean;
  mine jsonb;
  reveal boolean;
begin
  select * into o from public.polls where id = p_id;
  if not found then return null; end if;
  select * into p from public.profiles where user_id = o.owner;
  is_owner := coalesce(o.owner = auth.uid(), false);
  select coalesce(jsonb_object_agg(product_id, yes), '{}') into mine from public.poll_votes where poll_id = o.id and voter = v;
  reveal := is_owner or o.closes_at <= now() or (select count(*) from jsonb_object_keys(mine)) >= cardinality(o.product_ids);
  return jsonb_build_object(
    'id', o.id, 'product_ids', o.product_ids, 'closes_at', o.closes_at, 'closed', o.closes_at <= now(),
    'owner', public.social_card(p), 'is_owner', is_owner, 'my_votes', mine,
    'voters', (select count(distinct voter) from public.poll_votes where poll_id = o.id),
    'results', case when reveal then (
      select coalesce(jsonb_agg(jsonb_build_object('product_id', id,
        'yes', (select count(*) from public.poll_votes x where x.poll_id = o.id and x.product_id = id and x.yes),
        'no', (select count(*) from public.poll_votes x where x.poll_id = o.id and x.product_id = id and not x.yes))), '[]')
      from unnest(o.product_ids) as id) else null end
  );
end;
$$;

create or replace function public.poll_vote(p_id uuid, p_voter text, p_product_id text, p_yes boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  o public.polls;
  v text := public.poll_voter(p_voter);
begin
  select * into o from public.polls where id = p_id;
  if not found or not (p_product_id = any (o.product_ids)) then raise exception 'sondaggio non trovato'; end if;
  if o.closes_at <= now() then raise exception 'sondaggio chiuso'; end if;
  if o.owner = auth.uid() then raise exception 'non puoi votare il tuo sondaggio'; end if;
  if (select count(*) from public.poll_votes where poll_id = p_id) >= 5000 then raise exception 'troppi voti'; end if;
  insert into public.poll_votes (poll_id, voter, product_id, yes) values (p_id, v, p_product_id, p_yes)
  on conflict (poll_id, voter, product_id) do update set yes = excluded.yes, created_at = now();
end;
$$;

-- Le mie liste e i miei sondaggi (con i risultati).
create or replace function public.social_mine()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'lists', (select coalesce(jsonb_agg(jsonb_build_object('id', l.id, 'template', l.template, 'product_ids', l.product_ids) order by l.updated_at desc), '[]')
      from public.gift_lists l where l.owner = auth.uid()),
    'polls', (select coalesce(jsonb_agg(jsonb_build_object('id', o.id, 'product_ids', o.product_ids, 'closes_at', o.closes_at,
        'closed', o.closes_at <= now(),
        'voters', (select count(distinct voter) from public.poll_votes x where x.poll_id = o.id)) order by o.created_at desc), '[]')
      from public.polls o where o.owner = auth.uid() and o.created_at > now() - interval '60 days')
  );
$$;

-- Permessi: le funzioni "pubbliche" (vedere un profilo, una lista, un sondaggio, votare) anche senza account.
do $$
declare
  f text;
begin
  foreach f in array array[
    'social_me()', 'social_update(boolean, text, boolean)', 'social_follow(text)', 'social_unfriend(text, text)',
    'social_friends()', 'social_feed()', 'social_mine()', 'gift_list_save(uuid, text, text[])', 'gift_list_delete(uuid)',
    'gift_list_claim(uuid, text, boolean)', 'poll_create(text[])', 'poll_delete(uuid)'
  ] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
  foreach f in array array['social_profile(text)', 'gift_list_get(uuid)', 'poll_get(uuid, text)', 'poll_vote(uuid, text, text, boolean)'] loop
    execute format('revoke all on function public.%s from public', f);
    execute format('grant execute on function public.%s to anon, authenticated', f);
  end loop;
end;
$$;
