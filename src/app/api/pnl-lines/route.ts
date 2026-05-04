import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiAuth, resolveWriteConcept } from "@/lib/auth";
import { apiError, apiValidationError } from "@/lib/api-helpers";

const PnlLinePayload = z.object({
  occurred_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  category: z.enum(["revenue", "cogs", "labor", "rent", "utilities", "marketing", "other"]),
  subcategory: z.string().min(1).max(200),
  amount_php: z.number().min(-10_000_000).max(10_000_000),
  source: z.enum(["manual", "pos", "payroll"]).default("manual"),
  notes: z.string().max(2000).optional(),
});

export async function POST(req: Request) {
  const auth = await requireApiAuth();
  if (auth instanceof NextResponse) return auth;
  const { sb, profile } = auth;

  const body = await req.json();
  const parsed = PnlLinePayload.safeParse(body);
  if (!parsed.success) {
    return apiValidationError(parsed.error, "pnl-lines");
  }

  const concept = resolveWriteConcept(profile);

  const { data, error } = await sb
    .from("pnl_lines")
    .insert({ ...parsed.data, concept })
    .select("id, occurred_on, category, subcategory, amount_php")
    .single();

  if (error) {
    return apiError({ status: 500, message: "Database error", cause: error, tag: "pnl-lines" });
  }

  return NextResponse.json(data);
}

export async function GET(req: Request) {
  const auth = await requireApiAuth();
  if (auth instanceof NextResponse) return auth;
  const { sb } = auth;

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month");

  let query = sb
    .from("pnl_lines")
    .select("id, occurred_on, category, subcategory, amount_php, source, notes")
    .order("occurred_on", { ascending: false });

  if (month) {
    const start = `${month}-01`;
    const [y, m] = month.split("-").map(Number);
    // Last day of month, computed via UTC to avoid server-TZ drift.
    const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const end = `${month}-${String(lastDay).padStart(2, "0")}`;
    query = query.gte("occurred_on", start).lte("occurred_on", end);
  }

  const { data, error } = await query.limit(200);

  if (error) {
    return apiError({ status: 500, message: "Database error", cause: error, tag: "pnl-lines" });
  }

  return NextResponse.json(data ?? []);
}

export async function PATCH(req: Request) {
  const auth = await requireApiAuth({ ownerOnly: true });
  if (auth instanceof NextResponse) return auth;
  const { sb } = auth;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id param" }, { status: 400 });
  }

  const body = await req.json();
  const parsed = PnlLinePayload.partial().safeParse(body);
  if (!parsed.success) {
    return apiValidationError(parsed.error, "pnl-lines");
  }

  const { data, error } = await sb
    .from("pnl_lines")
    .update(parsed.data)
    .eq("id", id)
    .select("id, occurred_on, category, subcategory, amount_php")
    .single();

  if (error) {
    return apiError({ status: 500, message: "Database error", cause: error, tag: "pnl-lines" });
  }

  return NextResponse.json(data);
}

export async function DELETE(req: Request) {
  const auth = await requireApiAuth({ ownerOnly: true });
  if (auth instanceof NextResponse) return auth;
  const { sb } = auth;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id param" }, { status: 400 });
  }

  const { error } = await sb.from("pnl_lines").delete().eq("id", id);
  if (error) {
    return apiError({ status: 500, message: "Database error", cause: error, tag: "pnl-lines" });
  }

  return NextResponse.json({ deleted: id });
}
