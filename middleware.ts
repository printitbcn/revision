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

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  const session = request.cookies.get(REVISION_COOKIE)?.value;
  if (!session) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname + request.nextUrl.search);
    return NextResponse.redirect(login);
  }

  // Rutas de la capa Next (notas / novedades / api) pasan normales.
  if (
    pathname.startsWith("/notas") ||
    pathname.startsWith("/novedades") ||
    pathname.startsWith("/api/")
  ) {
    return NextResponse.next();
  }

  // Todo lo demás: servir catálogo estático vía rewrite interno.
  const rewriteUrl = request.nextUrl.clone();
  rewriteUrl.pathname = "/api/catalog";
  rewriteUrl.searchParams.set("path", pathname);
  return NextResponse.rewrite(rewriteUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
