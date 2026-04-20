import { redirect } from "next/navigation";
import { supabaseServer } from "./supabase-server";

export interface UserProfile {
  id: string;
  user_id: string;
  display_name: string;
  role: "owner" | "manager";
  concept: string | null;
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
