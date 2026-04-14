/**
 * Deterministic mock data for the dashboard.
 *
 * Everything in here is fake. Generated from a fixed seed so refreshes are stable.
 * Replace with Supabase queries as each phase ships.
 */
import seed from "@/data/menu-seed.json";

// ---- seeded RNG ---------------------------------------------------
function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260414);
const between = (lo: number, hi: number) => lo + rand() * (hi - lo);
const intBetween = (lo: number, hi: number) => Math.floor(between(lo, hi + 1));

// ---- types --------------------------------------------------------
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
  productivity: number; // revenue per labor peso
  rating: number;
}

export interface Supplier {
  id: string;
  name: string;
  category: string;
  fill_rate: number;
  on_time: number;
  price_drift: number; // % vs 90d avg
  reject_rate: number;
  spend_30d: number;
}

export interface InventoryRow {
  ingredient: string;
  category: string;
  on_hand: number;
  unit: string;
  par: number;
  days_on_hand: number;
  status: "ok" | "low" | "out";
  last_count: string;
}

export interface Reservation {
  date: string;
  daypart: "lunch" | "dinner" | "late_night";
  booked: number;
  walked_in: number;
  no_shows: number;
}

// ---- 30-day daily series ------------------------------------------
const today = new Date("2026-04-13"); // Mon — most recent full day
function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export const DAILY: DayPoint[] = (() => {
  const out: DayPoint[] = [];
  for (let i = 41; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dow = d.getDay(); // 0=Sun
    // Poblacion: dead Mon/Tue, building Wed-Thu, peak Fri-Sat, strong Sun brunch
    const base =
      dow === 1 ? 110_000 :
      dow === 2 ? 125_000 :
      dow === 3 ? 165_000 :
      dow === 4 ? 195_000 :
      dow === 5 ? 385_000 :
      dow === 6 ? 465_000 :
                  280_000;
    const wobble = between(0.88, 1.12);
    const revenue = Math.round(base * wobble);
    const covers = Math.round(revenue / between(1650, 1950));
    const cogs = Math.round(revenue * between(0.295, 0.335));
    const labor = Math.round(revenue * between(0.255, 0.305));
    const drink_pct = between(0.28, 0.36);
    const drink_revenue = Math.round(revenue * drink_pct);
    const food_revenue = revenue - drink_revenue;
    const drink_cogs = Math.round(drink_revenue * between(0.22, 0.28));
    const food_cogs = cogs - drink_cogs;
    out.push({ date: isoDate(d), revenue, covers, cogs, labor, food_revenue, drink_revenue, food_cogs, drink_cogs });
  }
  return out;
})();

export const LAST_7D = DAILY.slice(-7);
export const PRIOR_7D = DAILY.slice(-14, -7);
export const LAST_30D = DAILY.slice(-30);

const sum = <T,>(xs: T[], fn: (t: T) => number) => xs.reduce((a, b) => a + fn(b), 0);

export const PULSE = (() => {
  const rev = sum(LAST_7D, (d) => d.revenue);
  const prevRev = sum(PRIOR_7D, (d) => d.revenue);
  const covers = sum(LAST_7D, (d) => d.covers);
  const cogs = sum(LAST_7D, (d) => d.cogs);
  const labor = sum(LAST_7D, (d) => d.labor);
  const food_revenue = sum(LAST_7D, (d) => d.food_revenue);
  const drink_revenue = sum(LAST_7D, (d) => d.drink_revenue);
  const food_cogs = sum(LAST_7D, (d) => d.food_cogs);
  const drink_cogs = sum(LAST_7D, (d) => d.drink_cogs);
  const seats = 56;
  const hoursOpen = 7 * 9; // 9 service hours/day
  return {
    revenue: rev,
    revenueDelta: (rev - prevRev) / prevRev,
    covers,
    avgCheck: rev / covers,
    cogs,
    labor,
    food_revenue,
    drink_revenue,
    food_cogs,
    drink_cogs,
    foodCost: cogs / rev,
    foodCostPct: food_cogs / food_revenue,
    drinkCostPct: drink_cogs / drink_revenue,
    laborCost: labor / rev,
    primeCost: (cogs + labor) / rev,
    revPASH: rev / (seats * hoursOpen),
    cashOnHand: 1_240_000,
    deposit3d: 920_000,
  };
})();

