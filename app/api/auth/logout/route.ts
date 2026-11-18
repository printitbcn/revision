import { NextResponse } from "next/server";
import { ADMIN_COOKIE, REVISION_COOKIE, sessionCookieOptions } from "@/lib/auth";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(REVISION_COOKIE, "", { ...sessionCookieOptions(0), maxAge: 0 });
  res.cookies.set(ADMIN_COOKIE, "", { ...sessionCookieOptions(0), maxAge: 0 });
  return res;
}
