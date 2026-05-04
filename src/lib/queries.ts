/**
 * Shared Supabase query functions for dashboard pages.
 *
 * Every function accepts a Supabase server client (already scoped by RLS)
 * and returns data with a `source` flag: "live" when real rows exist,
 * "empty" when no data has been entered yet.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  primeCost as calcPrimeCost,
  foodCostPct,
  laborCostPct,
  avgCheck as calcAvgCheck,
  revPASH as calcRevPASH,
} from "./kpis";

// ---- types ----
export interface DayPoint {
  date: string;
  revenue: number;
  covers: number;
  cogs: number;
  labor: number;
  food_revenue: number;
  drink_revenue: number;
  food_cogs: number;
  drink_cogs: number;
}

export interface StaffRow {
  id: string;
  name: string;
  role: string;
  tenure_months: number;
  monthly_php: number;
  loaded_php: number;
  hours_7d: number;
  covers_7d: number;
  rev_7d: number;
  productivity: number;
  rating: number;
}

export interface Supplier {
  id: string;
  name: string;
  category: string;
  fill_rate: number;
  on_time: number;
  price_drift: number;
  reject_rate: number;
  spend_30d: number;
}

export interface Reservation {
  date: string;
  daypart: "lunch" | "dinner" | "late_night";
  booked: number;
  walked_in: number;
  no_shows: number;
}

export interface MenuItemSales {
  sku: string;
  name: string;
  category: string;
  variant?: string;
  price: number;
  cost: number;
  qty7d: number;
  qty30d: number;
  margin: number;
  contribution: number;
  quadrant: "star" | "puzzle" | "plowhorse" | "dog";
  type: "food" | "drink";
}

// ---- helpers ----
import { manilaDaysAgo, manilaToday } from "./dates";

function daysAgo(n: number) {
  return manilaDaysAgo(n);
}

/**
 * When `concept` is non-empty, narrow the query. Used by every query that
 * touches a concept-scoped table so an owner with the concept switcher set
 * to "alamat" doesn't see japonesa data leaking in.
 *
 * The `any` types are intentional: Supabase's `.eq` return type is recursive
 * enough that a strict generic here triggers TS2589 ("excessively deep").
 * The runtime contract is the same.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function withConcept(q: any, concept?: string): any {
  return concept ? q.eq("concept", concept) : q;
}

function monthStart() {
  // First day of the current Manila month
  return manilaToday().slice(0, 7) + "-01";
}

// ---- Pulse ----
export interface PulseData {
  source: "live" | "empty";
  revenue: number;
  /** Null when there's no prior 7-day window of data to compare to. */
  revenueDelta: number | null;
  covers: number;
  avgCheck: number;
  cogs: number;
  labor: number;
  foodCost: number;
  laborCost: number;
  primeCost: number;
  revPASH: number;
  cashOnHand: number;
  deposit3d: number;
}

const EMPTY_PULSE: Omit<PulseData, "source"> = {
  revenue: 0,
  revenueDelta: null,
  covers: 0,
  avgCheck: 0,
  cogs: 0,
  labor: 0,
  foodCost: 0,
  laborCost: 0,
  primeCost: 0,
  revPASH: 0,
  cashOnHand: 0,
  deposit3d: 0,
};