export const RED_FLAGS = [
  {
    severity: "high" as const,
    title: "Hamachi Sashimi food cost spiked to 41%",
    detail: "JPY shipment 8% costlier this week. Re-price or swap supplier.",
  },
  {
    severity: "med" as const,
    title: "Saturday labor ran 32% of revenue",
    detail: "Two extra runners scheduled 6–10pm; covers were flat WoW.",
  },
  {
    severity: "med" as const,
    title: "La Japonesa 8pc out of stock 3x this week",
    detail: "Spicy tuna 86'd 2x dinner service. Par level needs +20%.",
  },
];

// ---- drink menu items --------------------------------------------
const DRINK_ITEMS_SEED = [
  { sku: "DRK-SKJ-GL",  category: "drinks", name: "Junmai Daiginjo Sake", variant: "glass",   price_php: 395,   is_popular: true  },
  { sku: "DRK-SKH-GL",  category: "drinks", name: "Honjozo Sake",          variant: "glass",   price_php: 275,   is_popular: false },
  { sku: "DRK-SKJ-CAR", category: "drinks", name: "Junmai Daiginjo Sake", variant: "carafe",  price_php: 895,   is_popular: false },
  { sku: "DRK-YAM",     category: "drinks", name: "Yamazaki 12yr",         variant: "pour",    price_php: 1_200, is_popular: true  },
  { sku: "DRK-HIB",     category: "drinks", name: "Hibiki Harmony",        variant: "pour",    price_php: 850,   is_popular: true  },
  { sku: "DRK-TOK-HI",  category: "drinks", name: "Toki Highball",         variant: undefined, price_php: 450,   is_popular: true  },
  { sku: "DRK-NIK-SOU", category: "drinks", name: "Nikkei Sour",           variant: undefined, price_php: 425,   is_popular: true  },
  { sku: "DRK-YUZ-MAR", category: "drinks", name: "Yuzu Margarita",        variant: undefined, price_php: 445,   is_popular: true  },
  { sku: "DRK-UME-SPR", category: "drinks", name: "Ume Spritz",            variant: undefined, price_php: 395,   is_popular: false },
  { sku: "DRK-WIN-RED", category: "drinks", name: "House Red Wine",        variant: "glass",   price_php: 295,   is_popular: false },
  { sku: "DRK-WIN-WHT", category: "drinks", name: "House White Wine",      variant: "glass",   price_php: 295,   is_popular: false },
  { sku: "DRK-WIN-SPK", category: "drinks", name: "Sparkling Wine",        variant: "glass",   price_php: 345,   is_popular: false },
  { sku: "DRK-BEE-SAP", category: "drinks", name: "Sapporo Premium",       variant: "can",     price_php: 195,   is_popular: true  },
  { sku: "DRK-BEE-KIR", category: "drinks", name: "Kirin Ichiban",         variant: "bottle",  price_php: 215,   is_popular: true  },
  { sku: "DRK-BEE-SML", category: "drinks", name: "San Miguel Light",      variant: "bottle",  price_php: 145,   is_popular: false },
  { sku: "DRK-NAL-CAL", category: "drinks", name: "Calamansi Lemonade",    variant: undefined, price_php: 195,   is_popular: false },
  { sku: "DRK-NAL-MAT", category: "drinks", name: "Iced Matcha Latte",     variant: undefined, price_php: 245,   is_popular: false },
  { sku: "DRK-NAL-ITE", category: "drinks", name: "Bottomless Iced Tea",   variant: undefined, price_php: 145,   is_popular: false },
  { sku: "DRK-NAL-SPA", category: "drinks", name: "San Pellegrino",        variant: undefined, price_php: 145,   is_popular: false },
  { sku: "DRK-NAL-JUI", category: "drinks", name: "Fresh Seasonal Juice",  variant: undefined, price_php: 195,   is_popular: false },
] as const;

// ---- menu engineering with mock velocity --------------------------
const SEED_ITEMS = (seed as any).items as Array<{
  sku: string;
  name: string;
  category: string;
  variant?: string;
  price_php: number;
  is_chefs_rec?: boolean;
}>;

