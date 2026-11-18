# PRINT IT — Catálogo revisión

Repositorio **nuevo** (`printitbcn/revision`) con una copia filtrada del catálogo live + capa de revisión (login, notas, `/notas`, Novedades, sync).

> El original [`printitbcn/cat-logo-2026-`](https://github.com/printitbcn/cat-logo-2026-) **no se modifica**. Solo se lee.

## Estructura

| Ruta | Qué es |
|------|--------|
| `catalog/` | Copia estática del catálogo (solo assets referenciados en live) |
| `app/`, `lib/`, `components/`, `public/revision/` | Capa de revisión (no la sobrescribe el sync) |
| `supabase/schema.sql` | Tablas + RLS |
| `scripts/sync-from-original.mjs` | Sync manual / CI |
| `.github/workflows/sync-from-original.yml` | Cada 15 min + manual |
| `INFORME_ASSETS.md` | Listado de archivos copiados / excluidos |

## Variables de entorno (Vercel)

- `REVISION_PASSWORD`
- `ADMIN_PASSWORD`
- `REVISION_SESSION_SECRET` (recomendado)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Secrets GitHub (repo `revision`)

- `ORIGINAL_READ_TOKEN` — PAT **read-only** al original
- `NEXT_PUBLIC_SUPABASE_URL` (para registrar actualizaciones)
- `SUPABASE_SERVICE_ROLE_KEY`

## Usuario revisión

- Email: `reche@printitbcn.com`
- Password: `REVISION_PASSWORD`

## Comandos

```bash
npm install
npm run dev
npm run sync:from-original   # requiere ORIGINAL_READ_TOKEN si el repo es privado
```

## Confirmación de aislamiento

Este proyecto vive en un clone distinto y un remote distinto (`printitbcn/revision`).  
No se hacen commits ni cambios de settings en `printitbcn/cat-logo-2026-` ni en su Vercel.
