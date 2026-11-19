"use client";

import { useEffect, useState } from "react";
import { BrandLogo, ThemeButton } from "@/app/theme";

type Update = {
  id: string;
  fecha: string;
  commit_sha: string;
  commit_message: string;
  archivos_cambiados: string[];
  paginas_cambiadas: string[];
};

const SEEN_KEY = "printit_revision_last_seen_update";

function when(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("es", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function NovedadesPage() {
  const [updates, setUpdates] = useState<Update[]>([]);
  const [warning, setWarning] = useState("");
  const [lastSeen, setLastSeen] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem(SEEN_KEY);
    setLastSeen(seen);
    fetch("/api/updates")
      .then((r) => r.json())
      .then((data) => {
        const list = (data.updates || []) as Update[];
        setUpdates(list);
        if (data.warning || data.error) setWarning(data.warning || data.error);
        if (list[0]?.fecha) localStorage.setItem(SEEN_KEY, list[0].fecha);
      })
      .catch(() => setWarning("No se han podido cargar las novedades. Prueba de nuevo en un momento."))
      .finally(() => setReady(true));
  }, []);

  const freshPages = new Set<string>();
  if (lastSeen) {
    updates
      .filter((update) => update.fecha > lastSeen)
      .forEach((update) => update.paginas_cambiadas?.forEach((page) => freshPages.add(page)));
  }

  return (
    <main className="rev-page">
      <div className="rev-shell">
        <header className="rev-top">
          <a href="/index.html" aria-label="Volver al catálogo">
            <BrandLogo />
          </a>
          <div className="rev-nav">
            <a href="/index.html">Catálogo</a>
            <a href="/notas">Notas</a>
            <ThemeButton />
          </div>
        </header>
        <p className="rev-kicker">Catálogo</p>
        <h1 className="rev-title">Novedades</h1>
        <p className="rev-lead">
          Cuando el catálogo original cambia, lo verás aquí. Abre la página y mira qué se ha
          movido.
        </p>
        {warning ? <p className="rev-error">{warning}</p> : null}
        <div className="rev-list">
          {updates.map((update) => (
            <article className="rev-update" key={update.id}>
              <div className="rev-muted">
                {when(update.fecha)}
                {update.commit_sha ? ` · ${update.commit_sha.slice(0, 7)}` : ""}
              </div>
              <h2 style={{ margin: "8px 0 0", fontSize: 18, fontWeight: 500 }}>{update.commit_message}</h2>
              <div className="rev-chips">
                {(update.paginas_cambiadas || []).map((page) => (
                  <a
                    key={page}
                    className={freshPages.has(page) ? "rev-chip is-new" : "rev-chip"}
                    href={page}
                  >
                    {page}
                  </a>
                ))}
              </div>
            </article>
          ))}
          {ready && !updates.length ? (
            <p className="rev-lead">Todavía no hay cambios registrados. El catálogo está como en la copia inicial.</p>
          ) : null}
        </div>
      </div>
    </main>
  );
}