export const MENU_PERF: MenuItemSales[] = (() => {
  // Velocity weights by category — sushi/maki sell more units than mains
  const catWeight: Record<string, number> = {
    appetizers: 1.1,
    omakase: 0.4,
    sushi: 1.6,
    sashimi: 1.4,
    signature_maki: 1.5,
    maki: 1.7,
    mains: 0.9,
    kushiyaki: 1.0,
    roast_chicken: 0.7,
    donburi: 0.8,
    desserts: 0.6,
  };

  const rows: MenuItemSales[] = SEED_ITEMS.map((it) => {
    const w = catWeight[it.category] ?? 1;
    const popularity = it.is_chefs_rec ? between(1.4, 2.2) : between(0.4, 1.5);
    const base = 70 * w * popularity;
    const qty30 = Math.max(2, Math.round(base * between(0.85, 1.2)));
    const qty7 = Math.max(0, Math.round((qty30 / 30) * 7 * between(0.8, 1.25)));
    // Food cost ratio varies: imports higher, rice/desserts lower
    const fcr =
      it.category === "sushi" || it.category === "sashimi" || it.category === "omakase"
        ? between(0.32, 0.42)
        : it.category === "desserts" || it.category === "donburi"
          ? between(0.18, 0.28)
          : between(0.24, 0.34);
    const cost = Math.round(it.price_php * fcr);
    const margin = it.price_php - cost;
    const contribution = margin * qty30;
    return {
      sku: it.sku,
      name: it.name + (it.variant ? ` (${it.variant})` : ""),
      category: it.category,
      variant: it.variant,
      price: it.price_php,
      cost,
      qty7d: qty7,
      qty30d: qty30,
      margin,
      contribution,
      quadrant: "dog" as const,
      type: "food" as const,
    };
  });

  // Classify by margin × velocity vs averages
  const avgMargin = rows.reduce((a, b) => a + b.margin, 0) / rows.length;
  const avgVel = rows.reduce((a, b) => a + b.qty30d, 0) / rows.length;
  rows.forEach((r) => {
    const hm = r.margin >= avgMargin;
    const hv = r.qty30d >= avgVel;
    r.quadrant = hm ? (hv ? "star" : "puzzle") : hv ? "plowhorse" : "dog";
  });

  // Add drink items (RNG continues from food sequence)
  const drinkRows: MenuItemSales[] = DRINK_ITEMS_SEED.map((it) => {
    const isSpirits = it.sku.startsWith("DRK-YAM") || it.sku.startsWith("DRK-HIB") || it.sku.startsWith("DRK-TOK") || it.sku.startsWith("DRK-SK");
    const isWine    = it.sku.startsWith("DRK-WIN");
    const isBeer    = it.sku.startsWith("DRK-BEE");
    const isNonAlc  = it.sku.startsWith("DRK-NAL");
    const fcr = isSpirits ? between(0.30, 0.38)
      : isWine    ? between(0.30, 0.35)
      : isBeer    ? between(0.35, 0.42)
      : isNonAlc  ? between(0.15, 0.22)
      : between(0.22, 0.28); // cocktails
    const popularity = it.is_popular ? between(1.6, 2.8) : between(0.5, 1.3);
    const base = 95 * popularity;
    const qty30 = Math.max(5, Math.round(base * between(0.85, 1.2)));
    const qty7  = Math.max(0, Math.round((qty30 / 30) * 7 * between(0.8, 1.25)));
    const cost  = Math.round(it.price_php * fcr);
    const margin = it.price_php - cost;
    const contribution = margin * qty30;
    const hm = margin >= avgMargin;
    const hv = qty30 >= avgVel;
    const quadrant: MenuItemSales["quadrant"] = hm ? (hv ? "star" : "puzzle") : hv ? "plowhorse" : "dog";
    return {
      sku: it.sku,
      name: it.name + (it.variant ? ` (${it.variant})` : ""),
      category: it.category,
      variant: it.variant,
      price: it.price_php,
      cost,
      qty7d: qty7,
      qty30d: qty30,
      margin,
      contribution,
      quadrant,
      type: "drink" as const,
    };
  });
  rows.push(...drinkRows);
  return rows;
})();

export const QUADRANT_COUNTS = (() => {
  const c = { star: 0, puzzle: 0, plowhorse: 0, dog: 0 };
  MENU_PERF.forEach((m) => c[m.quadrant]++);
  return c;
})();

// ---- staff (36 people) --------------------------------------------
const ROLES: Array<{ role: string; count: number; rate: [number, number] }> = [
  { role: "GM", count: 1, rate: [55_000, 65_000] },
  { role: "Head Chef", count: 1, rate: [70_000, 85_000] },
  { role: "Sous Chef", count: 2, rate: [40_000, 50_000] },
  { role: "Sushi Chef", count: 3, rate: [35_000, 48_000] },
  { role: "Line Cook", count: 6, rate: [22_000, 30_000] },
  { role: "Prep Cook", count: 4, rate: [18_000, 24_000] },
  { role: "Dishwasher", count: 3, rate: [14_000, 18_000] },
  { role: "Bartender", count: 2, rate: [22_000, 30_000] },
  { role: "Server", count: 8, rate: [16_000, 22_000] },
  { role: "Host", count: 2, rate: [16_000, 20_000] },
  { role: "Runner", count: 3, rate: [14_000, 18_000] },
  { role: "Cashier", count: 1, rate: [18_000, 22_000] },
];

