import { NextRequest, NextResponse } from "next/server";

const REVISION_COOKIE = "printit_revision_session";

const PUBLIC_PREFIXES = [
  "/login",
  "/api/auth/login",
  "/revision/",
  "/_next/",
  "/favicon.ico",
];

function isPublic(pathname: string): boolean {
  return PUBLIC_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p)
  );
}

function sessionSecret(): string {
  return (
    process.env.REVISION_SESSION_SECRET ||
    process.env.REVISION_PASSWORD ||
    "dev-insecure-secret"
  );
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function sameSignature(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function signBody(body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(sessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return bytesToBase64Url(new Uint8Array(mac));
}

/** Misma cookie que lib/auth.ts: user|email|exp|hmac, firmada con REVISION_SESSION_SECRET. */
async function userSessionOk(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const parts = token.split("|");
  if (parts.length !== 4) return false;
  const [kind, email, expStr, sig] = parts;
  if (kind !== "user") return false;
  const expected = await signBody(`${kind}|${email}|${expStr}`);
  if (!sameSignature(sig, expected)) return false;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || Date.now() > exp) return false;
  return true;
}

function deny(request: NextRequest, clearCookie: boolean) {
  const { pathname, search } = request.nextUrl;
  const login = new URL("/login", request.url);
  login.searchParams.set("next", pathname + search);
  const response = NextResponse.redirect(login);
  if (clearCookie) {
    response.cookies.set(REVISION_COOKIE, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
  }
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(REVISION_COOKIE)?.value;
  if (!(await userSessionOk(token))) {
    return deny(request, token !== undefined);
  }

  // Rutas de la capa Next (notas / novedades / api) pasan normales.
  if (
    pathname.startsWith("/notas") ||
    pathname.startsWith("/novedades") ||
    pathname.startsWith("/api/")
  ) {
    return NextResponse.next();
  }

  // Medios copiados a public/media. La CDN responde Range/206; Safari lo necesita para <video>.
  if (pathname === "/media" || pathname.startsWith("/media/")) {
    return NextResponse.next();
  }

  // Todo lo demás: servir catálogo estático vía rewrite interno.
  // La ruta lee la cabecera: si el archivo trae ?v=..., Next no conserva
  // un query nuevo del rewrite y acabaría sirviendo el index.
  const headers = new Headers(request.headers);
  headers.set("x-catalog-path", pathname);
  const rewriteUrl = request.nextUrl.clone();
  rewriteUrl.pathname = "/api/catalog";
  return NextResponse.rewrite(rewriteUrl, { request: { headers } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
