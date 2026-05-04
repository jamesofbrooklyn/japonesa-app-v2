/**
 * Pre-shift brief generator.
 *
 * Pulls live data from reservations, inventory counts, waste log, and
 * daily_close to build a compact brief for service.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export interface PreShiftBrief {
  source: "live" | "empty";
  service: string;
  reservations: number;
  vipCount: number;
  eightySixed: string[];
  prepPriorities: string[];
  yesterday: string;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

import { manilaHour, manilaDayOfWeek } from "./dates";

function serviceLabel(): string {
  const now = new Date();
  const hour = manilaHour(now);
  // Japonesa is dinner-only; late-night service kicks in after 22:00.
  const daypart = hour >= 22 || hour < 5 ? "Late Night" : "Dinner";
  const dow = DAYS[manilaDayOfWeek(now)];
  // Use Manila-local month/day to avoid UTC drift past midnight Manila.
  const manilaParts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
  }).formatToParts(now);
  const mon = manilaParts.find((p) => p.type === "month")?.value ?? "";
  const day = manilaParts.find((p) => p.type === "day")?.value ?? "";
  return `${daypart} — ${dow} ${mon} ${day}`;
}

import { manilaToday, manilaYesterday, manilaDaysAgo } from "./dates";

function yesterday(): string {
  return manilaYesterday();
}

function today(): string {
  return manilaToday();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyConcept(q: any, concept?: string): any {
  return concept ? q.eq("concept", concept) : q;
}

export async function generatePreShift(
  sb: SupabaseClient,
  concept?: string
): Promise<PreShiftBrief> {
  const todayStr = today();
  const yesterdayStr = yesterday();
  // Look at the last 7 days of waste so prep priorities reflect a real pattern,
  // not just whatever happened to be logged yesterday. Today's "what hurt last
  // week, fix today" perspective.
  const wasteSince = manilaDaysAgo(7);

  // Fetch in parallel: today's reservations, recent waste, yesterday's close, low inventory
  const [resResult, wasteResult, closeResult, countsResult] = await Promise.all([
    applyConcept(
      sb
        .from("reservations")
        .select("party_size, status, vip")
        .gte("reserved_for", `${todayStr}T00:00:00`)
        .lt("reserved_for", `${todayStr}T23:59:59`),
      concept
    ),
    applyConcept(
      sb
        .from("waste_log")
        .select("qty, reason, ingredients(name), menu_items(name)")
        .gte("occurred_on", wasteSince)
        .order("occurred_on", { ascending: false })
        .limit(50),
      concept
    ),
    applyConcept(
      sb
        .from("daily_close")
        .select("total_revenue_php, covers, close_date")
        .eq("close_date", yesterdayStr),
      concept
    ).maybeSingle() as any,
    applyConcept(
      sb
        .from("inventory_counts")
        .select("qty_on_hand, unit_cost, ingredients(name, unit)")
        .order("counted_at", { ascending: false })
        .limit(200),
      concept
    ),
  ]);

  // Pre-shift is "live" only when there's actual prep-relevant signal (reservations,
  // waste, or inventory counts). Yesterday's close alone isn't enough — the brief
  // would just say "Standard mise en place" with no prep priorities.
  const hasReservations = (resResult.data?.length ?? 0) > 0;
  const hasWaste = (wasteResult.data?.length ?? 0) > 0;
  const hasCounts = (countsResult.data?.length ?? 0) > 0;
  const hasYesterdayClose = closeResult.data !== null && !closeResult.error;
  const hasLiveData = hasReservations || hasWaste || hasCounts;

  if (!hasLiveData) {
    return {
      source: "empty",
      service: serviceLabel(),
      reservations: 0,
      vipCount: 0,
      eightySixed: [],
      prepPriorities: [],
      yesterday: hasYesterdayClose
        ? `Yesterday: ₱${Number(closeResult.data.total_revenue_php).toLocaleString()} revenue, ${closeResult.data.covers} covers.`
        : "No close data yet — submit a daily close to populate.",
    };
  }

  // --- Reservations ---
  const reservations = (resResult.data ?? []).reduce(
    (sum: number, r: any) => sum + Number(r.party_size || 0),
    0
  );
  const vipCount = (resResult.data ?? []).filter(
    (r: any) => r.vip === true
  ).length;

  // --- 86'd items: ingredients with very low counts ---
  const eightySixed: string[] = [];
  const seen = new Set<string>();
  for (const row of (countsResult.data ?? []) as any[]) {
    const name = row.ingredients?.name;
    if (!name || seen.has(name)) continue;
    seen.add(name);
    if (Number(row.qty_on_hand) <= 0.5) {
      eightySixed.push(name);
    }
  }

  // --- Prep priorities from waste patterns ---
  const prepPriorities: string[] = [];
  const wasteCounts = new Map<string, number>();
  for (const w of (wasteResult.data ?? []) as any[]) {
    const name = w.ingredients?.name ?? w.menu_items?.name;
    if (!name) continue;
    wasteCounts.set(name, (wasteCounts.get(name) || 0) + Number(w.qty));
  }
  const sorted = [...wasteCounts.entries()].sort((a, b) => b[1] - a[1]);
  for (const [name, qty] of sorted.slice(0, 3)) {
    prepPriorities.push(
      `Review ${name} prep — ${qty} units wasted in last 7d`
    );
  }
  if (prepPriorities.length === 0) {
    prepPriorities.push("Standard mise en place — no waste in last 7 days");
  }

  // --- Yesterday summary ---
  let yesterdaySummary = "No close data for yesterday.";
  if (closeResult.data) {
    const rev = Number(closeResult.data.total_revenue_php);
    const covers = Number(closeResult.data.covers);
    yesterdaySummary = `Yesterday: ₱${rev.toLocaleString()} revenue, ${covers} covers.`;
  }

  return {
    source: "live",
    service: serviceLabel(),
    reservations,
    vipCount,
    eightySixed: eightySixed.slice(0, 5),
    prepPriorities,
    yesterday: yesterdaySummary,
  };
}
