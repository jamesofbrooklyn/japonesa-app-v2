/**
 * Inventory mock — models the Alamat Bar / Japonesa Bar shared sourcing sheet.
 *
 *  delivery_qty  = qty that physically arrived at receiving (delivery form)
 *  purchase_qty  = qty the supplier billed on the purchase summary
 *  variance      = delivery − purchase
 *      negative  → UNDER (we got less than billed → claw back from supplier)
 *      positive  → OVER  (we got more than billed → supplier error our favor / pilferage on receiving side)
 */
import seed from "@/data/inventory-seed.json";

export interface InventoryRow {
  sku: string;
  description: string;
  unit: string;
  unit_cost: number;

  delivery_alamat: number;
  delivery_japonesa: number;
  delivery_total: number;

  purchase_alamat: number;
  purchase_japonesa: number;
  purchase_total: number;

  variance_alamat: number;
  variance_japonesa: number;
  variance_total: number;
  variance_value_php: number;

  remarks?: string;
  severity: "ok" | "watch" | "high";
}

const SEED_ITEMS = (seed as any).items as Array<{
  sku: string;
  description: string;
  unit: string;
}>;

// Realistic unit costs for Manila wet market / supplier pricing (PHP)
const UNIT_COSTS: Record<string, number> = {
  "PRD-BASIL": 1200,
  "PRD-CALAM": 80,
  "PRD-CHIGRN": 220,
  "PRD-CILAN": 280,
  "PRD-CUCU": 75,
  "PRD-EDFLW": 250,
  "PRD-EGGLG": 285,
  "PRD-GING": 140,
  "PRD-GUAV": 95,
  "PRD-LANGKA": 80,
  "PRD-LEMUS": 320,
  "PRD-LMGRS": 90,
  "PRD-LIME": 8,
  "PRD-MNGRP": 180,
  "PRD-ORMD": 35,
  "PRD-MELN": 220,
  "PRD-PNDLV": 60,
  "PRD-PNAPL": 110,
  "PRD-ROSE": 180,
  "PRD-STRAW": 320,
  "PRD-TARR": 220,
  "PRD-TOMA": 95,
  "PRD-WMELN": 65,
};

// Delivery form quantities (what receiving counted)
const DELIVERY: Record<string, [number, number]> = {
  "PRD-BASIL": [0.78, 3.03],
  "PRD-CALAM": [30.0, 10.0],
  "PRD-CHIGRN": [0, 1.05],
  "PRD-CILAN": [0, 1.70],
  "PRD-CUCU": [0, 23.00],
  "PRD-EDFLW": [5.00, 25.00],
  "PRD-EGGLG": [36.00, 12.00],
  "PRD-GING": [0, 16.20],
  "PRD-GUAV": [0, 0],
  "PRD-LANGKA": [0, 0.51],
  "PRD-LEMUS": [6.00, 12.30],
  "PRD-LMGRS": [0, 6.00],
  "PRD-LIME": [400, 580],
  "PRD-MNGRP": [1.86, 5.39],
  "PRD-ORMD": [0, 1.05],
  "PRD-MELN": [1.13, 2.13],
  "PRD-PNDLV": [0, 2.01],
  "PRD-PNAPL": [0, 9.00],
  "PRD-ROSE": [7.00, 9.00],
  "PRD-STRAW": [4.00, 13.00],
  "PRD-TARR": [0, 1.00],
  "PRD-TOMA": [0, 7.04],
  "PRD-WMELN": [0, 53.82],
};

// Purchase summary qty (what the supplier billed) — small variances injected
const PURCHASE: Record<string, [number, number]> = {
  "PRD-BASIL": [0.65, 2.97],     // UNDER — we got 0.78+3.03 but billed 0.65+2.97 → over by 0.19
  "PRD-CALAM": [30.0, 10.0],
  "PRD-CHIGRN": [0, 1.05],
  "PRD-CILAN": [0, 1.70],
  "PRD-CUCU": [0, 23.00],
  "PRD-EDFLW": [5.00, 25.00],
  "PRD-EGGLG": [36.00, 12.00],
  "PRD-GING": [0, 16.20],
  "PRD-GUAV": [0, 0],
  "PRD-LANGKA": [0, 0.51],
  "PRD-LEMUS": [6.00, 12.30],
  "PRD-LMGRS": [0, 6.00],
  "PRD-LIME": [400, 580],
  "PRD-MNGRP": [1.86, 5.40],     // billed 0.01 more — minor under
  "PRD-ORMD": [0, 1.05],
  "PRD-MELN": [1.13, 2.13],
  "PRD-PNDLV": [0, 2.01],
  "PRD-PNAPL": [0, 9.00],
  "PRD-ROSE": [7.00, 9.00],
  "PRD-STRAW": [4.00, 13.00],
  "PRD-TARR": [0, 1.00],
  "PRD-TOMA": [0, 7.04],
  "PRD-WMELN": [0, 53.82],
};

