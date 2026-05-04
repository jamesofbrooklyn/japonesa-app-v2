import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiAuth, resolveWriteConcept } from "@/lib/auth";
import { apiError, apiValidationError, sanitizeCsvField } from "@/lib/api-helpers";

const SaleRow = z.object({
  sold_at: z.string().max(40),
  daypart: z.string().max(20).optional(),
  pos_item_id: z.string().max(200).optional(),
  menu_item_id: z.string().uuid().optional(),
  qty: z.number().int().positive().max(10_000),
  gross_php: z.number().min(0).max(1_000_000),
  discount_php: z.number().min(0).max(1_000_000).optional(),
  payment_method: z.string().max(40).optional(),
  pos_order_id: z.string().max(100).optional(),
});

const Payload = z.object({
  source: z.string().max(200),
  rows: z.array(SaleRow).max(5000),
});

export async function POST(req: Request) {
  const auth = await requireApiAuth({ ownerOnly: true });
  if (auth instanceof NextResponse) return auth;
  const { sb, profile } = auth;

  const body = await req.json();
  const parsed = Payload.safeParse(body);
  if (!parsed.success) {
    return apiValidationError(parsed.error, "sales-ingest");
  }

  const concept = resolveWriteConcept(profile);
  const now = new Date().toISOString();

  // Strip CSV-injection prefixes from any free-text field that came from the
  // source CSV. The user could re-export this data from the dashboard later;
  // we don't want a `=cmd|...` from a malicious POS row to fire as a formula.
  const rows = parsed.data.rows.map((r) => ({
    ...r,
    pos_item_id: r.pos_item_id ? sanitizeCsvField(r.pos_item_id) : r.pos_item_id,
    pos_order_id: r.pos_order_id ? sanitizeCsvField(r.pos_order_id) : r.pos_order_id,
    payment_method: r.payment_method ? sanitizeCsvField(r.payment_method) : r.payment_method,
    concept,
    ingested_at: now,
  }));

  // Upsert on the dedupe constraint (pos_order_id, pos_item_id, sold_at)
  // so re-uploading the same CSV is idempotent. Rows without pos_order_id
  // fall through and just insert.
  const { error } = await sb
    .from("sales")
    .upsert(rows, {
      onConflict: "pos_order_id,pos_item_id,sold_at",
      ignoreDuplicates: true,
    });

  if (error) {
    return apiError({ status: 500, message: "Database error", cause: error, tag: "sales-ingest" });
  }

  return NextResponse.json({
    inserted: rows.length,
    source: parsed.data.source,
  });
}

export async function GET() {
  const auth = await requireApiAuth({ ownerOnly: true });
  if (auth instanceof NextResponse) return auth;
  const { sb } = auth;

  // Return ingestion summary
  const { data: summary } = await sb
    .from("sales")
    .select("sold_at, ingested_at")
    .order("sold_at", { ascending: true })
    .limit(1);

  const { data: latest } = await sb
    .from("sales")
    .select("sold_at, ingested_at")
    .order("sold_at", { ascending: false })
    .limit(1);

  const { count } = await sb
    .from("sales")
    .select("id", { count: "exact", head: true });

  return NextResponse.json({
    total_rows: count ?? 0,
    date_range: {
      min: summary?.[0]?.sold_at ?? null,
      max: latest?.[0]?.sold_at ?? null,
    },
    last_ingested_at: latest?.[0]?.ingested_at ?? null,
  });
}
