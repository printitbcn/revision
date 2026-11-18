"use client";

import { useEffect, useState } from "react";

type Update = {
  id: string;
  fecha: string;
  commit_sha: string;
  commit_message: string;
  archivos_cambiados: string[];
  paginas_cambiadas: string[];
};

const SEEN_KEY = "printit_revision_last_seen_update";

export default function NovedadesPage() {
  const [updates, setUpdates] = useState<Update[]>([]);
  const [warning, setWarning] = useState("");
  const [lastSeen, setLastSeen] = useState<string | null>(null);

  useEffect(() => {
    setLastSeen(localStorage.getItem(SEEN_KEY));
    fetch("/api/updates")
      .then((r) => r.json())
      .then((data) => {
        setUpdates(data.updates || []);
        if (data.warning) setWarning(data.warning);
        if (data.updates?.[0]?.fecha) {
          localStorage.setItem(SEEN_KEY, data.updates[0].fecha);
        }
      })
      .catch(() => setWarning("No se pudieron cargar actualizaciones"));
  }, []);

  const changedSinceVisit = new Set<string>();
  if (lastSeen) {
    updates
      .filter((u) => u.fecha > lastSeen)
      .forEach((u) => u.paginas_cambiadas?.forEach((p) => changedSinceVisit.add(p)));
  }

  return (
    <main style={{ minHeight: "100dvh", background: "#0e0e0f", color: "#f4efe8", padding: 24 }}>
      <div style={{ width: "min(900px, 100%)", margin: "0 auto" }}>
        <header style={{ display: "flex", gap: 16, alignItems: "baseline", flexWrap: "wrap" }}>
          <h1 style={{ margin: 0, fontWeight: 500, letterSpacing: "0.06em" }}>Novedades</h1>
          <a href="/index.html" style={{ color: "#00b4d8" }}>
            Catálogo
          </a>
          <a href="/notas" style={{ color: "#00b4d8" }}>
            Notas
          </a>
        </header>
        <p style={{ opacity: 0.7 }}>
          Sincronizaciones automáticas desde el catálogo original (solo lectura).
        </p>
        {warning ? <p style={{ color: "#ffcc80" }}>{warning}</p> : null}

        <div style={{ display: "grid", gap: 14, marginTop: 20 }}>
          {updates.map((u) => (
            <article
              key={u.id}
              style={{
                border: "1px solid rgba(255,255,255,0.12)",
                padding: 16,
                background: "#161618",
              }}
            >
              <div style={{ opacity: 0.65, fontSize: 12 }}>
                {new Date(u.fecha).toLocaleString()} ·{" "}
                <code>{u.commit_sha?.slice(0, 7)}</code>
              </div>
              <h2 style={{ margin: "8px 0", fontSize: 16, fontWeight: 500 }}>
                {u.commit_message}
              </h2>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {(u.paginas_cambiadas || []).map((p) => (
                  <a
                    key={p}
                    href={p}
                    style={{
                      color: "#041016",
                      background: "#00b4d8",
                      padding: "4px 8px",
                      fontSize: 12,
                      textDecoration: "none",
                    }}
                  >
                    {p}
                    {changedSinceVisit.has(p) ? " · Actualizado" : ""}
                  </a>
                ))}
              </div>
            </article>
          ))}
          {!updates.length ? (
            <p style={{ opacity: 0.7 }}>Aún no hay sincronizaciones registradas.</p>
          ) : null}
        </div>
      </div>
    </main>
  );
}
