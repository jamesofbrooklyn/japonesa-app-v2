import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiAuth } from "@/lib/auth";
import { apiError, apiValidationError } from "@/lib/api-helpers";

const IngredientPayload = z.object({
  sku: z.string().min(1).max(80),
  name: z.string().min(1).max(200),
  category: z.enum(["dry", "protein", "produce", "dairy", "alcohol", "import"]),
  unit: z.enum(["kg", "g", "l", "ml", "pc"]),
  current_unit_cost: z.number().min(0).max(100_000).optional().nullable(),
  currency: z.string().max(8).optional(),
  supplier_id: z.string().uuid().optional().nullable(),
});

export async function GET(req: Request) {
  const auth = await requireApiAuth();
  if (auth instanceof NextResponse) return auth;
  const { sb } = auth;

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");

  let query = sb
    .from("ingredients")
    .select("id, sku, name, category, unit, current_unit_cost, currency, supplier_id")
    .order("category")
    .order("name");

  if (category) {
    query = query.eq("category", category);
  }

  const { data, error } = await query;
  if (error) {
    return apiError({ status: 500, message: "Database error", cause: error, tag: "ingredients" });
  }

  return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
  const auth = await requireApiAuth({ ownerOnly: true });
  if (auth instanceof NextResponse) return auth;
  const { sb } = auth;

  const body = await req.json();
  const parsed = IngredientPayload.safeParse(body);
  if (!parsed.success) {
    return apiValidationError(parsed.error, "ingredients");
  }

  const { data, error } = await sb
    .from("ingredients")
    .insert(parsed.data)
    .select("id, name, sku")
    .single();

  if (error) {
    return apiError({ status: 500, message: "Database error", cause: error, tag: "ingredients" });
  }

  return NextResponse.json(data);
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
  const parsed = IngredientPayload.partial().safeParse(body);
  if (!parsed.success) {
    return apiValidationError(parsed.error, "ingredients");
  }

  const { data, error } = await sb
    .from("ingredients")
    .update(parsed.data)
    .eq("id", id)
    .select("id, name, sku")
    .single();

  if (error) {
    return apiError({ status: 500, message: "Database error", cause: error, tag: "ingredients" });
  }

  return NextResponse.json(data);
}
