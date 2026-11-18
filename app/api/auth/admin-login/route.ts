import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  createSessionToken,
  passwordOk,
  sessionCookieOptions,
} from "@/lib/auth";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const password = String(body.password || "");
  if (!passwordOk(password, process.env.ADMIN_PASSWORD)) {
    return NextResponse.json({ error: "Contraseña admin incorrecta" }, { status: 401 });
  }
  const token = createSessionToken("admin", "admin");
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, token, sessionCookieOptions());
  return res;
}
