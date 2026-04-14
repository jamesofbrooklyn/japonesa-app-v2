import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const days = Number(searchParams.get("days") ?? "7");
  const since = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);

  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("shifts")
    .select("*, staff(name,role,statutory_loaded_rate_php)")
    .gte("shift_date", since);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ days, shifts: data });
}
