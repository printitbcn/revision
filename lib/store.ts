import { dbQuery } from "@/lib/db";
import { resolvePostgresConnection } from "@/lib/env";
import { ensureDatabase } from "@/lib/ensure-db";
import {
  getServiceSupabase,
  publicDbError,
  type Actualizacion,
  type Anotacion,
  type AnotacionEstado,
} from "@/lib/supabase";

export class DbConfigError extends Error {}

export type NewNote = {
  pagina: string;
  elemento_selector: string | null;
  posicion_x: number | null;
  posicion_y: number | null;
  texto: string;
  autor: string;
  captura_url: string | null;
};

function serialize<T>(row: T): T {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row as object)) {
    out[key] = value instanceof Date ? value.toISOString() : value;
  }
  return out as T;
}

async function ready(): Promise<"postgres" | "supabase"> {
  if (resolvePostgresConnection()) {
    await ensureDatabase();
    return "postgres";
  }
  try {
    getServiceSupabase();
    return "supabase";
  } catch {
    throw new DbConfigError(
      "Base de datos no configurada. En Vercel hace falta POSTGRES_URL_NON_POOLING."
    );
  }
}

export async function listNotes(filter: {
  pagina?: string | null;
  estado?: string | null;
}): Promise<Anotacion[]> {
  const mode = await ready();
  if (mode === "postgres") {
    const where: string[] = [];
    const params: unknown[] = [];
    if (filter.pagina) {
      params.push(filter.pagina);
      where.push(`pagina = $${params.length}`);
    }
    if (filter.estado) {
      params.push(filter.estado);
      where.push(`estado = $${params.length}`);
    }
    const sql = `select * from public.anotaciones ${
      where.length ? `where ${where.join(" and ")}` : ""
    } order by created_at desc`;
    const rows = await dbQuery<Anotacion>(sql, params);
    return rows.map(serialize);
  }

  const sb = getServiceSupabase();
  let query = sb.from("anotaciones").select("*").order("created_at", { ascending: false });
  if (filter.pagina) query = query.eq("pagina", filter.pagina);
  if (filter.estado) query = query.eq("estado", filter.estado);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data || []) as Anotacion[];
}

export async function insertNote(note: NewNote): Promise<Anotacion> {
  const mode = await ready();
  if (mode === "postgres") {
    const rows = await dbQuery<Anotacion>(
      `insert into public.anotaciones
         (pagina, elemento_selector, posicion_x, posicion_y, texto, autor, estado, captura_url)
       values ($1, $2, $3, $4, $5, $6, 'Pendiente', $7)
       returning *`,
      [
        note.pagina,
        note.elemento_selector,
        note.posicion_x,
        note.posicion_y,
        note.texto,
        note.autor,
        note.captura_url,
      ]
    );
    return serialize(rows[0]);
  }

  const sb = getServiceSupabase();
  const { data, error } = await sb
    .from("anotaciones")
    .insert({ ...note, estado: "Pendiente" })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as Anotacion;
}

export async function updateNote(
  id: string,
  patch: { texto?: string; estado?: AnotacionEstado }
): Promise<Anotacion | null> {
  const mode = await ready();
  if (mode === "postgres") {
    const sets = ["updated_at = now()"];
    const params: unknown[] = [id];
    if (patch.texto != null) {
      params.push(patch.texto);
      sets.push(`texto = $${params.length}`);
    }
    if (patch.estado != null) {
      params.push(patch.estado);
      sets.push(`estado = $${params.length}`);
    }
    const rows = await dbQuery<Anotacion>(
      `update public.anotaciones set ${sets.join(", ")} where id = $1 returning *`,
      params
    );
    return rows[0] ? serialize(rows[0]) : null;
  }

  const payload: Record<string, string> = { updated_at: new Date().toISOString() };
  if (patch.texto != null) payload.texto = patch.texto;
  if (patch.estado != null) payload.estado = patch.estado;
  const sb = getServiceSupabase();
  const { data, error } = await sb.from("anotaciones").update(payload).eq("id", id).select("*").maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Anotacion | null) ?? null;
}

export async function deleteNote(id: string): Promise<boolean> {
  const mode = await ready();
  if (mode === "postgres") {
    const rows = await dbQuery<{ id: string }>(
      `delete from public.anotaciones where id = $1 returning id`,
      [id]
    );
    return rows.length > 0;
  }
  const sb = getServiceSupabase();
  const { data, error } = await sb.from("anotaciones").delete().eq("id", id).select("id");
  if (error) throw new Error(error.message);
  return (data || []).length > 0;
}

export async function listUpdates(): Promise<Actualizacion[]> {
  const mode = await ready();
  if (mode === "postgres") {
    const rows = await dbQuery<Actualizacion>(
      `select * from public.actualizaciones order by fecha desc limit 100`
    );
    return rows.map(serialize);
  }

  const sb = getServiceSupabase();
  const { data, error } = await sb
    .from("actualizaciones")
    .select("*")
    .order("fecha", { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  return (data || []) as Actualizacion[];
}

export { publicDbError };
