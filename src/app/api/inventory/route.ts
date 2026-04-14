import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("inventory_counts")
    .select("*, ingredients(name,category,unit)")
    .order("counted_at", { ascending: false })
    .limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ counts: data });
}
