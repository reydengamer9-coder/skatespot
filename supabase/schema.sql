-- SkateSpot: esquema de base de datos para Supabase
-- Ejecuta este archivo completo en el SQL Editor de tu proyecto de Supabase.

create extension if not exists postgis;

-- ─────────────────────────────────────────────
-- Perfiles (1:1 con auth.users)
-- ─────────────────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique not null check (char_length(username) between 3 and 30),
  bio text default '',
  avatar_url text,
  created_at timestamptz not null default now()
);

-- Crea el perfil automáticamente al registrarse
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'username', 'skater_' || substr(new.id::text, 1, 8))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────
-- Skateparks
-- ─────────────────────────────────────────────
create table public.skateparks (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text default '',
  address text default '',
  lat double precision not null,
  lng double precision not null,
  location geography(point, 4326)
    generated always as (st_setsrid(st_makepoint(lng, lat), 4326)::geography) stored,
  photo_url text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index skateparks_location_idx on public.skateparks using gist (location);

-- Skateparks dentro de un radio (km), ordenados por distancia
create function public.nearby_skateparks(user_lat double precision, user_lng double precision, radius_km double precision default 25)
returns table (
  id uuid,
  name text,
  description text,
  address text,
  lat double precision,
  lng double precision,
  photo_url text,
  distance_km double precision
)
language sql stable
as $$
  select
    s.id, s.name, s.description, s.address, s.lat, s.lng, s.photo_url,
    st_distance(s.location, st_setsrid(st_makepoint(user_lng, user_lat), 4326)::geography) / 1000 as distance_km
  from public.skateparks s
  where st_dwithin(s.location, st_setsrid(st_makepoint(user_lng, user_lat), 4326)::geography, radius_km * 1000)
  order by distance_km
  limit 100;
$$;

-- ─────────────────────────────────────────────
-- Chat: un canal por skatepark + canal general (park_id null)
-- ─────────────────────────────────────────────
create table public.messages (
  id bigint generated always as identity primary key,
  park_id uuid references public.skateparks (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  content text not null check (char_length(content) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index messages_park_idx on public.messages (park_id, created_at desc);

-- ─────────────────────────────────────────────
-- Encuentros (meetups) y asistentes
-- ─────────────────────────────────────────────
create table public.meetups (
  id uuid primary key default gen_random_uuid(),
  park_id uuid not null references public.skateparks (id) on delete cascade,
  title text not null,
  description text default '',
  starts_at timestamptz not null,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index meetups_starts_idx on public.meetups (starts_at);

create table public.meetup_attendees (
  meetup_id uuid references public.meetups (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (meetup_id, user_id)
);

-- ─────────────────────────────────────────────
-- Publicaciones de trucos (imagen o video) y likes
-- ─────────────────────────────────────────────
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  park_id uuid references public.skateparks (id) on delete set null,
  caption text default '',
  media_url text not null,
  media_type text not null check (media_type in ('image', 'video')),
  created_at timestamptz not null default now()
);

create index posts_created_idx on public.posts (created_at desc);

create table public.post_likes (
  post_id uuid references public.posts (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

-- ─────────────────────────────────────────────
-- Row Level Security
-- Lectura pública para usuarios autenticados; escritura solo sobre lo propio.
-- ─────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.skateparks enable row level security;
alter table public.messages enable row level security;
alter table public.meetups enable row level security;
alter table public.meetup_attendees enable row level security;
alter table public.posts enable row level security;
alter table public.post_likes enable row level security;

create policy "read profiles" on public.profiles for select to authenticated using (true);
create policy "update own profile" on public.profiles for update to authenticated using (id = auth.uid());

create policy "read parks" on public.skateparks for select to authenticated using (true);
create policy "add parks" on public.skateparks for insert to authenticated with check (created_by = auth.uid());
create policy "edit own parks" on public.skateparks for update to authenticated using (created_by = auth.uid());

create policy "read messages" on public.messages for select to authenticated using (true);
create policy "send messages" on public.messages for insert to authenticated with check (user_id = auth.uid());
create policy "delete own messages" on public.messages for delete to authenticated using (user_id = auth.uid());

create policy "read meetups" on public.meetups for select to authenticated using (true);
create policy "create meetups" on public.meetups for insert to authenticated with check (created_by = auth.uid());
create policy "delete own meetups" on public.meetups for delete to authenticated using (created_by = auth.uid());

create policy "read attendees" on public.meetup_attendees for select to authenticated using (true);
create policy "join meetups" on public.meetup_attendees for insert to authenticated with check (user_id = auth.uid());
create policy "leave meetups" on public.meetup_attendees for delete to authenticated using (user_id = auth.uid());

create policy "read posts" on public.posts for select to authenticated using (true);
create policy "create posts" on public.posts for insert to authenticated with check (user_id = auth.uid());
create policy "delete own posts" on public.posts for delete to authenticated using (user_id = auth.uid());

create policy "read likes" on public.post_likes for select to authenticated using (true);
create policy "like" on public.post_likes for insert to authenticated with check (user_id = auth.uid());
create policy "unlike" on public.post_likes for delete to authenticated using (user_id = auth.uid());

-- Chat en tiempo real
alter publication supabase_realtime add table public.messages;

-- ─────────────────────────────────────────────
-- Storage: bucket público "media" para fotos y videos
-- Cada usuario sube solo dentro de su carpeta: media/<user_id>/...
-- ─────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit)
values ('media', 'media', true, 104857600) -- 100 MB
on conflict (id) do nothing;

create policy "upload own media" on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "delete own media" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
