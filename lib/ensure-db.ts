import fs from "fs";
import path from "path";
import { getPool } from "@/lib/db";
import { resolvePostgresConnection } from "@/lib/env";
import { splitSql } from "@/lib/sql";
import { loadSyncEntries } from "@/lib/sync-log";

export type EnsureResult = {
  ok: boolean;
  skipped: boolean;
  message: string;
};

let pending: Promise<EnsureResult> | null = null;

async function runEnsure(): Promise<EnsureResult> {
  const resolved = resolvePostgresConnection();
  if (!resolved) {
    return {
      ok: true,
      skipped: true,
      message:
        "Sin POSTGRES_URL_NON_POOLING ni variables de respaldo: no se crean tablas en este proceso.",
    };
  }

  const schemaPath = path.join(process.cwd(), "supabase", "schema.sql");
  if (!fs.existsSync(schemaPath)) {
    throw new Error("No está supabase/schema.sql junto a la app.");
  }
  const statements = splitSql(fs.readFileSync(schemaPath, "utf8"));
  const entries = loadSyncEntries();
  const client = await getPool().connect();

  try {
    await client.query("begin");
    await client.query("select pg_advisory_xact_lock($1)", [84213017]);
    for (const statement of statements) {
      await client.query(statement);
    }
    for (const entry of entries) {
      await client.query(
        `insert into public.actualizaciones
           (fecha, commit_sha, commit_message, archivos_cambiados, paginas_cambiadas)
         values ($1::timestamptz, $2, $3, $4::jsonb, $5::jsonb)
         on conflict (commit_sha) do nothing`,
        [
          entry.fecha,
          entry.commit_sha,
          entry.commit_message,
          JSON.stringify(entry.archivos_cambiados),
          JSON.stringify(entry.paginas_cambiadas),
        ]
      );
    }
    await client.query("commit");
  } catch (error) {
    try {
      await client.query("rollback");
    } catch {
      /* la conexión ya se cerró */
    }
    throw error;
  } finally {
    client.release();
  }

  return {
    ok: true,
    skipped: false,
    message: `Tablas listas (${resolved.source}). Novedades revisadas: ${entries.length}.`,
  };
}

export function ensureDatabase(): Promise<EnsureResult> {
  if (!pending) {
    pending = runEnsure().catch((error) => {
      pending = null;
      throw error;
    });
  }
  return pending;
}
