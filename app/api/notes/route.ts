import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, getRevisionSession, REVISION_USER } from "@/lib/auth";
import { listCatalogHtmlPages } from "@/lib/catalog";
import { DbConfigError, insertNote, listNotes, publicDbError, updateNoteEstado } from "@/lib/store";
import type { AnotacionEstado } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const user = await getRevisionSession();
  const admin = await getAdminSession();
  if (!user.ok && !admin.ok) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const sp = request.nextUrl.searchParams;
  const pagina = sp.get("pagina");
  const estado = sp.get("estado");
  const orphan = sp.get("orphan") === "1";

  let rows;
  try {
    rows = await listNotes({ pagina, estado });
  } catch (error) {
    const status = error instanceof DbConfigError ? 503 : 500;
    return NextResponse.json({ error: publicDbError(error) }, { status });
  }
  if (orphan) {
    const pages = new Set(listCatalogHtmlPages());
    rows = rows.filter((r) => !pages.has(r.pagina));
  }

  return NextResponse.json({ notes: rows });
}

export async function POST(request: NextRequest) {
  const user = await getRevisionSession();
  if (!user.ok) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const texto = String(body.texto || "").trim();
  const pagina = String(body.pagina || "").trim();
  if (!texto || !pagina) {
    return NextResponse.json({ error: "Faltan texto o página" }, { status: 400 });
  }

  const payload = {
    pagina,
    elemento_selector: body.elemento_selector ? String(body.elemento_selector) : null,
    posicion_x: body.posicion_x != null ? Number(body.posicion_x) : null,
    posicion_y: body.posicion_y != null ? Number(body.posicion_y) : null,
    texto,
    autor: String(body.autor || user.email || REVISION_USER),
    captura_url: body.captura_url ? String(body.captura_url) : null,
  };

  try {
    const note = await insertNote(payload);
    return NextResponse.json({ note });
  } catch (error) {
    const status = error instanceof DbConfigError ? 503 : 500;
    return NextResponse.json({ error: publicDbError(error) }, { status });
  }
}

export async function PATCH(request: NextRequest) {
  const admin = await getAdminSession();
  const user = await getRevisionSession();
  if (!admin.ok && !user.ok) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const id = String(body.id || "");
  const estado = body.estado as AnotacionEstado | undefined;
  if (!id || !estado) {
    return NextResponse.json({ error: "Faltan id o estado" }, { status: 400 });
  }
  if (!["Pendiente", "En curso", "Resuelta"].includes(estado)) {
    return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
  }

  try {
    const note = await updateNoteEstado(id, estado);
    if (!note) return NextResponse.json({ error: "Nota no encontrada" }, { status: 404 });
    return NextResponse.json({ note });
  } catch (error) {
    const message = publicDbError(error);
    const status = error instanceof DbConfigError ? 503 : /invalid input syntax/i.test(message) ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
