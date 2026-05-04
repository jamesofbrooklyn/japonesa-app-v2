import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiAuth } from "@/lib/auth";
import { apiError, apiValidationError } from "@/lib/api-helpers";

const SupplierPayload = z.object({
  name: z.string().min(1).max(200),
  class: z.enum(["spot", "contract"]),
  category: z.string().max(80).optional().nullable(),
  contact: z.string().max(200).optional().nullable(),
  lead_time_days: z.number().int().min(0).max(365).optional().nullable(),
  payment_terms: z.string().max(80).optional().nullable(),
});

export async function GET() {
  const auth = await requireApiAuth();
  if (auth instanceof NextResponse) return auth;
  const { sb } = auth;

  const { data, error } = await sb
    .from("suppliers")
    .select("id, name, class, category, contact, lead_time_days, payment_terms, created_at")
    .order("name");

  if (error) {
    return apiError({ status: 500, message: "Database error", cause: error, tag: "suppliers" });
  }

  return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
  const auth = await requireApiAuth({ ownerOnly: true });
  if (auth instanceof NextResponse) return auth;
  const { sb } = auth;

  const body = await req.json();
  const parsed = SupplierPayload.safeParse(body);
  if (!parsed.success) {
    return apiValidationError(parsed.error, "suppliers");
  }

  const { data, error } = await sb
    .from("suppliers")
    .insert(parsed.data)
    .select("id, name")
    .single();

  if (error) {
    return apiError({ status: 500, message: "Database error", cause: error, tag: "suppliers" });
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
  const parsed = SupplierPayload.partial().safeParse(body);
  if (!parsed.success) {
    return apiValidationError(parsed.error, "suppliers");
  }

  const { data, error } = await sb
    .from("suppliers")
    .update(parsed.data)
    .eq("id", id)
    .select("id, name")
    .single();

  if (error) {
    return apiError({ status: 500, message: "Database error", cause: error, tag: "suppliers" });
  }

  return NextResponse.json(data);
}
