import { NextResponse } from "next/server";
import { getRevisionSession } from "@/lib/auth";
import { DbConfigError, listUpdates, publicDbError } from "@/lib/store";

export const runtime = "nodejs";

export async function GET() {
  const user = await getRevisionSession();
  if (!user.ok) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const updates = await listUpdates();
    return NextResponse.json({ updates });
  } catch (error) {
    if (error instanceof DbConfigError) {
      return NextResponse.json({ updates: [], warning: error.message });
    }
    return NextResponse.json({ error: publicDbError(error) }, { status: 500 });
  }
}