export async function fetchPulseData(
  sb: SupabaseClient,
  concept?: string
): Promise<PulseData> {
  const since7 = daysAgo(7);
  const since14 = daysAgo(14);
  const today = manilaToday();

  // Cap windows at today: future-dated entries (e.g., a weekly labor row scheduled
  // for the upcoming Saturday) shouldn't count toward "last 7 days" totals.
  const [{ data: closes }, { data: lines }] = await Promise.all([
    withConcept(sb.from("daily_close").select("*")
      .gte("close_date", since14).lte("close_date", today).order("close_date"), concept),
    withConcept(sb.from("pnl_lines").select("*")
      .gte("occurred_on", since14).lte("occurred_on", today), concept),
  ]);

  if (!closes || closes.length === 0) {
    return { source: "empty", ...EMPTY_PULSE };
  }

  const current = closes.filter((c: any) => c.close_date >= since7);
  const prior = closes.filter((c: any) => c.close_date < since7);

  // Prefer net_revenue_php (post-VAT, post-SC) — the value KPIs are computed against.
  // Falls back to total_revenue_php for rows written before the field split.
  const netRev = (c: any) => Number(c.net_revenue_php ?? c.total_revenue_php ?? 0);
  const revenue = current.reduce((a: number, c: any) => a + netRev(c), 0);
  const prevRevenue = prior.reduce((a: number, c: any) => a + netRev(c), 0);
  const covers = current.reduce((a: number, c: any) => a + Number(c.covers), 0);
  const cashOnHand = current.reduce((a: number, c: any) => a + Number(c.cash_collected_php || 0), 0);

  const last3 = current.slice(-3);
  const deposit3d = last3.reduce((a: number, c: any) => a + Number(c.deposit_amount_php || 0), 0);

  const currentLines = (lines ?? []).filter((l: any) => l.occurred_on >= since7);
  const cogs = currentLines
    .filter((l: any) => l.category === "cogs")
    .reduce((a: number, l: any) => a + Number(l.amount_php), 0);
  const labor = currentLines
    .filter((l: any) => l.category === "labor")
    .reduce((a: number, l: any) => a + Number(l.amount_php), 0);

  const seats = 56;
  const hoursOpen = 7 * 9;

  return {
    source: "live",
    revenue,
    revenueDelta: prior.length > 0 && prevRevenue > 0
      ? (revenue - prevRevenue) / prevRevenue
      : null,
    covers,
    avgCheck: calcAvgCheck(revenue, covers),
    cogs,
    labor,
    foodCost: foodCostPct(cogs, revenue),
    laborCost: laborCostPct(labor, revenue),
    primeCost: calcPrimeCost(cogs, labor, revenue),
    revPASH: calcRevPASH(revenue, seats, hoursOpen),
    cashOnHand,
    deposit3d,
  };
}

// ---- Pulse History ----
export interface PulseHistoryData {
  source: "live" | "empty";
  daily: DayPoint[];
}

export async function fetchPulseHistory(
  sb: SupabaseClient,
  days = 30,
  concept?: string
): Promise<PulseHistoryData> {
  const since = daysAgo(days + 12);

  const { data: closes } = await withConcept(
    sb
      .from("daily_close")
      .select("close_date, total_revenue_php, net_revenue_php, covers")
      .gte("close_date", since)
      .order("close_date"),
    concept
  );

  if (!closes || closes.length === 0) {
    return { source: "empty", daily: [] };
  }

  const daily: DayPoint[] = closes.map((c: any) => ({
    date: c.close_date,
    revenue: Number(c.net_revenue_php ?? c.total_revenue_php ?? 0),
    covers: Number(c.covers),
    cogs: 0,
    labor: 0,
    food_revenue: 0,
    drink_revenue: 0,
    food_cogs: 0,
    drink_cogs: 0,
  }));

  return { source: "live", daily };
}

// ---- Red Flags (rule-based) ----
export interface RedFlag {
  severity: "high" | "med";
  title: string;
  detail: string;
}

export interface RedFlagData {
  source: "live" | "empty";
  flags: RedFlag[];
}

export async function fetchRedFlags(
  sb: SupabaseClient,
  concept?: string
): Promise<RedFlagData> {
  const since = daysAgo(7);
  const today = manilaToday();

  const [{ data: closes }, { data: lines }] = await Promise.all([
    withConcept(
      sb.from("daily_close").select("*").gte("close_date", since).lte("close_date", today),
      concept
    ),
    withConcept(
      sb.from("pnl_lines").select("*").gte("occurred_on", since).lte("occurred_on", today),
      concept
    ),
  ]);

  if (!closes || closes.length === 0) {
    return { source: "empty", flags: [] };
  }

  const flags: RedFlag[] = [];
  const revenue = closes.reduce(
    (a: number, c: any) => a + Number(c.net_revenue_php ?? c.total_revenue_php ?? 0),
    0
  );
  const cogs = (lines ?? [])
    .filter((l: any) => l.category === "cogs")
    .reduce((a: number, l: any) => a + Number(l.amount_php), 0);
  const labor = (lines ?? [])
    .filter((l: any) => l.category === "labor")
    .reduce((a: number, l: any) => a + Number(l.amount_php), 0);

  if (revenue > 0) {
    const fc = cogs / revenue;
    if (fc > 0.34) {
      flags.push({
        severity: "high",
        title: `Food cost running at ${(fc * 100).toFixed(1)}%`,
        detail: "Target is 28-32%. Review supplier pricing and waste log.",
      });
    }
    const lc = labor / revenue;
    if (lc > 0.30) {
      flags.push({
        severity: "med",
        title: `Labor cost at ${(lc * 100).toFixed(1)}% of revenue`,
        detail: "Target is 26-30%. Review shift scheduling for overstaffing.",
      });
    }
  }

  for (const c of closes) {
    const variance = Math.abs(Number(c.cash_variance_php || 0));
    if (variance > 1000) {
      flags.push({
        severity: "high",
        title: `Cash variance ₱${variance.toLocaleString()} on ${c.close_date}`,
        detail: "Investigate cash handling procedures for this day.",
      });
    }
  }

  return { source: "live", flags };
}

