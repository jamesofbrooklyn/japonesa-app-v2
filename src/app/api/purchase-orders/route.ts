import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiAuth, resolveWriteConcept } from "@/lib/auth";
import { apiError, apiValidationError } from "@/lib/api-helpers";

const LineItem = z.object({
  ingredient_id: z.string().uuid(),
  ingredient_name: z.string().max(200),
  qty: z.number().positive().max(100_000),
  unit: z.string().max(20),
  unit_price: z.number().min(0).max(1_000_000),
});

const CreatePO = z.object({
  supplier_id: z.string().uuid(),
  expected_at: z.string().max(40).optional(),
  line_items: z.array(LineItem).min(1).max(200),
  notes: z.string().max(2000).optional(),
});

export async function GET(req: Request) {
  const auth = await requireApiAuth();
  if (auth instanceof NextResponse) return auth;
  const { sb } = auth;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  let query = sb
    .from("purchase_orders")
    .select("id, po_number, status, ordered_at, expected_at, received_at, total, currency, line_items, notes, suppliers(name)")
    .order("ordered_at", { ascending: false })
    .limit(100);

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) {
    return apiError({ status: 500, message: "Database error", cause: error, tag: "purchase-orders" });
  }

  return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
  const auth = await requireApiAuth();
  if (auth instanceof NextResponse) return auth;
  const { sb, profile } = auth;

  const body = await req.json();
  const parsed = CreatePO.safeParse(body);
  if (!parsed.success) {
    return apiValidationError(parsed.error, "purchase-orders");
  }

  const concept = resolveWriteConcept(profile);
  const total = parsed.data.line_items.reduce(
    (a, li) => a + li.qty * li.unit_price,
    0
  );

  const { data, error } = await sb
    .from("purchase_orders")
    .insert({
      supplier_id: parsed.data.supplier_id,
      ordered_at: new Date().toISOString(),
      expected_at: parsed.data.expected_at || null,
      line_items: parsed.data.line_items,
      total,
      currency: "PHP",
      status: "draft",
      notes: parsed.data.notes || null,
      concept,
    })
    .select("id, po_number, status")
    .single();

  if (error) {
    return apiError({ status: 500, message: "Database error", cause: error, tag: "purchase-orders" });
  }

  return NextResponse.json(data);
}

export async function PATCH(req: Request) {
  const auth = await requireApiAuth();
  if (auth instanceof NextResponse) return auth;
  const { sb, user, profile } = auth;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const action = searchParams.get("action");

  if (!id || !action) {
    return NextResponse.json({ error: "Missing id or action param" }, { status: 400 });
  }

  // State machine. Cancel is only legal from pre-fulfillment states —
  // cancelling a received/logged PO would orphan inventory adjustments.
  const validTransitions: Record<
    string,
    { fromStates: string[]; to: string; fields: Record<string, unknown>; ownerOnly?: boolean }
  > = {
    approve: {
      fromStates: ["draft"],
      to: "approved",
      fields: { approved_at: new Date().toISOString(), approved_by: user.id },
      ownerOnly: true,
    },
    send: {
      fromStates: ["approved"],
      to: "sent",
      fields: { sent_at: new Date().toISOString() },
    },
    receive: {
      fromStates: ["sent"],
      to: "received",
      fields: { received_at: new Date().toISOString() },
    },
    log: {
      fromStates: ["received"],
      to: "logged",
      fields: {},
    },
    cancel: {
      fromStates: ["draft", "approved", "sent"],
      to: "cancelled",
      fields: {},
    },
  };

  const transition = validTransitions[action];
  if (!transition) {
    return NextResponse.json({ error: `Invalid action: ${action}` }, { status: 400 });
  }

  if (transition.ownerOnly && profile.role !== "owner") {
    return NextResponse.json(
      { error: `Owner access required to ${action}` },
      { status: 403 }
    );
  }

  // Pre-check current status for clearer error messaging on invalid transitions
  // (e.g., double-click on Approve doesn't return a confusing 404).
  const { data: current } = await sb
    .from("purchase_orders")
    .select("id, status, concept")
    .eq("id", id)
    .maybeSingle();

  if (!current) {
    return NextResponse.json({ error: "PO not found" }, { status: 404 });
  }

  // Concept scoping: managers can only act on their own concept's POs
  if (profile.role !== "owner" && current.concept !== profile.concept) {
    return NextResponse.json({ error: "PO not found" }, { status: 404 });
  }

  // Idempotency: already at target state — return success.
  if (current.status === transition.to) {
    const { data: existing } = await sb
      .from("purchase_orders")
      .select("id, po_number, status")
      .eq("id", id)
      .single();
    return NextResponse.json(existing);
  }

  if (!transition.fromStates.includes(current.status)) {
    return NextResponse.json(
      {
        error: `Cannot ${action} a PO in status "${current.status}" (expected one of: ${transition.fromStates.join(", ")})`,
      },
      { status: 409 }
    );
  }

  const { data, error } = await sb
    .from("purchase_orders")
    .update({ status: transition.to, ...transition.fields })
    .eq("id", id)
    .select("id, po_number, status")
    .single();

  if (error) {
    return apiError({ status: 500, message: "Database error", cause: error, tag: "purchase-orders" });
  }

  return NextResponse.json(data);
}
