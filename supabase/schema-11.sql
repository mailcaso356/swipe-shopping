-- Da incollare in Supabase: SQL Editor → New query → Run. Si può eseguire più volte. Serve schema-5.sql prima.
-- Chat con gli amici: una conversazione per amico dove si mandano SOLO prodotti (e sondaggi / inviti a
-- Swipe insieme). Nessun testo scritto: a un prodotto ricevuto si può rispondere solo con un'emoji fissa.
-- I messaggi sono le righe di inbox già esistenti (inbox_send), viste come conversazione tra due persone.

alter table public.inbox add column if not exists reply_emoji text check (reply_emoji in ('❤️', '🔥', '😍', '😂', '💸'));
create index if not exists inbox_pair on public.inbox (sender, recipient, created_at desc);

-- "Per te" segna come viste solo le sue novità: i prodotti in chat si segnano aprendo la chat.
create or replace function public.inbox_seen()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.inbox set seen = true where recipient = auth.uid() and not seen and kind <> 'consiglio';
$$;

-- Elenco chat: tutti gli amici, prima quelli con messaggi recenti.
create or replace function public.chat_list()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with friends as (
    select distinct case when f.follower = auth.uid() then f.followee else f.follower end as uid
    from public.follows f
    where auth.uid() in (f.follower, f.followee)
  )
  select coalesce(jsonb_agg(jsonb_build_object('who', public.social_card(p), 'last_at', l.created_at, 'last_kind', l.kind,
      'last_from_me', l.sender = auth.uid(), 'unread', coalesce(u.n, 0))
    order by l.created_at desc nulls last, p.handle), '[]')
  from friends fr
  join public.profiles p on p.user_id = fr.uid
  left join lateral (
    select i.kind, i.sender, i.created_at from public.inbox i
    where i.kind in ('consiglio', 'sondaggio', 'swipe')
      and ((i.sender = auth.uid() and i.recipient = fr.uid) or (i.sender = fr.uid and i.recipient = auth.uid()))
    order by i.created_at desc limit 1
  ) l on true
  left join lateral (
    select count(*) as n from public.inbox i
    where i.sender = fr.uid and i.recipient = auth.uid() and i.kind = 'consiglio' and not i.seen
  ) u on true
  where public.social_are_friends(auth.uid(), fr.uid);
$$;

-- Una conversazione (ultimi 100 messaggi, dal più vecchio).
create or replace function public.chat_get(p_code text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  other public.profiles;
begin
  select * into other from public.profiles where code = p_code;
  if not found or not public.social_are_friends(auth.uid(), other.user_id) then return null; end if;
  return jsonb_build_object(
    'who', public.social_card(other),
    'messages', (select coalesce(jsonb_agg(m order by m ->> 'at'), '[]') from (
      select jsonb_build_object('id', i.id, 'kind', i.kind, 'from_me', i.sender = auth.uid(), 'product_id', i.product_id,
          'ref_id', i.ref_id, 'product_ids', coalesce(o.product_ids, s.product_ids), 'reply_emoji', i.reply_emoji,
          'at', i.created_at, 'seen', i.seen) as m
      from public.inbox i
      left join public.polls o on o.id = i.ref_id
      left join public.swipe_sessions s on s.id = i.ref_id
      where i.kind in ('consiglio', 'sondaggio', 'swipe')
        and ((i.sender = auth.uid() and i.recipient = other.user_id) or (i.sender = other.user_id and i.recipient = auth.uid()))
      order by i.created_at desc
      limit 100
    ) t)
  );
end;
$$;

create or replace function public.chat_seen(p_code text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.inbox set seen = true
  where recipient = auth.uid() and not seen and sender = (select user_id from public.profiles where code = p_code);
$$;

-- Risposta con un'emoji a un messaggio ricevuto (null la toglie).
create or replace function public.chat_react(p_id bigint, p_emoji text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.inbox set reply_emoji = p_emoji where id = p_id and recipient = auth.uid();
$$;

do $$
declare
  f text;
begin
  foreach f in array array['inbox_seen()', 'chat_list()', 'chat_get(text)', 'chat_seen(text)', 'chat_react(bigint, text)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end;
$$;
