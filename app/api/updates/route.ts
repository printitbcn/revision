import { NextResponse } from "next/server";
import { getRevisionSession } from "@/lib/auth";
import { getServiceSupabase } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET() {
  const user = await getRevisionSession();
  if (!user.ok) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const sb = getServiceSupabase();
    const { data, error } = await sb
      .from("actualizaciones")
      .select("*")
      .order("fecha", { ascending: false })
      .limit(100);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ updates: data || [] });
  } catch (e) {
    return NextResponse.json({
      updates: [],
      warning: e instanceof Error ? e.message : "Supabase no configurado",
    });
  }
}