const FIRST_NAMES = [
  "Maria", "Juan", "Ana", "Jose", "Liza", "Mark", "Trisha", "Carlo",
  "Bea", "Migs", "Sam", "Patrick", "Nica", "Erika", "Diego", "Lara",
  "Paolo", "Rico", "Mika", "Camille", "Ralph", "Jovi", "Andrea", "Tonton",
  "Kim", "Rhea", "Aldo", "Jaz", "Ivan", "Mau", "Tasha", "Ren", "Jaime",
  "Bianca", "Ivy", "Niko",
];
const LAST_NAMES = [
  "Reyes", "Cruz", "Santos", "Dela Cruz", "Garcia", "Mendoza", "Ramos",
  "Aquino", "Gonzales", "Torres", "Flores", "Castillo", "Bautista", "Villanueva",
  "Pascual", "Domingo",
];

export const STAFF: StaffRow[] = (() => {
  let idx = 0;
  const out: StaffRow[] = [];
  for (const r of ROLES) {
    for (let i = 0; i < r.count; i++) {
      const monthly = Math.round(between(r.rate[0], r.rate[1]) / 500) * 500;
      const loaded = Math.round(monthly * 1.18); // ~18% statutory + 13th
      const tenure = intBetween(3, 48);
      const hours = intBetween(38, 54);
      // Productivity correlates loosely with role
      const isFOH = ["Server", "Host", "Bartender", "Runner", "GM", "Cashier"].includes(r.role);
      const covers = isFOH ? intBetween(80, 220) : 0;
      const rev = isFOH ? Math.round(covers * between(1700, 2100)) : 0;
      const productivity = isFOH ? rev / (loaded / 4) : 0;
      out.push({
        id: `S${String(++idx).padStart(2, "0")}`,
        name: `${FIRST_NAMES[idx % FIRST_NAMES.length]} ${LAST_NAMES[idx % LAST_NAMES.length]}`,
        role: r.role,
        tenure_months: tenure,
        monthly_php: monthly,
        loaded_php: loaded,
        hours_7d: hours,
        covers_7d: covers,
        rev_7d: rev,
        productivity: Number(productivity.toFixed(2)),
        rating: Number(between(3.6, 4.9).toFixed(1)),
      });
    }
  }
  return out;
})();

export const LABOR_TOTALS = {
  headcount: STAFF.length,
  monthly_loaded: STAFF.reduce((a, b) => a + b.loaded_php, 0),
  weekly_loaded: STAFF.reduce((a, b) => a + b.loaded_php, 0) / 4.33,
};

// ---- suppliers ----------------------------------------------------
export const SUPPLIERS: Supplier[] = [
  { id: "SUP01", name: "Hanjin Japan Imports", category: "import (fish)", fill_rate: 0.94, on_time: 0.88, price_drift: 0.082, reject_rate: 0.018, spend_30d: 685_000 },
  { id: "SUP02", name: "Cartimar Wet Market (Tito Boy)", category: "fish/seafood", fill_rate: 0.98, on_time: 0.96, price_drift: 0.012, reject_rate: 0.008, spend_30d: 245_000 },
  { id: "SUP03", name: "S&R Membership Shopping", category: "dry/dairy/imports", fill_rate: 1.0, on_time: 0.99, price_drift: 0.005, reject_rate: 0.001, spend_30d: 320_000 },
  { id: "SUP04", name: "Daiwa PH (Niigata Rice)", category: "rice/dry", fill_rate: 0.95, on_time: 0.92, price_drift: 0.034, reject_rate: 0.0, spend_30d: 78_000 },
  { id: "SUP05", name: "Magnolia Poultry", category: "chicken", fill_rate: 0.99, on_time: 0.97, price_drift: 0.018, reject_rate: 0.005, spend_30d: 142_000 },
  { id: "SUP06", name: "Monterey Meatshop", category: "beef/pork", fill_rate: 0.96, on_time: 0.93, price_drift: 0.041, reject_rate: 0.012, spend_30d: 198_000 },
  { id: "SUP07", name: "Manila Wine Merchants", category: "alcohol/sake", fill_rate: 0.92, on_time: 0.89, price_drift: 0.022, reject_rate: 0.0, spend_30d: 165_000 },
  { id: "SUP08", name: "FarmTo Greens (Tagaytay)", category: "produce", fill_rate: 0.86, on_time: 0.81, price_drift: 0.048, reject_rate: 0.034, spend_30d: 95_000 },
];

