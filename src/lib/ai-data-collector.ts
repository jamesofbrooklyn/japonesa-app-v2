/**
 * Collects structured data from Supabase for Claude AI analysis.
 * Gathers daily_close, pnl_lines, sales, inventory, waste, and staff
 * into a compact bundle suitable for prompt injection.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export interface WeeklyDataBundle {
  period: { start: string; end: string };
  daily_closes: Array<{
    date: string;
    revenue: number;
    covers: number;
    cash_variance: number;
    tips: number;
    notes: string | null;
  }>;
  pnl_summary: {
    revenue: number;
    cogs: number;
    labor: number;
    rent: number;
    utilities: number;
    marketing: number;
    other: number;
    food_cost_pct: number;
    labor_cost_pct: number;
    prime_cost_pct: number;
  };
  top_sellers: Array<{ name: string; qty: number; revenue: number }>;
  worst_sellers: Array<{ name: string; qty: number; revenue: number }>;
  waste: Array<{ item: string; qty: number; reason: string; date: string }>;
  inventory_alerts: Array<{ item: string; qty_on_hand: number; unit: string }>;
  active_pos: Array<{ po_number: string; supplier: string; status: string; total: number }>;
  staff_count: number;
  staff_monthly_loaded: number;
}

import { manilaDaysAgo } from "./dates";

function daysAgo(n: number): string {
  return manilaDaysAgo(n);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function withConcept(q: any, concept?: string): any {
  return concept ? q.eq("concept", concept) : q;
}

export async function collectWeeklyData(
  sb: SupabaseClient,
  concept?: string
): Promise<WeeklyDataBundle | null> {
  const end = daysAgo(0);
  const start = daysAgo(7);

  const [closesRes, linesRes, salesRes, wasteRes, countsRes, posRes, staffRes] =
    await Promise.all([
      withConcept(
        sb
          .from("daily_close")
          .select("close_date, total_revenue_php, covers, cash_variance_php, tip_pool_php, gm_notes")
          .gte("close_date", start)
          .order("close_date"),
        concept
      ),
      withConcept(
        sb
          .from("pnl_lines")
          .select("category, amount_php")
          .gte("occurred_on", start),
        concept
      ),
      withConcept(
        sb
          .from("sales")
          .select("menu_item_id, qty, gross_php, menu_items(name)")
          .gte("sold_at", start),
        concept
      ),
      withConcept(
        sb
          .from("waste_log")
          .select("occurred_on, qty, reason, ingredients(name), menu_items(name)")
          .gte("occurred_on", start)
          .order("occurred_on", { ascending: false }),
        concept
      ),
      withConcept(
        sb
          .from("inventory_counts")
          .select("qty_on_hand, ingredients(name, unit)")
          .order("counted_at", { ascending: false })
          .limit(200),
        concept
      ),
      withConcept(
        sb
          .from("purchase_orders")
          .select("po_number, status, total, suppliers(name)")
          .not("status", "in", '("logged","cancelled")')
          .order("ordered_at", { ascending: false })
          .limit(20),
        concept
      ),
      withConcept(
        sb
          .from("staff")
          .select("base_rate_php, rate_unit, employment_type, statutory_loaded_rate_php")
          .eq("active", true),
        concept
      ),
    ]);

  const closes = closesRes.data ?? [];
  const lines = linesRes.data ?? [];

  // Need at least some close data to produce meaningful analysis
  if (closes.length === 0 && lines.length === 0) {
    return null;
  }

  const revenue = closes.reduce((a: number, c: any) => a + Number(c.total_revenue_php), 0);

  const byCategory = (cat: string) =>
    lines
      .filter((l: any) => l.category === cat)
      .reduce((a: number, l: any) => a + Number(l.amount_php), 0);

  const cogs = byCategory("cogs");
  const labor = byCategory("labor");

  // Sales aggregation
  const salesMap = new Map<string, { name: string; qty: number; revenue: number }>();
  for (const s of (salesRes.data ?? []) as any[]) {
    const name = s.menu_items?.name ?? "Unknown";
    const prev = salesMap.get(name) || { name, qty: 0, revenue: 0 };
    salesMap.set(name, {
      name,
      qty: prev.qty + Number(s.qty),
      revenue: prev.revenue + Number(s.gross_php),
    });
  }
  const allSales = [...salesMap.values()].sort((a, b) => b.revenue - a.revenue);

  // Low inventory
  const seen = new Set<string>();
  const lowInventory: Array<{ item: string; qty_on_hand: number; unit: string }> = [];
  for (const row of (countsRes.data ?? []) as any[]) {
    const name = row.ingredients?.name;
    if (!name || seen.has(name)) continue;
    seen.add(name);
    const qty = Number(row.qty_on_hand);
    if (qty <= 2) {
      lowInventory.push({ item: name, qty_on_hand: qty, unit: row.ingredients?.unit ?? "" });
    }
  }

  return {
    period: { start, end },
    daily_closes: closes.map((c: any) => ({
      date: c.close_date,
      revenue: Number(c.total_revenue_php),
      covers: Number(c.covers),
      cash_variance: Number(c.cash_variance_php || 0),
      tips: Number(c.tip_pool_php || 0),
      notes: c.gm_notes,
    })),
    pnl_summary: {
      revenue,
      cogs,
      labor,
      rent: byCategory("rent"),
      utilities: byCategory("utilities"),
      marketing: byCategory("marketing"),
      other: byCategory("other"),
      food_cost_pct: revenue > 0 ? cogs / revenue : 0,
      labor_cost_pct: revenue > 0 ? labor / revenue : 0,
      prime_cost_pct: revenue > 0 ? (cogs + labor) / revenue : 0,
    },
    top_sellers: allSales.slice(0, 10),
    worst_sellers: allSales.slice(-5).reverse(),
    waste: ((wasteRes.data ?? []) as any[]).map((w) => ({
      item: w.ingredients?.name ?? w.menu_items?.name ?? "Unknown",
      qty: Number(w.qty),
      reason: w.reason,
      date: w.occurred_on,
    })),
    inventory_alerts: lowInventory,
    active_pos: ((posRes.data ?? []) as any[]).map((po) => ({
      po_number: po.po_number ?? "",
      supplier: po.suppliers?.name ?? "Unknown",
      status: po.status,
      total: Number(po.total || 0),
    })),
    staff_count: (staffRes.data ?? []).length,
    staff_monthly_loaded: (staffRes.data ?? []).reduce((a: number, s: any) => {
      // Use the persisted loaded rate if set; otherwise fall back to a 1.27 factor
      // applied to the monthly-equivalent base. See queries.ts fetchStaffList for
      // the canonical load math.
      if (Number(s.statutory_loaded_rate_php) > 0) return a + Number(s.statutory_loaded_rate_php);
      const base = Number(s.base_rate_php);
      const monthly = s.rate_unit === "daily" ? base * 26 : s.rate_unit === "hourly" ? base * 8 * 26 : base;
      const factor = s.employment_type === "regular" ? 1.27 : 1.10;
      return a + monthly * factor;
    }, 0),
  };
}
