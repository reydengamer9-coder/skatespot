-- SkateSpot · Migración 002: sesiones en vivo y opciones de sesión
-- Ya incluida en schema.sql; solo hace falta si ejecutaste una versión anterior de schema.sql.

alter table public.meetups
  add column if not exists duration_minutes int not null default 120
    check (duration_minutes between 15 and 720),
  add column if not exists session_type text not null default 'street'
    check (session_type in ('street', 'bowl', 'park', 'principiantes', 'game_of_skate', 'filmacion')),
  add column if not exists level text not null default 'todos'
    check (level in ('todos', 'principiante', 'intermedio', 'avanzado'));

create index if not exists meetups_park_starts_idx on public.meetups (park_id, starts_at);
