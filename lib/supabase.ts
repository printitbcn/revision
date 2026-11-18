import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let adminClient: SupabaseClient | null = null;

export function getServiceSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  if (!adminClient) {
    adminClient = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
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
