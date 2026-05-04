import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseServer } from "./supabase-server";

export interface UserProfile {
  id: string;
  user_id: string;
  display_name: string;
  role: "owner" | "manager";
  concept: string | null;
}

export interface ApiAuth {
  sb: SupabaseClient;
  user: { id: string; email?: string | null };
  profile: UserProfile;
}

/**
 * Auth helper for API routes. Returns either an `ApiAuth` bundle or a
 * NextResponse to short-circuit. Use like:
 *
 *   const auth = await requireApiAuth();
 *   if (auth instanceof NextResponse) return auth;
 *   const { sb, profile } = auth;
 *
 * Optionally enforce role and/or that the profile has a concept assigned.
 */
export async function requireApiAuth(opts?: {
  ownerOnly?: boolean;
  /** When true, manager profiles must have a non-null concept (default: true). */
  conceptRequired?: boolean;
}): Promise<ApiAuth | NextResponse> {
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await sb
    .from("user_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "No profile found" }, { status: 401 });
  }

  if (opts?.ownerOnly && profile.role !== "owner") {
    return NextResponse.json(
      { error: "Owner access required" },
      { status: 403 }
    );
  }

  const conceptRequired = opts?.conceptRequired ?? true;
  if (conceptRequired && profile.role === "manager" && !profile.concept) {
    return NextResponse.json(
      { error: "Manager profile is missing a concept assignment" },
      { status: 403 }
    );
  }

  return { sb, user, profile: profile as UserProfile };
}

/**
 * Resolve the concept to write rows under, given a profile.
 * - Owners can target any concept (default: japonesa for now since v1 is single-concept).
 * - Managers MUST have profile.concept set (enforced in requireApiAuth).
 *
 * Throws if called on a manager with no concept — that's a bug, since
 * requireApiAuth should have rejected the request first.
 */
export function resolveWriteConcept(
  profile: UserProfile,
  ownerDefault: string = "japonesa"
): string {
  if (profile.role === "owner") {
    return profile.concept ?? ownerDefault;
  }
  if (!profile.concept) {
    throw new Error(
      "Manager profile has no concept — requireApiAuth should have blocked this"
    );
  }
  return profile.concept;
}

export async function requireAuth(): Promise<{
  userId: string;
  email: string;
  profile: UserProfile;
}> {
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await sb
    .from("user_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!profile) redirect("/login");

  return {
    userId: user.id,
    email: user.email!,
    profile: profile as UserProfile,
  };
}

export async function optionalAuth() {
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;

  const { data: profile } = await sb
    .from("user_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!profile) return null;

  return {
    userId: user.id,
    email: user.email!,
    profile: profile as UserProfile,
  };
}
