-- =============================================================================
-- 1) "News": la sala de chat pasa a ser un tablón de noticias.
--    - Sólo la admin publica.
--    - Las alumnas sólo reaccionan con un emoji (like / feliz / risa / triste).
-- 2) admin_student_detail(): ficha de una alumna (asistencias del año, total
--    pagado histórico, cumpleaños).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- news_posts
-- -----------------------------------------------------------------------------
create table if not exists public.news_posts (
  id         bigint generated always as identity primary key,
  author_id  uuid        not null references public.profiles (id) on delete cascade,
  title      text        not null check (char_length(title) between 1 and 160),
  body       text        not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index if not exists news_posts_created_idx on public.news_posts (created_at desc);
alter table public.news_posts enable row level security;

drop policy if exists news_posts_select on public.news_posts;
create policy news_posts_select on public.news_posts
  for select using (auth.uid() is not null);

drop policy if exists news_posts_admin_write on public.news_posts;
create policy news_posts_admin_write on public.news_posts
  for all using (public.is_admin()) with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- news_reactions  (una por persona por post)
-- -----------------------------------------------------------------------------
create table if not exists public.news_reactions (
  post_id    bigint      not null references public.news_posts (id) on delete cascade,
  user_id    uuid        not null references public.profiles (id) on delete cascade,
  emoji      text        not null check (emoji in ('like', 'feliz', 'risa', 'triste')),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
alter table public.news_reactions enable row level security;

drop policy if exists news_reactions_select on public.news_reactions;
create policy news_reactions_select on public.news_reactions
  for select using (auth.uid() is not null);

drop policy if exists news_reactions_write_own on public.news_reactions;
create policy news_reactions_write_own on public.news_reactions
  for all
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.profiles p
                where p.id = auth.uid() and p.full_name <> '' and p.phone_e164 <> '')
  );

-- Realtime
do $$
begin
  if not exists (select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'news_posts') then
    alter publication supabase_realtime add table public.news_posts;
  end if;
  if not exists (select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'news_reactions') then
    alter publication supabase_realtime add table public.news_reactions;
  end if;
end $$;

-- Feed: post + conteo por emoji + mi reacción.
drop function if exists public.news_feed(integer);
create or replace function public.news_feed(p_limit integer default 50)
returns table (
  id           bigint,
  title        text,
  body         text,
  created_at   timestamptz,
  author_name  text,
  author_avatar text,
  reactions    jsonb,
  my_reaction  text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    n.id, n.title, n.body, n.created_at,
    p.full_name, p.avatar_url,
    jsonb_build_object(
      'like',   count(*) filter (where r.emoji = 'like'),
      'feliz',  count(*) filter (where r.emoji = 'feliz'),
      'risa',   count(*) filter (where r.emoji = 'risa'),
      'triste', count(*) filter (where r.emoji = 'triste')
    ),
    max(r.emoji) filter (where r.user_id = auth.uid())
  from public.news_posts n
  join public.profiles p on p.id = n.author_id
  left join public.news_reactions r on r.post_id = n.id
  where auth.uid() is not null
  group by n.id, p.full_name, p.avatar_url
  order by n.created_at desc
  limit greatest(1, least(p_limit, 200));
$$;
grant execute on function public.news_feed(integer) to authenticated;

-- -----------------------------------------------------------------------------
-- admin_student_detail()  — ficha de una alumna
-- -----------------------------------------------------------------------------
drop function if exists public.admin_student_detail(uuid);
create or replace function public.admin_student_detail(p_user_id uuid)
returns table (
  full_name      text,
  email          text,
  phone_e164     text,
  birth_date     date,
  registered_on  date,
  strikes        smallint,
  blocked        boolean,
  avatar_url     text,
  total_paid     numeric,
  payments_count bigint,
  attended       jsonb,   -- asistencias del año en curso
  payments       jsonb    -- histórico de pagos
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_year int := extract(year from (now() at time zone 'Europe/Madrid'))::int;
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = 'P0001';
  end if;

  return query
  select
    p.full_name, u.email::text, p.phone_e164, p.birth_date,
    p.created_at::date, p.strikes, p.blocked, p.avatar_url,
    coalesce((select sum(amount) from public.payments where user_id = p_user_id), 0),
    (select count(*) from public.payments where user_id = p_user_id),
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'class_date', to_char(s.class_date, 'YYYY-MM-DD'),
        'start_time', to_char(s.start_time, 'HH24:MI'),
        'end_time',   to_char(s.end_time, 'HH24:MI'),
        'notes',      s.notes
      ) order by s.class_date, s.start_time)
      from public.bookings b
      join public.availability_slots s on s.id = b.slot_id
      where b.user_id = p_user_id
        and b.attended is true
        and extract(year from s.class_date)::int = v_year
    ), '[]'::jsonb),
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',       pm.id,
        'paid_on',  to_char(pm.paid_on, 'YYYY-MM-DD'),
        'amount',   pm.amount,
        'method',   pm.method,
        'note',     pm.note
      ) order by pm.paid_on desc, pm.created_at desc)
      from public.payments pm
      where pm.user_id = p_user_id
    ), '[]'::jsonb)
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.id = p_user_id and p.role = 'alumna';
end;
$$;
grant execute on function public.admin_student_detail(uuid) to authenticated;
