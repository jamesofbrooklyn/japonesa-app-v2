import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiAuth, resolveWriteConcept } from "@/lib/auth";
import { apiError, apiValidationError } from "@/lib/api-helpers";

const StaffPayload = z.object({
  name: z.string().min(1).max(200),
  role: z.string().min(1).max(80),
  hire_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  base_rate_php: z.number().min(0).max(1_000_000),
  rate_unit: z.enum(["monthly", "hourly", "daily"]),
  employment_type: z.enum(["regular", "probationary", "contractual"]),
  statutory_loaded_rate_php: z.number().min(0).max(2_000_000).optional(),
  active: z.boolean().default(true),
});

export async function GET(req: Request) {
  // Staff records include salaries — owner-only, no concept-scoped manager view.
  const auth = await requireApiAuth({ ownerOnly: true });
  if (auth instanceof NextResponse) return auth;
  const { sb } = auth;

  const { searchParams } = new URL(req.url);
  const activeOnly = searchParams.get("active") !== "false";

  let query = sb.from("staff").select("*").order("role").order("name");
  if (activeOnly) query = query.eq("active", true);

  const { data, error } = await query;
  if (error) {
    return apiError({ status: 500, message: "Database error", cause: error, tag: "staff" });
  }

  return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
  const auth = await requireApiAuth({ ownerOnly: true });
  if (auth instanceof NextResponse) return auth;
  const { sb, profile } = auth;

  const body = await req.json();
  const parsed = StaffPayload.safeParse(body);
  if (!parsed.success) {
    return apiValidationError(parsed.error, "staff");
  }

  const concept = resolveWriteConcept(profile);

  const { data, error } = await sb
    .from("staff")
    .insert({
      ...parsed.data,
      concept,
      statutory_loaded_rate_php:
        parsed.data.statutory_loaded_rate_php ??
        // PH-correct load factor: ~27% for regular F&B (SSS+PH+Pag-IBIG+13th+SIL+holiday),
        // ~10% for probationary/contractual. Applied to the monthly equivalent of base.
        Math.round(
          (parsed.data.rate_unit === "daily"
            ? parsed.data.base_rate_php * 26
            : parsed.data.rate_unit === "hourly"
            ? parsed.data.base_rate_php * 8 * 26
            : parsed.data.base_rate_php) *
            (parsed.data.employment_type === "regular" ? 1.27 : 1.10)
        ),
    })
    .select("id, name, role")
    .single();

  if (error) {
    return apiError({ status: 500, message: "Database error", cause: error, tag: "staff" });
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
  const partial = StaffPayload.partial().safeParse(body);
  if (!partial.success) {
    return apiValidationError(partial.error, "staff");
  }

  const { data, error } = await sb
    .from("staff")
    .update(partial.data)
    .eq("id", id)
    .select("id, name, role")
    .single();

  if (error) {
    return apiError({ status: 500, message: "Database error", cause: error, tag: "staff" });
  }

  return NextResponse.json(data);
}
