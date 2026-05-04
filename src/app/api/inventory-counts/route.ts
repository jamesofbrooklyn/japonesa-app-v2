import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiAuth, resolveWriteConcept } from "@/lib/auth";
import { apiError, apiValidationError } from "@/lib/api-helpers";

const CountRow = z.object({
  ingredient_id: z.string().uuid(),
  qty_on_hand: z.number().min(0).max(1_000_000),
  unit_cost: z.number().min(0).max(1_000_000),
});

const BatchPayload = z.object({
  counted_at: z.string().max(40),
  rows: z.array(CountRow).min(1).max(500),
});

export async function POST(req: Request) {
  const auth = await requireApiAuth();
  if (auth instanceof NextResponse) return auth;
  const { sb, user, profile } = auth;

  const body = await req.json();
  const parsed = BatchPayload.safeParse(body);
  if (!parsed.success) {
    return apiValidationError(parsed.error, "inventory-counts");
  }

  const concept = resolveWriteConcept(profile);

  const rows = parsed.data.rows.map((r) => ({
    ...r,
    counted_at: parsed.data.counted_at,
    counted_by: user.id,
    concept,
  }));

  const { error } = await sb.from("inventory_counts").insert(rows);

  if (error) {
    return apiError({ status: 500, message: "Database error", cause: error, tag: "inventory-counts" });
  }

  return NextResponse.json({ inserted: rows.length });
}

export async function GET() {
  const auth = await requireApiAuth();
  if (auth instanceof NextResponse) return auth;
  const { sb } = auth;

  // Latest count per ingredient
  const { data, error } = await sb
    .from("inventory_counts")
    .select("ingredient_id, qty_on_hand, unit_cost, counted_at, ingredients(name, category, unit)")
    .order("counted_at", { ascending: false })
    .limit(500);

  if (error) {
    return apiError({ status: 500, message: "Database error", cause: error, tag: "inventory-counts" });
  }

  const seen = new Set<string>();
  const latest = (data ?? []).filter((row: any) => {
    if (seen.has(row.ingredient_id)) return false;
    seen.add(row.ingredient_id);
    return true;
  });

  return NextResponse.json(latest);
}