// ---- P&L MTD ----
export interface PnlMTDData {
  source: "live" | "empty";
  revenue: number;
  cogs: number;
  labor: number;
  rent: number;
  utilities: number;
  marketing: number;
  other_opex: number;
  ebitda: number;
  food_pct: number;
  labor_pct: number;
  prime_pct: number;
  ebitda_pct: number;
}

const EMPTY_PNL: Omit<PnlMTDData, "source"> = {
  revenue: 0,
  cogs: 0,
  labor: 0,
  rent: 0,
  utilities: 0,
  marketing: 0,
  other_opex: 0,
  ebitda: 0,
  food_pct: 0,
  labor_pct: 0,
  prime_pct: 0,
  ebitda_pct: 0,
};

export async function fetchPnlMTD(
  sb: SupabaseClient,
  concept?: string
): Promise<PnlMTDData> {
  const start = monthStart();
  const today = manilaToday();

  // Cap at today: future-dated PNL entries (e.g., labor accrual posted to next
  // Saturday's date) should NOT inflate MTD totals before they've actually
  // accrued. Otherwise EBITDA can read negative early in the month from
  // phantom future expenses.
  const [{ data: closes }, { data: lines }] = await Promise.all([
    withConcept(
      sb.from("daily_close").select("total_revenue_php, net_revenue_php")
        .gte("close_date", start).lte("close_date", today),
      concept
    ),
    withConcept(
      sb.from("pnl_lines").select("category, amount_php")
        .gte("occurred_on", start).lte("occurred_on", today),
      concept
    ),
  ]);

  if ((!closes || closes.length === 0) && (!lines || lines.length === 0)) {
    return { source: "empty", ...EMPTY_PNL };
  }

  const revenue = (closes ?? []).reduce(
    (a: number, c: any) => a + Number(c.net_revenue_php ?? c.total_revenue_php ?? 0),
    0
  );

  const byCategory = (cat: string) =>
    (lines ?? [])
      .filter((l: any) => l.category === cat)
      .reduce((a: number, l: any) => a + Number(l.amount_php), 0);

  const cogs = byCategory("cogs");
  const labor = byCategory("labor");
  const rent = byCategory("rent");
  const utilities = byCategory("utilities");
  const marketing = byCategory("marketing");
  const other_opex = byCategory("other");

  const ebitda = revenue - cogs - labor - rent - utilities - marketing - other_opex;

  return {
    source: "live",
    revenue,
    cogs,
    labor,
    rent,
    utilities,
    marketing,
    other_opex,
    ebitda,
    food_pct: revenue > 0 ? cogs / revenue : 0,
    labor_pct: revenue > 0 ? labor / revenue : 0,
    prime_pct: revenue > 0 ? (cogs + labor) / revenue : 0,
    ebitda_pct: revenue > 0 ? ebitda / revenue : 0,
  };
}

// ---- Staff ----
export interface StaffData {
  source: "live" | "empty";
  staff: StaffRow[];
  totals: { headcount: number; monthly_loaded: number; weekly_loaded: number };
}

