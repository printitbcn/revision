/**
 * Resuelve la configuración que Vercel ya tiene, y si no, los nombres antiguos.
 * La conexión directa a Postgres es la vía principal: con ella se pueden crear
 * las tablas. La clave sb_secret_ solo sirve como respaldo de la API.
 */

export type PostgresConnection = {
  connectionString: string;
  source: string;
};

export type SupabaseAdminConfig = {
  url: string;
  key: string;
  keySource: string;
  urlSource: string;
};

function clean(value: string | undefined): string {
  return (value || "").trim();
}

export function resolvePostgresConnection(): PostgresConnection | null {
  const named: Array<[string, string | undefined]> = [
    ["POSTGRES_URL_NON_POOLING", process.env.POSTGRES_URL_NON_POOLING],
    ["POSTGRES_URL", process.env.POSTGRES_URL],
    ["DATABASE_URL", process.env.DATABASE_URL],
    ["POSTGRES_PRISMA_URL", process.env.POSTGRES_PRISMA_URL],
  ];
  for (const [source, value] of named) {
    const connectionString = clean(value);
    if (connectionString) return { connectionString, source };
  }

  const host = clean(process.env.POSTGRES_HOST);
  const password = process.env.POSTGRES_PASSWORD;
  if (!host || password == null || password === "") return null;

  const user = clean(process.env.POSTGRES_USER) || "postgres";
  const database = clean(process.env.POSTGRES_DATABASE) || "postgres";
  const port = clean(process.env.POSTGRES_PORT) || "5432";
  const connectionString = `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${encodeURIComponent(database)}`;
  return { connectionString, source: "POSTGRES_HOST" };
}

/** db.<ref>.supabase.co → https://<ref>.supabase.co */
export function supabaseUrlFromPostgresHost(host: string | undefined): string | null {
  const value = clean(host);
  const match = /^db\.([a-z0-9]+)\.supabase\.co$/i.exec(value);
  if (!match) return null;
  return `https://${match[1]}.supabase.co`;
}

export function resolveSupabaseAdmin(): SupabaseAdminConfig | null {
  const urlCandidates: Array<[string, string | undefined]> = [
    ["SUPABASE_URL", process.env.SUPABASE_URL],
    ["NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL],
  ];
  let url = "";
  let urlSource = "";
  for (const [source, value] of urlCandidates) {
    const candidate = clean(value);
    if (candidate) {
      url = candidate.replace(/\/$/, "");
      urlSource = source;
      break;
    }
  }
  if (!url) {
    const derived = supabaseUrlFromPostgresHost(process.env.POSTGRES_HOST);
    if (derived) {
      url = derived;
      urlSource = "POSTGRES_HOST";
    }
  }

  const keyCandidates: Array<[string, string | undefined]> = [
    ["SUPABASE_SECRET_KEY", process.env.SUPABASE_SECRET_KEY],
    ["SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY],
  ];
  let key = "";
  let keySource = "";
  for (const [source, value] of keyCandidates) {
    const candidate = clean(value);
    if (candidate) {
      key = candidate;
      keySource = source;
      break;
    }
  }

  if (!url || !key) return null;
  return { url, key, keySource, urlSource };
}

export function postgresHost(connectionString: string): string {
  try {
    const normalized = connectionString.replace(/^postgres(ql)?:/i, "http:");
    return new URL(normalized).hostname;
  } catch {
    const match = /@([^/:?]+)/.exec(connectionString);
    return match?.[1] || "";
  }
}

export function postgresUsesSsl(connectionString: string): boolean {
  const host = postgresHost(connectionString);
  if (host === "localhost" || host === "127.0.0.1" || host === "::1") return false;
  if (/sslmode=disable/i.test(connectionString)) return false;
  return true;
}

/**
 * pg 8 trata sslmode=require como verify-full y rechaza el certificado del
 * pooler de Supabase. no-verify deja el cifrado y no comprueba la cadena.
 */
export function pgConnectionConfig(connectionString: string): {
  connectionString: string;
  ssl: false | { rejectUnauthorized: false };
} {
  if (!postgresUsesSsl(connectionString)) {
    return {
      connectionString: connectionString.replace(/([?&])sslmode=[^&]*/gi, "$1").replace(/[?&]$/, ""),
      ssl: false,
    };
  }
  const withMode = /sslmode=/i.test(connectionString)
    ? connectionString.replace(/sslmode=[^&]*/i, "sslmode=no-verify")
    : `${connectionString}${connectionString.includes("?") ? "&" : "?"}sslmode=no-verify`;
  return { connectionString: withMode, ssl: { rejectUnauthorized: false } };
}
