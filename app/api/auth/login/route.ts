import { NextRequest, NextResponse } from "next/server";
import {
  REVISION_COOKIE,
  REVISION_USER,
  createSessionToken,
  passwordOk,
  sessionCookieOptions,
} from "@/lib/auth";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");

  if (email !== REVISION_USER.toLowerCase()) {
    return NextResponse.json({ error: "Credenciales incorrectas" }, { status: 401 });
  }
  if (!passwordOk(password, process.env.REVISION_PASSWORD)) {
    return NextResponse.json(
      { error: "Credenciales incorrectas (revisa REVISION_PASSWORD en Vercel)" },
      { status: 401 }
    );
  }

  const token = createSessionToken("user", REVISION_USER);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(REVISION_COOKIE, token, sessionCookieOptions());
  return res;
}
