-- Da incollare in Supabase: SQL Editor → New query → Run. Si può eseguire più volte. Serve schema-4.sql prima.
-- Tag @ per cercare gli amici: ricavato in automatico dal nome generato ("Volpe Rosa 482" → @volperosa482),
-- quindi unico e mai scelto a mano. Se si genera un altro nome cambia anche il tag. Il link di invito resta.

alter table public.profiles add column if not exists tag text generated always as (lower(replace(handle, ' ', ''))) stored;
create unique index if not exists profiles_tag on public.profiles (tag);

-- Nome nuovo: unico anche come tag.
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
    exit when not exists (select 1 from public.profiles p where p.tag = lower(replace(social_new_handle.handle, ' ', '')));
  end loop;
end;
$$;
revoke all on function public.social_new_handle() from public, anon, authenticated;

create or replace function public.social_card(p public.profiles)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object('handle', p.handle, 'avatar', p.avatar, 'code', p.code, 'tag', p.tag);
$$;

-- Cerca per tag (esatto: "@volperosa482", "volperosa482" o "Volpe Rosa 482"). Ritorna il codice del profilo.
create or replace function public.social_find(p_tag text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select p.code from public.profiles p
  where p.tag = lower(regexp_replace(p_tag, '^\s*@|\s', '', 'g'))
    and not exists (select 1 from public.blocks b where b.blocker = p.user_id and b.blocked = auth.uid());
$$;
revoke all on function public.social_find(text) from public, anon;
grant execute on function public.social_find(text) to authenticated;
