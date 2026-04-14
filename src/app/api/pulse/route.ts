import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { primeCost, foodCostPct, laborCostPct, avgCheck } from "@/lib/kpis";

/**
 * Pulse aggregator: last 7 days of sales/labor/cogs from daily_close + pnl_lines.
 * Wed–Tue weeks per the design spec — for v0 we just use rolling 7d.
 */
export async function GET() {
  const sb = supabaseAdmin();
  const since = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);

  const [{ data: closes }, { data: lines }] = await Promise.all([
    sb.from("daily_close").select("*").gte("close_date", since),
    sb.from("pnl_lines").select("*").gte("occurred_on", since),
  ]);

  const revenue = (closes ?? []).reduce((a, c: any) => a + Number(c.total_revenue_php), 0);
  const covers = (closes ?? []).reduce((a, c: any) => a + Number(c.covers), 0);
  const cogs = (lines ?? [])
    .filter((l: any) => l.category === "cogs")
    .reduce((a, l: any) => a + Number(l.amount_php), 0);
  const labor = (lines ?? [])
    .filter((l: any) => l.category === "labor")
    .reduce((a, l: any) => a + Number(l.amount_php), 0);

  return NextResponse.json({
    window: "rolling_7d",
    revenue,
    covers,
    avgCheck: avgCheck(revenue, covers),
    primeCost: primeCost(cogs, labor, revenue),
    foodCost: foodCostPct(cogs, revenue),
    laborCost: laborCostPct(labor, revenue),
  });
}
