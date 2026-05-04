import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiAuth, resolveWriteConcept } from "@/lib/auth";
import { apiError, apiValidationError } from "@/lib/api-helpers";

const DailyClosePayload = z.object({
  close_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  // Revenue stack — gross is what hit the customer's bill, net is what KPIs read.
  // PH menu prices are VAT-inclusive; 10% service charge is added on top and
  // distributed to staff per RA 11360.
  gross_sales_php: z.number().min(0).max(10_000_000),
  vat_php: z.number().min(0).max(2_000_000),
  service_charge_php: z.number().min(0).max(2_000_000),
  net_revenue_php: z.number().min(0).max(10_000_000),
  covers: z.number().int().min(0).max(100_000),
  cash_collected_php: z.number().min(0).max(10_000_000),
  cash_variance_php: z.number().min(-1_000_000).max(1_000_000),
  deposit_amount_php: z.number().min(0).max(10_000_000),
  tip_pool_php: z.number().min(0).max(1_000_000),
  gm_notes: z.string().max(2000).optional(),
});

export async function POST(req: Request) {
  const auth = await requireApiAuth();
  if (auth instanceof NextResponse) return auth;
  const { sb, user, profile } = auth;

  const body = await req.json();
  const parsed = DailyClosePayload.safeParse(body);
  if (!parsed.success) {
    return apiValidationError(parsed.error, "daily-close");
  }

  const concept = resolveWriteConcept(profile);

  // Write `total_revenue_php` = net_revenue_php for backward compat with any
  // remaining queries that read the legacy column. queries.ts now prefers
  // net_revenue_php; this redundant write goes away in a later migration.
  const { data, error } = await sb
    .from("daily_close")
    .upsert(
      {
        ...parsed.data,
        total_revenue_php: parsed.data.net_revenue_php,
        concept,
        submitted_by: user.id,
        submitted_at: new Date().toISOString(),
      },
      { onConflict: "close_date,concept" }
    )
    .select("id, close_date")
    .single();

  if (error) {
    return apiError({ status: 500, message: "Database error", cause: error, tag: "daily-close" });
  }

  return NextResponse.json(data);
}

export async function GET(req: Request) {
  const auth = await requireApiAuth();
  if (auth instanceof NextResponse) return auth;
  const { sb } = auth;

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");

  if (date) {
    const { data } = await sb
      .from("daily_close")
      .select("*")
      .eq("close_date", date)
      .maybeSingle();
    return NextResponse.json(data || null);
  }

  const { data } = await sb
    .from("daily_close")
    .select("*")
    .order("close_date", { ascending: false })
    .limit(14);

  return NextResponse.json(data ?? []);
}

export async function DELETE(req: Request) {
  const auth = await requireApiAuth({ ownerOnly: true });
  if (auth instanceof NextResponse) return auth;
  const { sb } = auth;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const { error } = await sb.from("daily_close").delete().eq("id", id);
  if (error) {
    return apiError({ status: 500, message: "Database error", cause: error, tag: "daily-close" });
  }

  return NextResponse.json({ ok: true });
}
