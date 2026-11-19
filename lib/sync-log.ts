import fs from "fs";
import path from "path";

export type SyncEntry = {
  fecha: string;
  commit_sha: string;
  commit_message: string;
  archivos_cambiados: string[];
  paginas_cambiadas: string[];
};

/** Copia con la que se creó este repo (redesign-home @ 9efecd0). */
export const INITIAL_CATALOG_ENTRY: SyncEntry = {
  fecha: "2026-11-18T23:07:03.000Z",
  commit_sha: "9efecd0473d7c4230c2bf317247822583c0319b9",
  commit_message: "Copia inicial del catálogo",
  archivos_cambiados: [],
  paginas_cambiadas: [],
};

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item));
}

function asEntry(value: unknown): SyncEntry | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const commit_sha = typeof row.commit_sha === "string" ? row.commit_sha.trim() : "";
  if (!commit_sha) return null;
  return {
    commit_sha,
    commit_message: typeof row.commit_message === "string" ? row.commit_message : "",
    fecha: typeof row.fecha === "string" && row.fecha ? row.fecha : new Date().toISOString(),
    archivos_cambiados: asStringList(row.archivos_cambiados),
    paginas_cambiadas: asStringList(row.paginas_cambiadas),
  };
}

export function loadSyncEntries(root = process.cwd()): SyncEntry[] {
  const file = path.join(root, ".sync-meta.json");
  const entries: SyncEntry[] = [];
  const seen = new Set<string>();

  const push = (value: unknown) => {
    const entry = asEntry(value);
    if (!entry || seen.has(entry.commit_sha)) return;
    seen.add(entry.commit_sha);
    entries.push(entry);
  };

  if (fs.existsSync(file)) {
    try {
      const raw = JSON.parse(fs.readFileSync(file, "utf8")) as Record<string, unknown>;
      if (Array.isArray(raw.historial)) raw.historial.forEach(push);
      push(raw);
    } catch (error) {
      console.error("[revision] .sync-meta.json no se pudo leer:", error instanceof Error ? error.message : error);
    }
  }

  if (!seen.has(INITIAL_CATALOG_ENTRY.commit_sha)) {
    entries.unshift(INITIAL_CATALOG_ENTRY);
  }

  return entries.sort((a, b) => a.fecha.localeCompare(b.fecha));
}
