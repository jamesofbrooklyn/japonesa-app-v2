import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { z } from "zod";

const SaleRow = z.object({
  sold_at: z.string(),
  daypart: z.string().optional(),
  pos_item_id: z.string().optional(),
  menu_item_id: z.string().uuid().optional(),
  qty: z.number().int().positive(),
  gross_php: z.number(),
  discount_php: z.number().optional(),
  payment_method: z.string().optional(),
  pos_order_id: z.string().optional(),
});

const Payload = z.object({
  source: z.string(),
  rows: z.array(SaleRow).max(5000),
});

/**
 * POS ingestion endpoint. Phase 2 will wire the chosen vendor adapter
 * (Foodics / Loyverse / Toast) to push rows here on a schedule.
 */
export async function POST(req: Request) {
  const body = await req.json();
  const parsed = Payload.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }
  const sb = supabaseAdmin();
  const { error } = await sb.from("sales").insert(parsed.data.rows);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ inserted: parsed.data.rows.length });
}