// ---- inventory ----------------------------------------------------
export const INVENTORY: InventoryRow[] = [
  { ingredient: "Norwegian Salmon (whole)", category: "import", on_hand: 18, unit: "kg", par: 25, days_on_hand: 2.1, status: "low", last_count: "2026-04-12" },
  { ingredient: "Maguro (yellowfin)", category: "import", on_hand: 9, unit: "kg", par: 12, days_on_hand: 1.8, status: "low", last_count: "2026-04-12" },
  { ingredient: "Hamachi (Japanese yellowtail)", category: "import", on_hand: 4, unit: "kg", par: 8, days_on_hand: 1.2, status: "low", last_count: "2026-04-12" },
  { ingredient: "Hotate (diver scallop)", category: "import", on_hand: 6, unit: "kg", par: 6, days_on_hand: 3.0, status: "ok", last_count: "2026-04-12" },
  { ingredient: "Uni (sea urchin)", category: "import", on_hand: 0, unit: "tray", par: 4, days_on_hand: 0, status: "out", last_count: "2026-04-13" },
  { ingredient: "Ikura (salmon roe)", category: "import", on_hand: 2.4, unit: "kg", par: 3, days_on_hand: 4.2, status: "ok", last_count: "2026-04-11" },
  { ingredient: "Niigata Rice", category: "dry", on_hand: 84, unit: "kg", par: 50, days_on_hand: 8.5, status: "ok", last_count: "2026-04-09" },
  { ingredient: "Nori sheets", category: "dry", on_hand: 22, unit: "pack", par: 15, days_on_hand: 12.0, status: "ok", last_count: "2026-04-09" },
  { ingredient: "Soy sauce (Kikkoman)", category: "dry", on_hand: 6, unit: "L", par: 8, days_on_hand: 6.0, status: "low", last_count: "2026-04-09" },
  { ingredient: "Beef tenderloin", category: "protein", on_hand: 12, unit: "kg", par: 14, days_on_hand: 3.4, status: "ok", last_count: "2026-04-12" },
  { ingredient: "Beef cheek", category: "protein", on_hand: 7, unit: "kg", par: 10, days_on_hand: 4.0, status: "low", last_count: "2026-04-12" },
  { ingredient: "Whole chicken (brined)", category: "protein", on_hand: 28, unit: "pc", par: 30, days_on_hand: 2.5, status: "ok", last_count: "2026-04-13" },
  { ingredient: "Pork ribs", category: "protein", on_hand: 16, unit: "kg", par: 18, days_on_hand: 3.2, status: "ok", last_count: "2026-04-12" },
  { ingredient: "Avocado (Hass)", category: "produce", on_hand: 32, unit: "pc", par: 60, days_on_hand: 1.5, status: "low", last_count: "2026-04-13" },
  { ingredient: "Mango (carabao)", category: "produce", on_hand: 28, unit: "pc", par: 40, days_on_hand: 2.0, status: "ok", last_count: "2026-04-12" },
  { ingredient: "Shishito peppers", category: "produce", on_hand: 4, unit: "kg", par: 5, days_on_hand: 3.0, status: "ok", last_count: "2026-04-12" },
  { ingredient: "Edamame (frozen)", category: "dry", on_hand: 14, unit: "kg", par: 10, days_on_hand: 9.0, status: "ok", last_count: "2026-04-08" },
  { ingredient: "Mozzarella", category: "dairy", on_hand: 5, unit: "kg", par: 6, days_on_hand: 4.0, status: "ok", last_count: "2026-04-11" },
];

// ---- reservations heatmap ----------------------------------------
export const RESERVATIONS: Reservation[] = (() => {
  const out: Reservation[] = [];
  const dows = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const lunchBase = [12, 14, 18, 22, 38, 52, 44];
  const dinnerBase = [22, 28, 38, 48, 95, 125, 88];
  const lateBase = [4, 6, 10, 14, 38, 56, 28];
  dows.forEach((d, i) => {
    out.push({ date: d, daypart: "lunch", booked: lunchBase[i], walked_in: Math.round(lunchBase[i] * 0.4), no_shows: Math.round(lunchBase[i] * 0.08) });
    out.push({ date: d, daypart: "dinner", booked: dinnerBase[i], walked_in: Math.round(dinnerBase[i] * 0.55), no_shows: Math.round(dinnerBase[i] * 0.11) });
    out.push({ date: d, daypart: "late_night", booked: lateBase[i], walked_in: Math.round(lateBase[i] * 0.7), no_shows: Math.round(lateBase[i] * 0.06) });
  });
  return out;
})();