export async function fetchStaffList(
  sb: SupabaseClient,
  concept?: string
): Promise<StaffData> {
  const { data: staff } = await withConcept(
    sb
      .from("staff")
      .select("*")
      .eq("active", true)
      .order("role")
      .order("name"),
    concept
  );

  if (!staff || staff.length === 0) {
    return {
      source: "empty",
      staff: [],
      totals: { headcount: 0, monthly_loaded: 0, weekly_loaded: 0 },
    };
  }

  // Convert any rate_unit to a monthly figure. PH F&B norms:
  //   daily   × 26 working days/mo
  //   hourly  × 8 hours × 26 days
  // Then apply the statutory load factor. Industry-correct for regular
  // F&B employees: SSS employer ~9.5% + PhilHealth ~2.5% + Pag-IBIG ~1% +
  // 13th-month accrual 8.33% + holiday/SIL accruals ~5-6% = ~27% load.
  // Probationary/contractual is lower (~10%) since 13th and SIL aren't
  // accrued the same way.
  const loadFactor = (employmentType: string | null): number => {
    if (employmentType === "contractual" || employmentType === "probationary") return 1.10;
    return 1.27;
  };
  const baseToMonthly = (base: number, unit: string | null): number => {
    if (unit === "daily") return base * 26;
    if (unit === "hourly") return base * 8 * 26;
    return base; // monthly is the default
  };

  const mapped: StaffRow[] = staff.map((s: any) => {
    const baseMonthly = baseToMonthly(Number(s.base_rate_php), s.rate_unit);
    const loaded = Number(s.statutory_loaded_rate_php) > 0
      ? Number(s.statutory_loaded_rate_php)
      : Math.round(baseMonthly * loadFactor(s.employment_type));
    return {
      id: s.id,
      name: s.name,
      role: s.role,
      tenure_months: s.hire_date
        ? Math.round(
            (Date.now() - new Date(s.hire_date).getTime()) / (30.44 * 86_400_000)
          )
        : 0,
      monthly_php: baseMonthly,
      loaded_php: loaded,
      hours_7d: 0,
      covers_7d: 0,
      rev_7d: 0,
      productivity: 0,
      rating: 0,
    };
  });

  const monthly_loaded = mapped.reduce((a, b) => a + b.loaded_php, 0);

  return {
    source: "live",
    staff: mapped,
    totals: {
      headcount: mapped.length,
      monthly_loaded,
      weekly_loaded: monthly_loaded / 4.33,
    },
  };
}

// ---- Menu Engineering ----
export interface MenuEngData {
  source: "live" | "empty";
  items: MenuItemSales[];
  quadrantCounts: { star: number; puzzle: number; plowhorse: number; dog: number };
}

export async function fetchMenuEngineering(
  sb: SupabaseClient,
  days = 30,
  concept?: string
): Promise<MenuEngData> {
  const since = daysAgo(days);

  const [{ data: menuItems }, { data: sales }] = await Promise.all([
    withConcept(
      sb.from("menu_items").select("id, sku, name, category, variant, price_php, theoretical_cost_php").eq("active", true),
      concept
    ),
    withConcept(
      sb.from("sales").select("menu_item_id, qty, gross_php").gte("sold_at", since),
      concept
    ),
  ]);

  if (!sales || sales.length === 0) {
    return {
      source: "empty",
      items: [],
      quadrantCounts: { star: 0, puzzle: 0, plowhorse: 0, dog: 0 },
    };
  }

  const velMap = new Map<string, { qty: number; revenue: number }>();
  for (const s of sales) {
    const key = s.menu_item_id;
    if (!key) continue;
    const prev = velMap.get(key) || { qty: 0, revenue: 0 };
    velMap.set(key, {
      qty: prev.qty + Number(s.qty),
      revenue: prev.revenue + Number(s.gross_php),
    });
  }

  const items: MenuItemSales[] = (menuItems ?? []).map((mi: any) => {
    const vel = velMap.get(mi.id) || { qty: 0, revenue: 0 };
    const cost = Number(mi.theoretical_cost_php || 0);
    const price = Number(mi.price_php);
    const margin = price - cost;
    const qty30d = vel.qty;
    const qty7d = Math.round((qty30d / days) * 7);
    return {
      sku: mi.sku,
      name: mi.name + (mi.variant ? ` (${mi.variant})` : ""),
      category: mi.category,
      variant: mi.variant,
      price,
      cost,
      qty7d,
      qty30d,
      margin,
      contribution: margin * qty30d,
      quadrant: "dog" as const,
      type: (mi.category === "drinks" ? "drink" : "food") as "food" | "drink",
    };
  });

  const avgMargin = items.reduce((a, b) => a + b.margin, 0) / (items.length || 1);
  const avgVel = items.reduce((a, b) => a + b.qty30d, 0) / (items.length || 1);
  items.forEach((r) => {
    const hm = r.margin >= avgMargin;
    const hv = r.qty30d >= avgVel;
    r.quadrant = hm ? (hv ? "star" : "puzzle") : hv ? "plowhorse" : "dog";
  });

  const quadrantCounts = { star: 0, puzzle: 0, plowhorse: 0, dog: 0 };
  items.forEach((i) => quadrantCounts[i.quadrant]++);

  return { source: "live", items, quadrantCounts };
}

