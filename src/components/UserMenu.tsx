"use client";

import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";

interface UserMenuProps {
  displayName: string;
  role: "owner" | "manager";
  concept: string | null;
}

export default function UserMenu({ displayName, role, concept }: UserMenuProps) {
  const router = useRouter();

  async function handleLogout() {
    const sb = supabaseBrowser();
    await sb.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="border-t border-stone-200 pt-4 mt-4">
      <div className="text-sm font-medium text-stone-900 truncate">{displayName}</div>
      <div className="text-[10px] uppercase tracking-wider text-stone-500 mt-0.5">
        {role}{concept ? ` · ${concept}` : ""}
      </div>
      <button
        onClick={handleLogout}
        className="mt-2 text-xs text-stone-500 hover:text-japonesa-red transition"
      >
        Sign out
      </button>
    </div>
  );
}
