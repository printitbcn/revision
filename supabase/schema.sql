-- PRINT IT · Catálogo revisión — tablas + RLS
-- La app lo ejecuta sola en el build y al arrancar. Se puede repetir.

create extension if not exists "pgcrypto";

create table if not exists public.anotaciones (
  id uuid primary key default gen_random_uuid(),
  pagina text not null,
  elemento_selector text,
  posicion_x double precision,
  posicion_y double precision,
  texto text not null,
  autor text not null default 'reche@printitbcn.com',
  estado text not null default 'Pendiente'
    check (estado in ('Pendiente', 'En curso', 'Resuelta')),
  captura_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists anotaciones_pagina_idx on public.anotaciones (pagina);
create index if not exists anotaciones_estado_idx on public.anotaciones (estado);
create index if not exists anotaciones_created_idx on public.anotaciones (created_at desc);

create table if not exists public.actualizaciones (
  id uuid primary key default gen_random_uuid(),
  fecha timestamptz not null default now(),
  commit_sha text not null,
  commit_message text not null default '',
  archivos_cambiados jsonb not null default '[]'::jsonb,
  paginas_cambiadas jsonb not null default '[]'::jsonb
);

create index if not exists actualizaciones_fecha_idx on public.actualizaciones (fecha desc);
create unique index if not exists actualizaciones_commit_sha_uidx on public.actualizaciones (commit_sha);

alter table public.anotaciones enable row level security;
alter table public.actualizaciones enable row level security;

-- La app entra como dueña de las tablas (Postgres) o con la clave secreta.
-- anon y authenticated no tienen acceso. Esos roles solo existen en Supabase.
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on public.anotaciones from anon;
    revoke all on public.actualizaciones from anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all on public.anotaciones from authenticated;
    revoke all on public.actualizaciones from authenticated;
  end if;
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant all on public.anotaciones to service_role;
    grant all on public.actualizaciones to service_role;
  end if;
end
$$;
