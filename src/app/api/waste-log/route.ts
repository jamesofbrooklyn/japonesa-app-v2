import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiAuth, resolveWriteConcept } from "@/lib/auth";
import { apiError, apiValidationError } from "@/lib/api-helpers";
import { manilaDaysAgo } from "@/lib/dates";

const WastePayload = z
  .object({
    occurred_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    ingredient_id: z.string().uuid().optional(),
    menu_item_id: z.string().uuid().optional(),
    qty: z.number().positive().max(10_000),
    reason: z.string().min(1).max(500),
  })
  .refine((d) => d.ingredient_id || d.menu_item_id, {
    message: "Either ingredient_id or menu_item_id is required",
  });

export async function POST(req: Request) {
  const auth = await requireApiAuth();
  if (auth instanceof NextResponse) return auth;
  const { sb, profile } = auth;

  const body = await req.json();
  const parsed = WastePayload.safeParse(body);
  if (!parsed.success) {
    return apiValidationError(parsed.error, "waste-log");
  }

  const concept = resolveWriteConcept(profile);

  const { data, error } = await sb
    .from("waste_log")
    .insert({ ...parsed.data, concept })
    .select("id, occurred_on, qty, reason")
    .single();

  if (error) {
    return apiError({ status: 500, message: "Database error", cause: error, tag: "waste-log" });
  }

  return NextResponse.json(data);
}

export async function GET(req: Request) {
  const auth = await requireApiAuth();
  if (auth instanceof NextResponse) return auth;
  const { sb } = auth;

  const { searchParams } = new URL(req.url);
  const days = Math.min(365, parseInt(searchParams.get("days") || "30", 10));
  const since = manilaDaysAgo(days);

  const { data, error } = await sb
    .from("waste_log")
    .select("id, occurred_on, qty, reason, ingredients(name), menu_items(name)")
    .gte("occurred_on", since)
    .order("occurred_on", { ascending: false })
    .limit(100);

  if (error) {
    return apiError({ status: 500, message: "Database error", cause: error, tag: "waste-log" });
  }

  return NextResponse.json(data ?? []);
}
