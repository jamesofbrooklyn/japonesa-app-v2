import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { classifyMenu, type MenuItemPerf } from "@/lib/kpis";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const days = Number(searchParams.get("days") ?? "30");

  const sb = supabaseAdmin();
  const since = new Date(Date.now() - days * 86_400_000).toISOString();

  const { data: items, error: itemsErr } = await sb
    .from("menu_items")
    .select("id,name,category,price_php,theoretical_cost_php")
    .eq("active", true);

  if (itemsErr) return NextResponse.json({ error: itemsErr.message }, { status: 500 });

  const { data: sales } = await sb
    .from("sales")
    .select("menu_item_id,qty")
    .gte("sold_at", since);

  const velocityMap = new Map<string, number>();
  (sales ?? []).forEach((s: any) => {
    velocityMap.set(s.menu_item_id, (velocityMap.get(s.menu_item_id) ?? 0) + s.qty);
  });

  const perf: MenuItemPerf[] = (items ?? []).map((i: any) => ({
    id: i.id,
    name: i.name,
    category: i.category,
    price: Number(i.price_php),
    cost: i.theoretical_cost_php != null ? Number(i.theoretical_cost_php) : null,
    qtySold: velocityMap.get(i.id) ?? 0,
  }));

  return NextResponse.json({ days, items: classifyMenu(perf) });
}
