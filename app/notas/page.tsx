"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Note = {
  id: string;
  pagina: string;
  texto: string;
  autor: string;
  estado: "Pendiente" | "En curso" | "Resuelta";
  created_at: string;
  elemento_selector?: string | null;
};

export default function NotasAdminPage() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [notes, setNotes] = useState<Note[]>([]);
  const [error, setError] = useState("");
  const [estado, setEstado] = useState("");
  const [pagina, setPagina] = useState("");
  const [orphanOnly, setOrphanOnly] = useState(false);

  async function login(e: FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/auth/admin-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) {
      setError("Contraseña admin incorrecta");
      return;
    }
    setAuthed(true);
    setError("");
    await load();
  }

  async function load() {
    const qs = new URLSearchParams();
    if (estado) qs.set("estado", estado);
    if (pagina) qs.set("pagina", pagina);
    if (orphanOnly) qs.set("orphan", "1");
    const res = await fetch(`/api/notes?${qs.toString()}`);
    if (!res.ok) {
      setError("No se pudieron cargar las notas");
      return;
    }
    const data = await res.json();
    setNotes(data.notes || []);
  }

  useEffect(() => {
    if (authed) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed, estado, pagina, orphanOnly]);

  const pages = useMemo(
    () => Array.from(new Set(notes.map((n) => n.pagina))).sort(),
    [notes]
  );

  async function setNoteEstado(id: string, next: Note["estado"]) {
    const res = await fetch("/api/notes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, estado: next }),
    });
    if (res.ok) await load();
  }

  function exportCsv() {
    const header = ["id", "pagina", "estado", "autor", "created_at", "texto"];
    const rows = notes.map((n) =>
      [n.id, n.pagina, n.estado, n.autor, n.created_at, JSON.stringify(n.texto)].join(",")
    );
    const blob = new Blob([[header.join(","), ...rows].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `notas-revision-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  if (!authed) {
    return (
      <main style={wrap}>
        <form onSubmit={login} style={card}>
          <h1 style={{ marginTop: 0 }}>Admin /notas</h1>
          <p style={{ opacity: 0.7 }}>Protegido con ADMIN_PASSWORD</p>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="ADMIN_PASSWORD"
            style={input}
            required
          />
          {error ? <p style={{ color: "#c62828" }}>{error}</p> : null}
          <button type="submit" style={btn}>
            Entrar
          </button>
        </form>
      </main>
    );
  }

  return (
    <main style={{ ...wrap, alignItems: "stretch" }}>
      <div style={{ width: "min(1100px, 100%)", margin: "0 auto", padding: 24 }}>
        <header style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <h1 style={{ margin: 0, flex: 1 }}>Notas de revisión</h1>
          <a href="/novedades">Novedades</a>
          <a href="/index.html">Catálogo</a>
          <button type="button" onClick={exportCsv} style={btn}>
            Exportar CSV
          </button>
        </header>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", margin: "16px 0" }}>
          <select value={estado} onChange={(e) => setEstado(e.target.value)} style={input}>
            <option value="">Todos los estados</option>
            <option>Pendiente</option>
            <option>En curso</option>
            <option>Resuelta</option>
          </select>
          <select value={pagina} onChange={(e) => setPagina(e.target.value)} style={input}>
            <option value="">Todas las páginas</option>
            {pages.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={orphanOnly}
              onChange={(e) => setOrphanOnly(e.target.checked)}
            />
            Notas sin página
          </label>
        </div>

        {error ? <p style={{ color: "#c62828" }}>{error}</p> : null}

        <div style={{ display: "grid", gap: 10 }}>
          {notes.map((n) => (
            <article
              key={n.id}
              style={{
                border: "1px solid #ddd",
                padding: 14,
                background: "#fff",
                display: "grid",
                gap: 8,
              }}
            >
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <strong>{n.estado}</strong>
                <a href={n.pagina}>{n.pagina}</a>
                <span style={{ opacity: 0.65 }}>{new Date(n.created_at).toLocaleString()}</span>
                <span style={{ opacity: 0.65 }}>{n.autor}</span>
              </div>
              <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{n.texto}</p>
              <div style={{ display: "flex", gap: 8 }}>
                {(["Pendiente", "En curso", "Resuelta"] as const).map((s) => (
                  <button key={s} type="button" style={btn} onClick={() => setNoteEstado(n.id, s)}>
                    {s}
                  </button>
                ))}
              </div>
            </article>
          ))}
          {!notes.length ? <p>No hay notas con estos filtros.</p> : null}
        </div>
      </div>
    </main>
  );
}

const wrap: React.CSSProperties = {
  minHeight: "100dvh",
  background: "#f4efe8",
  color: "#111",
  display: "grid",
  placeItems: "center",
};
const card: React.CSSProperties = {
  width: "min(420px, 100%)",
  padding: 24,
  background: "#fff",
  border: "1px solid #ddd",
  display: "grid",
  gap: 12,
};
const input: React.CSSProperties = {
  padding: "10px 12px",
  border: "1px solid #ccc",
  fontSize: 14,
};
const btn: React.CSSProperties = {
  padding: "8px 12px",
  border: "1px solid #111",
  background: "#111",
  color: "#fff",
  cursor: "pointer",
  fontSize: 12,
};
