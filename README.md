# PRINT IT — Catálogo revisión

Copia de revisión del catálogo de PRINT IT. El original [`printitbcn/cat-logo-2026-`](https://github.com/printitbcn/cat-logo-2026-) **no se modifica**: este proyecto solo lo lee.

## Qué hay

| Ruta | Qué es |
|------|--------|
| `catalog/` | Copia del catálogo. Solo entran los archivos que la web usa |
| `app/`, `lib/`, `public/revision/` | Login, notas y novedades. El sync no los toca |
| `supabase/schema.sql` | Tablas de notas y novedades. La app lo ejecuta sola |
| `.sync-meta.json` | Última copia y el historial. De aquí salen las novedades |
| `.github/workflows/sync-from-original.yml` | Cada 15 minutos mira el original |

Las notas no están en git. Están en Postgres, así que una sincronización del catálogo no las borra.

## Entrar

- Usuario: `reche@printitbcn.com`
- Contraseña: la variable `REVISION_PASSWORD`
- Admin de notas: `/notas` con `ADMIN_PASSWORD`

## Variables que ya están en Vercel

La app usa estas, en este orden:

1. `POSTGRES_URL_NON_POOLING` para crear las tablas y guardar notas y novedades.
2. Si esa URL no está: `POSTGRES_URL`, o `POSTGRES_HOST` + `POSTGRES_PASSWORD` + `POSTGRES_DATABASE`.
3. Si no hay Postgres: `SUPABASE_SECRET_KEY` (formato `sb_secret_`) y la URL. La URL sale de `SUPABASE_URL`, de `NEXT_PUBLIC_SUPABASE_URL`, o de `POSTGRES_HOST` (`db.<ref>.supabase.co` → `https://<ref>.supabase.co`).

También siguen valiendo los nombres antiguos `SUPABASE_SERVICE_ROLE_KEY` y `NEXT_PUBLIC_SUPABASE_URL`.

`SUPABASE_PUBLISHABLE_KEY` no se usa en el navegador. La clave secreta tampoco sale del servidor.

Hacen falta, además, `REVISION_PASSWORD`, `ADMIN_PASSWORD` y `REVISION_SESSION_SECRET`. Ya están en el proyecto.

## Base de datos

No hay que pegar el SQL a mano. En el deploy, y otra vez al arrancar, la app crea `anotaciones` y `actualizaciones` si no existen y apunta la copia inicial en Novedades. Repetirlo no duplica filas.

## Sync

La GitHub Action no usa secrets. El original es público. Si hay cambios, hace commit solo de `catalog/`, `INFORME_ASSETS.md` y `.sync-meta.json`. Al desplegar, la app anota ese commit en Novedades.

## Comandos

```bash
npm install
npm run dev
npm run sync:dry-run          # mira el original y no escribe
npm run sync:from-original    # copia el catálogo en local
```
