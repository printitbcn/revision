"use client";

import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BrandLogo, ThemeButton } from "@/app/theme";

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
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "No hemos podido entrar. Prueba de nuevo en un momento.");
        setLoading(false);
        return;
      }
      const next = params.get("next") || "/index.html";
      router.replace(next);
    } catch {
      setError("No hemos podido entrar. Prueba de nuevo en un momento.");
      setLoading(false);
    }
  }

  return (
    <main className="rev-page rev-login">
      <div className="rev-top" style={{ position: "fixed", top: 20, right: 20, left: 20 }}>
        <BrandLogo />
        <ThemeButton />
      </div>
      <form className="rev-card" onSubmit={onSubmit}>
        <p className="rev-kicker">Revisión</p>
        <h1 className="rev-title">Hola</h1>
        <p className="rev-lead">
          Entra para recorrer el catálogo y dejar notas justo donde haga falta. El diseño del
          catálogo no cambia.
        </p>
        <label className="rev-field">
          Correo
          <input
            className="rev-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            autoComplete="username"
            required
            aria-invalid={error ? true : undefined}
          />
        </label>
        <label className="rev-field">
          Contraseña
          <input
            className="rev-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            autoComplete="current-password"
            required
            aria-invalid={error ? true : undefined}
          />
        </label>
        {error ? (
          <p className="rev-error" role="alert">
            {error}
          </p>
        ) : null}
        <button className="rev-button" type="submit" disabled={loading} aria-busy={loading}>
          {loading ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
