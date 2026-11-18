import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, getRevisionSession, REVISION_USER } from "@/lib/auth";
import { getServiceSupabase, type AnotacionEstado } from "@/lib/supabase";
import { listCatalogHtmlPages } from "@/lib/catalog";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const user = await getRevisionSession();
  if (!user.ok) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const sp = request.nextUrl.searchParams;
  const pagina = sp.get("pagina");
  const estado = sp.get("estado");
  const orphan = sp.get("orphan") === "1";

  const sb = getServiceSupabase();
  let q = sb.from("anotaciones").select("*").order("created_at", { ascending: false });
  if (pagina) q = q.eq("pagina", pagina);
  if (estado) q = q.eq("estado", estado);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let rows = data || [];
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
    estado: "Pendiente" as AnotacionEstado,
    captura_url: body.captura_url ? String(body.captura_url) : null,
  };

  const sb = getServiceSupabase();
  const { data, error } = await sb.from("anotaciones").insert(payload).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ note: data });
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

  const sb = getServiceSupabase();
  const { data, error } = await sb
    .from("anotaciones")
    .update({ estado, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ note: data });
}
