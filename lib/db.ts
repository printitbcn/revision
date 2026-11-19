import { Pool, type QueryResultRow } from "pg";
import { postgresUsesSsl, resolvePostgresConnection } from "@/lib/env";

let pool: Pool | null = null;

export function getPool(): Pool {
  const resolved = resolvePostgresConnection();
  if (!resolved) {
    throw new Error(
      "No hay conexión Postgres. Hace falta POSTGRES_URL_NON_POOLING (o POSTGRES_HOST, POSTGRES_PASSWORD y POSTGRES_DATABASE)."
    );
  }
  if (!pool) {
    pool = new Pool({
      connectionString: resolved.connectionString,
      max: 1,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 20_000,
      allowExitOnIdle: true,
      ssl: postgresUsesSsl(resolved.connectionString) ? { rejectUnauthorized: false } : false,
    });
    pool.on("error", (error) => {
      console.error("[revision] conexión Postgres cerrada:", error.message);
    });
  }
  return pool;
}

export async function dbQuery<T extends QueryResultRow>(
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  const result = await getPool().query<T>(text, params);
  return result.rows;
}

export async function closeDb(): Promise<void> {
  if (!pool) return;
  const current = pool;
  pool = null;
  await current.end();
}