// ---- Suppliers ----
export interface SuppliersData {
  source: "live" | "empty";
  suppliers: Supplier[];
}

export async function fetchSuppliers(
  sb: SupabaseClient,
  concept?: string
): Promise<SuppliersData> {
  const since30 = daysAgo(30);

  // Suppliers themselves are shared reference data (no concept column).
  // Spend, however, must be filtered to the active concept's POs.
  const [{ data: suppliers }, { data: pos }] = await Promise.all([
    sb.from("suppliers").select("*").order("name"),
    withConcept(
      sb
        .from("purchase_orders")
        .select("supplier_id, total, status, ordered_at")
        .gte("ordered_at", since30)
        .neq("status", "cancelled"),
      concept
    ),
  ]);

  if (!suppliers || suppliers.length === 0) {
    return { source: "empty", suppliers: [] };
  }

  const spendBySupplier = new Map<string, number>();
  for (const po of pos ?? []) {
    const sid = (po as any).supplier_id;
    if (!sid) continue;
    spendBySupplier.set(sid, (spendBySupplier.get(sid) ?? 0) + Number((po as any).total ?? 0));
  }

  const mapped: Supplier[] = suppliers.map((s: any) => ({
    id: s.id,
    name: s.name,
    category: s.category || "",
    // Performance metrics (fill_rate, on_time, price_drift, reject_rate) require
    // delivery/receiving data we don't track yet — left at 0 and hidden in UI
    // until v1.1 surfaces a real PO receiving flow.
    fill_rate: 0,
    on_time: 0,
    price_drift: 0,
    reject_rate: 0,
    spend_30d: spendBySupplier.get(s.id) ?? 0,
  }));

  return { source: "live", suppliers: mapped };
}

// ---- Reservations ----
export interface ReservationsData {
  source: "live" | "empty";
  reservations: Reservation[];
}

export async function fetchReservations(
  sb: SupabaseClient,
  days = 7,
  concept?: string
): Promise<ReservationsData> {
  const since = daysAgo(days);

  const { data: rows } = await withConcept(
    sb
      .from("reservations")
      .select("reserved_for, status, party_size")
      .gte("reserved_for", since),
    concept
  );

  if (!rows || rows.length === 0) {
    return { source: "empty", reservations: [] };
  }

  const dows = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dayparts: Array<"lunch" | "dinner" | "late_night"> = [
    "lunch",
    "dinner",
    "late_night",
  ];
  const buckets = new Map<
    string,
    { booked: number; walked_in: number; no_shows: number }
  >();

  for (const r of rows) {
    const d = new Date(r.reserved_for);
    const dow = dows[d.getDay()];
    const hour = d.getHours();
    const daypart: "lunch" | "dinner" | "late_night" =
      hour < 15 ? "lunch" : hour < 22 ? "dinner" : "late_night";
    const key = `${dow}-${daypart}`;
    const b = buckets.get(key) || { booked: 0, walked_in: 0, no_shows: 0 };
    if (r.status === "no_show") b.no_shows += r.party_size;
    else if (r.status === "walk_in") b.walked_in += r.party_size;
    else b.booked += r.party_size;
    buckets.set(key, b);
  }

  const reservations: Reservation[] = [];
  for (const dow of ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]) {
    for (const dp of dayparts) {
      const b = buckets.get(`${dow}-${dp}`) || {
        booked: 0,
        walked_in: 0,
        no_shows: 0,
      };
      reservations.push({ date: dow, daypart: dp, ...b });
    }
  }

  return { source: "live", reservations };
}

