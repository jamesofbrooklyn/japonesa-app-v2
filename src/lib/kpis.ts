/**
 * Pure KPI math. No I/O.
 *
 * Targets (Carbone-style fine dining, adjusted for Manila):
 *   prime cost  : 58–62%
 *   food cost   : 28–32%
 *   labor cost  : 26–30%
 */

export const TARGETS = {
  primeCost: { lo: 0.58, hi: 0.62 },
  foodCost: { lo: 0.28, hi: 0.32 },
  laborCost: { lo: 0.26, hi: 0.30 },
} as const;

export type Band = "good" | "watch" | "bad";

export function band(value: number, target: { lo: number; hi: number }): Band {
  if (value <= target.hi) return value >= target.lo ? "good" : "good";
  if (value <= target.hi + 0.03) return "watch";
  return "bad";
}

export function pct(n: number) {
  return `${(n * 100).toFixed(1)}%`;
}

export function php(n: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(n);
}

export function primeCost(cogs: number, labor: number, revenue: number) {
  if (revenue <= 0) return 0;
  return (cogs + labor) / revenue;
}

export function foodCostPct(cogs: number, revenue: number) {
  return revenue > 0 ? cogs / revenue : 0;
}

export function laborCostPct(labor: number, revenue: number) {
  return revenue > 0 ? labor / revenue : 0;
}

export function avgCheck(revenue: number, covers: number) {
  return covers > 0 ? revenue / covers : 0;
}

/**
 * Revenue per available seat hour. Poblacion seats * service hours.
 */
export function revPASH(revenue: number, seats: number, hoursOpen: number) {
  const denom = seats * hoursOpen;
  return denom > 0 ? revenue / denom : 0;
}

/**
 * Menu engineering quadrant: margin × velocity vs averages.
 *
 *  STAR        = high margin, high velocity
 *  PLOWHORSE   = low margin,  high velocity
 *  PUZZLE      = high margin, low  velocity
 *  DOG         = low margin,  low  velocity
 */
export type Quadrant = "star" | "plowhorse" | "puzzle" | "dog";

export interface MenuItemPerf {
  id: string;
  name: string;
  category: string;
  price: number;
  cost: number | null;
  qtySold: number;
}

export interface QuadrantResult extends MenuItemPerf {
  margin: number;
  contributionMargin: number;
  quadrant: Quadrant;
}

export function classifyMenu(items: MenuItemPerf[]): QuadrantResult[] {
  // Use price as proxy when cost is missing (margin = price; relative ranking still works)
  const enriched = items.map((it) => {
    const cost = it.cost ?? 0;
    const margin = it.price - cost;
    return { ...it, margin, contributionMargin: margin * it.qtySold };
  });

  const avgMargin = avg(enriched.map((e) => e.margin));
  const avgVelocity = avg(enriched.map((e) => e.qtySold));

  return enriched.map((e) => {
    const highMargin = e.margin >= avgMargin;
    const highVelocity = e.qtySold >= avgVelocity;
    const quadrant: Quadrant = highMargin
      ? highVelocity
        ? "star"
        : "puzzle"
      : highVelocity
        ? "plowhorse"
        : "dog";
    return { ...e, quadrant };
  });
}

function avg(xs: number[]) {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}
