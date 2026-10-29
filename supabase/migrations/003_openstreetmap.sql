-- SkateSpot · Migración 003: skateparks importados de OpenStreetMap
-- Ya incluida en schema.sql; solo hace falta si ejecutaste una versión anterior de schema.sql.

alter table public.skateparks add column if not exists osm_id text unique;
