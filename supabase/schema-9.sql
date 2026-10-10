-- Da incollare in Supabase: SQL Editor → New query → Run. Si può eseguire più volte. Serve schema-5.sql prima.
-- "Di tendenza tra i tuoi amici": i prodotti salvati da più amici negli ultimi 7 giorni, senza dire chi.
-- Contano solo gli amici che hanno scelto di mostrare i preferiti (share_saves).

create or replace function public.social_trending()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object('product_id', t.id, 'friends', t.n) order by t.n desc, t.at desc), '[]')
  from (
    select x.id, count(distinct p.user_id) as n, max(x.at) as at
    from public.profiles p
    cross join lateral (
      select w -> 'product' ->> 'id' as id, to_timestamp((w ->> 'savedAt')::double precision / 1000) as at
      from public.user_data u, jsonb_array_elements(u.wishlist) w
      where u.user_id = p.user_id
    ) x
    where p.share_saves and p.user_id <> auth.uid() and public.social_are_friends(auth.uid(), p.user_id)
      and x.id is not null and x.at > now() - interval '7 days'
    group by x.id
    order by n desc, at desc
    limit 12
  ) t;
$$;
revoke all on function public.social_trending() from public, anon;
grant execute on function public.social_trending() to authenticated;