// ---- Inventory Counts ----
export interface InventoryCountRow {
  ingredient_id: string;
  ingredient_name: string;
  category: string;
  unit: string;
  qty_on_hand: number;
  unit_cost: number;
  counted_at: string;
}

export interface InventoryCountsData {
  source: "live" | "empty";
  counts: InventoryCountRow[];
}

export async function fetchLatestCounts(
  sb: SupabaseClient,
  concept?: string
): Promise<InventoryCountsData> {
  const { data } = await withConcept(
    sb
      .from("inventory_counts")
      .select("ingredient_id, qty_on_hand, unit_cost, counted_at, ingredients(name, category, unit)")
      .order("counted_at", { ascending: false })
      .limit(500),
    concept
  );

  if (!data || data.length === 0) {
    return { source: "empty", counts: [] };
  }

  const seen = new Set<string>();
  const counts: InventoryCountRow[] = [];
  for (const row of data as any[]) {
    if (seen.has(row.ingredient_id)) continue;
    seen.add(row.ingredient_id);
    counts.push({
      ingredient_id: row.ingredient_id,
      ingredient_name: row.ingredients?.name ?? "Unknown",
      category: row.ingredients?.category ?? "",
      unit: row.ingredients?.unit ?? "",
      qty_on_hand: Number(row.qty_on_hand),
      unit_cost: Number(row.unit_cost),
      counted_at: row.counted_at,
    });
  }

  return { source: "live", counts };
}

// ---- Active POs ----
export interface ActivePORow {
  id: string;
  po_number: string;
  supplier_name: string;
  status: string;
  ordered_at: string;
  expected_at: string | null;
  total: number;
  line_items: any[];
}

export interface ActivePOsData {
  source: "live" | "empty";
  orders: ActivePORow[];
}

export async function fetchActivePOs(
  sb: SupabaseClient,
  concept?: string
): Promise<ActivePOsData> {
  const { data } = await withConcept(
    sb
      .from("purchase_orders")
      .select("id, po_number, status, ordered_at, expected_at, total, line_items, suppliers(name)")
      .not("status", "in", '("logged","cancelled")')
      .order("ordered_at", { ascending: false })
      .limit(50),
    concept
  );

  if (!data || data.length === 0) {
    return { source: "empty", orders: [] };
  }

  const orders: ActivePORow[] = (data as any[]).map((po) => ({
    id: po.id,
    po_number: po.po_number || "",
    supplier_name: po.suppliers?.name ?? "Unknown",
    status: po.status,
    ordered_at: po.ordered_at,
    expected_at: po.expected_at,
    total: Number(po.total || 0),
    line_items: po.line_items || [],
  }));

  return { source: "live", orders };
}

// ---- Waste Log ----
export interface WasteRow {
  id: string;
  occurred_on: string;
  ingredient_name: string | null;
  menu_item_name: string | null;
  qty: number;
  reason: string;
}

export interface WasteData {
  source: "live" | "empty";
  entries: WasteRow[];
}

export async function fetchRecentWaste(
  sb: SupabaseClient,
  days = 30,
  concept?: string
): Promise<WasteData> {
  const since = daysAgo(days);

  const { data } = await withConcept(
    sb
      .from("waste_log")
      .select("id, occurred_on, qty, reason, ingredients(name), menu_items(name)")
      .gte("occurred_on", since)
      .order("occurred_on", { ascending: false })
      .limit(100),
    concept
  );

  if (!data || data.length === 0) {
    return { source: "empty", entries: [] };
  }

  const entries: WasteRow[] = (data as any[]).map((w) => ({
    id: w.id,
    occurred_on: w.occurred_on,
    ingredient_name: w.ingredients?.name ?? null,
    menu_item_name: w.menu_items?.name ?? null,
    qty: Number(w.qty),
    reason: w.reason,
  }));

  return { source: "live", entries };
}
