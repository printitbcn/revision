# Guía paso a paso — Catálogo revisión

## 1. Repositorio (ya creado)

- URL: https://github.com/printitbcn/revision
- El original https://github.com/printitbcn/cat-logo-2026- **no se toca**

## 2. Supabase

1. Crea un proyecto en Supabase.
2. SQL Editor → pega y ejecuta `supabase/schema.sql`.
3. Settings → API → copia URL y keys.

## 3. Vercel (proyecto NUEVO)

1. [vercel.com](https://vercel.com) → Add New Project.
2. Importa **solo** `printitbcn/revision` (no el original).
3. Framework: Next.js. Root: `.`
4. Environment Variables:

| Nombre | Notas |
|--------|--------|
| `REVISION_PASSWORD` | Contraseña del login revisión |
| `ADMIN_PASSWORD` | Contraseña de `/notas` |
| `REVISION_SESSION_SECRET` | Cadena larga aleatoria |
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role (solo servidor) |

5. Deploy.

## 4. Token de solo lectura al original

1. GitHub → Settings (tu usuario o la org) → Developer settings → Personal access tokens.
2. Genera un **Fine-grained token** (recomendado):
   - Resource owner: `printitbcn`
   - Repository access: **Only select** → `cat-logo-2026-`
   - Permissions: **Contents: Read-only** (nada de Write)
   - Expiration: la que prefieras
3. Copia el token.
4. En el repo **`revision`** → Settings → Secrets and variables → Actions → New repository secret:
   - Name: `ORIGINAL_READ_TOKEN`
   - Value: el token
5. (Opcional) Añade también secrets `NEXT_PUBLIC_SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` para que el workflow registre filas en `actualizaciones`.

## 5. Probar sync

1. Repo `revision` → Actions → **Sync from original catalog** → Run workflow.
2. Si hay commits nuevos en `redesign-home` del original, actualizará `catalog/` y hará commit en `revision`.
3. Vercel redesplegará solo desde `revision`.
4. En la app: abre **/novedades**.

## 6. Probar login y notas

1. Abre la URL de Vercel → `/login`
2. Usuario: `reche@printitbcn.com` + `REVISION_PASSWORD`
3. En cualquier página del catálogo: **Añadir nota**
4. Admin: `/notas` con `ADMIN_PASSWORD`

## 7. “Actualiza la revisión” (manual)

Pídelo en el chat o ejecuta en local:

```bash
cd revision
ORIGINAL_READ_TOKEN=... npm run sync:from-original
git add catalog INFORME_ASSETS.md .sync-meta.json
git commit -m "Sync live catalog from original"
git push
```
