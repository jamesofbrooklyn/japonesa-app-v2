import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { supabaseServer } from "@/lib/supabase-server";
import { z } from "zod";

const InvitePayload = z.object({
  email: z.string().email(),
  display_name: z.string().min(1),
  role: z.enum(["owner", "manager"]),
  concept: z.string().nullable(),
  password: z.string().min(6),
});

export async function POST(req: Request) {
  // Verify caller is an owner
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: callerProfile } = await sb
    .from("user_profiles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (callerProfile?.role !== "owner") {
    return NextResponse.json({ error: "Owner access required" }, { status: 403 });
  }

  // Parse and validate body
  const body = await req.json();
  const parsed = InvitePayload.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  const { email, display_name, role, concept, password } = parsed.data;

  // Enforce constraint: managers must have a concept, owners must not
  if (role === "manager" && !concept) {
    return NextResponse.json(
      { error: "Managers must be assigned to a concept" },
      { status: 400 }
    );
  }
  if (role === "owner" && concept) {
    return NextResponse.json(
      { error: "Owners cannot be scoped to a concept" },
      { status: 400 }
    );
  }

  const admin = supabaseAdmin();

  // Create the auth user
  const { data: newUser, error: createError } =
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

  if (createError) {
    return NextResponse.json({ error: createError.message }, { status: 500 });
  }

  // Create the profile
  const { error: profileError } = await admin.from("user_profiles").insert({
    user_id: newUser.user.id,
    display_name,
    role,
    concept: role === "owner" ? null : concept,
  });

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  return NextResponse.json({
    id: newUser.user.id,
    email,
    display_name,
    role,
    concept,
  });
}
