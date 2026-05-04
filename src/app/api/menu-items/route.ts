import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiAuth, resolveWriteConcept } from "@/lib/auth";
import { apiError, apiValidationError } from "@/lib/api-helpers";

const MenuItemPayload = z.object({
  sku: z.string().min(1).max(80),
  pos_id: z.string().max(80).optional().nullable(),
  name: z.string().min(1).max(200),
  category: z.string().min(1).max(80),
  subcategory: z.string().max(80).optional().nullable(),
  variant: z.string().max(80).optional().nullable(),
  description: z.string().max(1000).optional().nullable(),
  price_php: z.number().min(0).max(100_000),
  theoretical_cost_php: z.number().min(0).max(100_000).optional().nullable(),
  is_chefs_rec: z.boolean().optional(),
  is_vegan: z.boolean().optional(),
  active: z.boolean().optional(),
});

export async function GET(req: Request) {
  const auth = await requireApiAuth();
  if (auth instanceof NextResponse) return auth;
  const { sb } = auth;

  const { searchParams } = new URL(req.url);
  const includeInactive = searchParams.get("all") === "true";

  let query = sb
    .from("menu_items")
    .select("id, name, sku, pos_id, category, subcategory, variant, price_php, theoretical_cost_php, active")
    .order("category")
    .order("name");

  if (!includeInactive) {
    query = query.eq("active", true);
  }

  const { data, error } = await query;
  if (error) {
    return apiError({ status: 500, message: "Database error", cause: error, tag: "menu-items" });
  }

  return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
  const auth = await requireApiAuth({ ownerOnly: true });
  if (auth instanceof NextResponse) return auth;
  const { sb, profile } = auth;

  const body = await req.json();
  const parsed = MenuItemPayload.safeParse(body);
  if (!parsed.success) {
    return apiValidationError(parsed.error, "menu-items");
  }

  const concept = resolveWriteConcept(profile);

  const { data, error } = await sb
    .from("menu_items")
    .insert({ ...parsed.data, concept })
    .select("id, name, sku")
    .single();

  if (error) {
    return apiError({ status: 500, message: "Database error", cause: error, tag: "menu-items" });
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
  const parsed = MenuItemPayload.partial().safeParse(body);
  if (!parsed.success) {
    return apiValidationError(parsed.error, "menu-items");
  }

  const { data, error } = await sb
    .from("menu_items")
    .update(parsed.data)
    .eq("id", id)
    .select("id, name, sku")
    .single();

  if (error) {
    return apiError({ status: 500, message: "Database error", cause: error, tag: "menu-items" });
  }

  return NextResponse.json(data);
}