export const INVENTORY_ROWS: InventoryRow[] = SEED_ITEMS.map((s) => {
  const [da, dj] = DELIVERY[s.sku] ?? [0, 0];
  const [pa, pj] = PURCHASE[s.sku] ?? [0, 0];
  const dt = da + dj;
  const pt = pa + pj;
  const va = round4(da - pa);
  const vj = round4(dj - pj);
  const vt = round4(dt - pt);
  const cost = UNIT_COSTS[s.sku] ?? 0;
  const value = Math.abs(vt) * cost;

  let remarks: string | undefined;
  if (vt > 0) remarks = "OVER QTY VS PURCHASED SUMMARY";
  else if (vt < 0) remarks = "UNDER QTY VS PURCHASED SUMMARY";

  // Severity: percentage of variance against purchased qty, weighted by peso impact
  const pctVar = pt > 0 ? Math.abs(vt) / pt : Math.abs(vt) > 0 ? 1 : 0;
  let severity: InventoryRow["severity"] = "ok";
  if (pctVar > 0.05 || value > 500) severity = "high";
  else if (pctVar > 0.01 || value > 100) severity = "watch";

  return {
    sku: s.sku,
    description: s.description,
    unit: s.unit,
    unit_cost: cost,
    delivery_alamat: da,
    delivery_japonesa: dj,
    delivery_total: dt,
    purchase_alamat: pa,
    purchase_japonesa: pj,
    purchase_total: pt,
    variance_alamat: va,
    variance_japonesa: vj,
    variance_total: vt,
    variance_value_php: value,
    remarks,
    severity,
  };
});

function round4(n: number) {
  return Math.round(n * 10000) / 10000;
}

// ----- transfers (right side of the sheet) -----
export const TRANSFERS = (seed as any).transfers as {
  greens_total: { jap_bar: number; alamat_bar: number };
  ice_tube_per_sack: { alamat_bar: number; japonesa_bar: number };
  dry_ice: { alamat_bar: number; japonesa_bar: number };
};

// ----- pending deliveries (today + tomorrow) -----
export interface PendingDelivery {
  supplier: string;
  category: string;
  items_count: number;
  expected_at: string;
  expected_value_php: number;
  status: "scheduled" | "in_transit" | "arrived" | "late";
  pos_ref?: string;
}

export const PENDING_DELIVERIES: PendingDelivery[] = [
  { supplier: "Cartimar Wet Market (Tito Boy)", category: "fresh fish", items_count: 8, expected_at: "2026-04-14 06:30", expected_value_php: 42_500, status: "arrived", pos_ref: "PO-2026-0411" },
  { supplier: "Hanjin Japan Imports", category: "import (sashimi grade)", items_count: 6, expected_at: "2026-04-14 09:00", expected_value_php: 168_000, status: "in_transit", pos_ref: "PO-2026-0412" },
  { supplier: "FarmTo Greens (Tagaytay)", category: "produce", items_count: 23, expected_at: "2026-04-14 11:00", expected_value_php: 18_945, status: "in_transit", pos_ref: "PO-2026-0413" },
  { supplier: "Magnolia Poultry", category: "chicken", items_count: 3, expected_at: "2026-04-14 14:00", expected_value_php: 24_300, status: "scheduled", pos_ref: "PO-2026-0414" },
  { supplier: "S&R Membership", category: "dry/dairy", items_count: 14, expected_at: "2026-04-15 08:00", expected_value_php: 78_500, status: "scheduled", pos_ref: "PO-2026-0415" },
  { supplier: "Manila Wine Merchants", category: "alcohol/sake", items_count: 12, expected_at: "2026-04-15 13:00", expected_value_php: 95_000, status: "scheduled", pos_ref: "PO-2026-0416" },
  { supplier: "Daiwa PH (Niigata Rice)", category: "rice/dry", items_count: 1, expected_at: "2026-04-13 10:00", expected_value_php: 28_000, status: "late" },
];

// ----- aggregates -----
export const INVENTORY_SUMMARY = (() => {
  const totalDelivery = INVENTORY_ROWS.reduce((a, b) => a + b.delivery_total * b.unit_cost, 0);
  const totalPurchase = INVENTORY_ROWS.reduce((a, b) => a + b.purchase_total * b.unit_cost, 0);
  const totalVariancePhp = INVENTORY_ROWS.reduce((a, b) => a + b.variance_value_php, 0);
  const overCount = INVENTORY_ROWS.filter((r) => r.variance_total > 0).length;
  const underCount = INVENTORY_ROWS.filter((r) => r.variance_total < 0).length;
  const cleanCount = INVENTORY_ROWS.filter((r) => r.variance_total === 0).length;
  const highSev = INVENTORY_ROWS.filter((r) => r.severity === "high").length;
  return {
    totalDelivery,
    totalPurchase,
    totalVariancePhp,
    overCount,
    underCount,
    cleanCount,
    highSev,
  };
})();
