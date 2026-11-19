import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { resolveSupabaseAdmin } from "@/lib/env";

let adminClient: SupabaseClient | null = null;
let adminKey = "";

/**
 * Cliente de servidor con la clave secreta (sb_secret_ o service_role antigua).
 * No usa la clave publicable: con RLS activo no podría leer ni escribir.
 */
export function getServiceSupabase(): SupabaseClient {
  const config = resolveSupabaseAdmin();
  if (!config) {
    throw new Error(
      "Falta la URL de Supabase o la clave secreta (SUPABASE_SECRET_KEY o SUPABASE_SERVICE_ROLE_KEY)."
    );
  }
  if (!adminClient || adminKey !== config.key) {
    adminKey = config.key;
    adminClient = createClient(config.url, config.key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  }
  return adminClient;
}

export type AnotacionEstado = "Pendiente" | "En curso" | "Resuelta";

export type Anotacion = {
  id: string;
  pagina: string;
  elemento_selector: string | null;
  posicion_x: number | null;
  posicion_y: number | null;
  texto: string;
  autor: string;
  estado: AnotacionEstado;
  captura_url: string | null;
  created_at: string;
  updated_at: string;
};

export type Actualizacion = {
  id: string;
  fecha: string;
  commit_sha: string;
  commit_message: string;
  archivos_cambiados: string[];
  paginas_cambiadas: string[];
};

export function publicDbError(error: unknown): string {
  const message = error instanceof Error ? error.message : "Error de base de datos";
  if (/postgres(ql)?:\/\//i.test(message) || /password authentication/i.test(message)) {
    return "No se pudo conectar con la base de datos";
  }
  return message;
}
