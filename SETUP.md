# Cómo está montada la revisión

El original https://github.com/printitbcn/cat-logo-2026- no se toca. Todo vive en https://github.com/printitbcn/revision y en el proyecto de Vercel `revision` (equipo printit).

## Lo que ya está hecho

- El proyecto de Vercel ya tiene `REVISION_PASSWORD`, `ADMIN_PASSWORD` y `REVISION_SESSION_SECRET`.
- La integración de Supabase ya creó `POSTGRES_URL_NON_POOLING`, `POSTGRES_HOST`, `POSTGRES_PASSWORD`, `POSTGRES_DATABASE`, `SUPABASE_PUBLISHABLE_KEY` y `SUPABASE_SECRET_KEY`.
- No hace falta crear `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` ni `SUPABASE_SERVICE_ROLE_KEY`.
- No hace falta ejecutar `supabase/schema.sql` en el navegador de Supabase. El próximo deploy lo hace.
- No hace falta ningún secret en GitHub Actions. El catálogo original es público.

## Qué pasa en cada deploy

1. Vercel ejecuta `scripts/ensure-db.ts` y después `next build`.
2. Ese script se conecta con `POSTGRES_URL_NON_POOLING` y crea las tablas si faltan.
3. Lee `.sync-meta.json` y guarda la copia inicial (y las sincronizaciones nuevas) en `actualizaciones`, sin duplicar el mismo commit.
4. Si el build no pudo conectar, el servidor lo vuelve a intentar al arrancar y en la primera petición.

## Probar la web

1. Abre la URL de Vercel. Entra en `/login`.
2. Usuario: `reche@printitbcn.com`. Contraseña: `REVISION_PASSWORD`.
3. En una página del catálogo, pulsa **Añadir nota**, haz clic en la página y guarda.
4. Abre `/notas` e introduce `ADMIN_PASSWORD`. Ahí se ve la nota y se puede cambiar el estado.
5. Abre `/novedades`. La primera fila es la copia inicial del catálogo.

## Sync automático

Cada 15 minutos (o con **Run workflow** en Actions) el repo de revisión:

1. Clona en solo lectura la rama `redesign-home` del original.
2. Copia únicamente los archivos que usa el catálogo. Los vídeos grandes van por Git LFS y, si no se pueden bajar, no se sustituye `catalog/`.
3. Si no hay cambios, no hace commit.
4. Si hay cambios, solo sube `catalog/`, `INFORME_ASSETS.md` y `.sync-meta.json`.

Las notas siguen en la base de datos.

Para lanzarlo a mano en un ordenador:

```bash
cd revision
npm install
npm run sync:from-original
git add catalog INFORME_ASSETS.md .sync-meta.json
git commit -m "Sync live catalog from original"
git push
```

## Nombres antiguos

Si en otro sitio aún existen `SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL` o `SUPABASE_SERVICE_ROLE_KEY`, la app los acepta. En este Vercel no hacen falta.