// ---- Revenue breakdown (MTD) -------------------------------------
// Menu prices are VAT-inclusive (12%). Service charge (10%) is added on top.
// Discounts are taken off the gross menu price before VAT/service charge calc.
//
//   Gross Menu Sales (face value)
//     − Discounts (Senior/PWD 20%, Owner 50%, Employee 20%)
//   = Net Sales (VAT-inclusive)
//     ÷ 1.12 → Net Base Revenue  +  VAT-Output (12%)
//   + Service Charge 10% (on net of discounts) → goes to staff tip pool
//   = Total Customer Collection

export const REVENUE_BREAKDOWN_MTD = (() => {
  const grossMenu = 9_120_000;
  const senior_pwd = 142_000;     // 20% off + VAT-exempt
  const owner = 96_000;           // 50% comp (Jon, partners, hosting)
  const employee = 58_000;        // 20% staff meals discount
  const totalDiscounts = senior_pwd + owner + employee;
  const netOfDiscounts = grossMenu - totalDiscounts;
  // Strip the 12% VAT out of the discounted menu price
  const netBaseRevenue = Math.round(netOfDiscounts / 1.12);
  const vatOutput = netOfDiscounts - netBaseRevenue;
  const serviceCharge = Math.round(netOfDiscounts * 0.10);
  const customerCollection = netOfDiscounts + serviceCharge;
  return {
    gross_menu: grossMenu,
    discounts: { senior_pwd, owner, employee, total: totalDiscounts },
    net_of_discounts: netOfDiscounts,
    net_base_revenue: netBaseRevenue,
    vat_output: vatOutput,
    service_charge: serviceCharge,
    customer_collection: customerCollection,
  };
})();

// ---- P&L ----------------------------------------------------------
// "revenue" in P&L = net base revenue (what the restaurant actually books as income)
export const PNL_MTD = {
  revenue: REVENUE_BREAKDOWN_MTD.net_base_revenue,
  cogs: 2_410_000,
  labor: 2_140_000,
  rent: 480_000,
  utilities: 185_000,
  marketing: 92_000,
  other_opex: 145_000,
};
export const PNL_DERIVED = (() => {
  const p = PNL_MTD;
  const ebitda = p.revenue - p.cogs - p.labor - p.rent - p.utilities - p.marketing - p.other_opex;
  return {
    ...p,
    ebitda,
    food_pct: p.cogs / p.revenue,
    labor_pct: p.labor / p.revenue,
    prime_pct: (p.cogs + p.labor) / p.revenue,
    ebitda_pct: ebitda / p.revenue,
  };
})();

export const AP_AGING = [
  { supplier: "Hanjin Japan Imports", current: 285_000, d30: 120_000, d60: 0, d90: 0 },
  { supplier: "S&R Membership", current: 78_000, d30: 0, d60: 0, d90: 0 },
  { supplier: "Daiwa PH", current: 22_000, d30: 18_000, d60: 0, d90: 0 },
  { supplier: "Manila Wine Merchants", current: 95_000, d30: 42_000, d60: 12_000, d90: 0 },
  { supplier: "Monterey Meatshop", current: 64_000, d30: 0, d60: 0, d90: 0 },
];

export const FX_EXPOSURE = {
  jpy_purchases_30d: 1_240_000, // PHP value
  usd_purchases_30d: 360_000,
  jpy_drift_pct: 0.082,
  usd_drift_pct: 0.011,
  flagged: true,
};

// ---- pre-shift brief ---------------------------------------------
export const PRE_SHIFT = {
  service: "Dinner — Mon Apr 13",
  vipCount: 3,
  reservations: 64,
  eightySixed: ["Uni Sushi", "Uni Sashimi", "Yuzu Truffle Scallop"],
  prepPriorities: [
    "Pre-portion 18 La Japonesa stacks",
    "Re-batch gochu-dynamite sauce (low)",
    "Mise en place: 12 pulpo orders",
  ],
  yesterday: "Sunday brunch covers 248 (+12% WoW). Ginger-Ponzu Tuna sold out by 8pm.",
};
