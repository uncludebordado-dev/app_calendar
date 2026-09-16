-- =============================================================================
-- Notificaciones push al celular cuando se publica una News.
-- Mismo patrón que los emails: la tabla privada guarda el secreto, un trigger
-- avisa a una Edge Function nueva (send-news-push) que manda el push real.
-- =============================================================================

-- Para el puntito naranja de "hay novedades" en el nav.
alter table public.profiles add column if not exists news_last_seen_at timestamptz;

create table if not exists public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists push_subs_owner on public.push_subscriptions;
create policy push_subs_owner on public.push_subscriptions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- La Edge Function necesita leer todas las suscripciones: sólo service_role
-- (ya bypassea RLS), no hace falta policy extra para eso.

create or replace function public.dispatch_news_push()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, private
as $$
declare
  v_secret text;
begin
  select value into v_secret from private.app_secrets where key = 'news_push_secret';
  if v_secret is null or v_secret = '' then
    return new;
  end if;

  perform net.http_post(
    url := 'https://bviluyndglsfxggqyyjb.supabase.co/functions/v1/send-news-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-push-secret', v_secret,
      'apikey', 'sb_publishable_W9GJ5ue1gYQnIXH4NUZBfA_J5toTkt6',
      'Authorization', 'Bearer sb_publishable_W9GJ5ue1gYQnIXH4NUZBfA_J5toTkt6'
    ),
    body := jsonb_build_object(
      'post_id', new.id,
      'title',   new.title,
      'body',    new.body
    )
  );
  return new;
end;
$$;

drop trigger if exists news_posts_push on public.news_posts;
create trigger news_posts_push
  after insert on public.news_posts
  for each row execute function public.dispatch_news_push();
