import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

export const REVISION_COOKIE = "printit_revision_session";
export const ADMIN_COOKIE = "printit_revision_admin";
export const REVISION_USER = "reche@printitbcn.com";

const SESSION_DAYS = 14;

function secret(): string {
  return (
    process.env.REVISION_SESSION_SECRET ||
    process.env.REVISION_PASSWORD ||
    "dev-insecure-secret"
  );
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createSessionToken(kind: "user" | "admin", email: string): string {
  const exp = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const body = `${kind}|${email}|${exp}`;
  return `${body}|${sign(body)}`;
}

export function verifySessionToken(
  token: string | undefined | null,
  kind: "user" | "admin"
): { ok: true; email: string } | { ok: false } {
  if (!token) return { ok: false };
  const parts = token.split("|");
  if (parts.length !== 4) return { ok: false };
  const [k, email, expStr, sig] = parts;
  if (k !== kind) return { ok: false };
  const body = `${k}|${email}|${expStr}`;
  const expected = sign(body);
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false };
  } catch {
    return { ok: false };
  }
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || Date.now() > exp) return { ok: false };
  return { ok: true, email };
}

export function passwordOk(input: string, expectedEnv: string | undefined): boolean {
  if (!expectedEnv) return false;
  const a = Buffer.from(input);
  const b = Buffer.from(expectedEnv);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function getRevisionSession() {
  const jar = await cookies();
  return verifySessionToken(jar.get(REVISION_COOKIE)?.value, "user");
}

export async function getAdminSession() {
  const jar = await cookies();
  return verifySessionToken(jar.get(ADMIN_COOKIE)?.value, "admin");
}

export function sessionCookieOptions(maxAgeSec = SESSION_DAYS * 24 * 60 * 60) {
  return {
    httpOnly: true as const,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSec,
  };
}
