"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("reche@printitbcn.com");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Error de acceso");
      return;
    }
    const next = params.get("next") || "/index.html";
    router.replace(next);
  }

  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        background: "#0e0e0f",
        color: "#f4efe8",
        padding: 24,
      }}
    >
      <form
        onSubmit={onSubmit}
        style={{
          width: "min(420px, 100%)",
          display: "grid",
          gap: 14,
          padding: 28,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "#161618",
        }}
      >
        <h1 style={{ margin: 0, fontWeight: 500, letterSpacing: "0.08em", fontSize: 18 }}>
          PRINT IT · Revisión
        </h1>
        <p style={{ margin: 0, opacity: 0.7, fontSize: 13, lineHeight: 1.5 }}>
          Acceso protegido al catálogo de revisión con notas.
        </p>
        <label style={{ display: "grid", gap: 6, fontSize: 12 }}>
          Usuario
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
            style={inputStyle}
          />
        </label>
        <label style={{ display: "grid", gap: 6, fontSize: 12 }}>
          Contraseña
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
            style={inputStyle}
          />
        </label>
        {error ? (
          <p style={{ margin: 0, color: "#ff8a80", fontSize: 13 }}>{error}</p>
        ) : null}
        <button
          type="submit"
          disabled={loading}
          style={{
            marginTop: 8,
            padding: "12px 16px",
            border: 0,
            background: "#00b4d8",
            color: "#041016",
            fontWeight: 700,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            cursor: "pointer",
          }}
        >
          {loading ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "10px 12px",
  border: "1px solid rgba(255,255,255,0.16)",
  background: "#0e0e0f",
  color: "#fff",
  fontSize: 14,
};

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
