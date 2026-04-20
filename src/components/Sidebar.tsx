"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import UserMenu from "./UserMenu";

const TABS = [
  { href: "/", label: "Pulse", icon: "◉" },
  { href: "/menu", label: "Menu Eng.", icon: "🍣" },
  { href: "/inventory", label: "Inventory", icon: "📦" },
  { href: "/ops", label: "Operations", icon: "⚙︎" },
  { href: "/team", label: "Team", icon: "👥" },
  { href: "/money", label: "Money", icon: "₱" },
];

interface SidebarProps {
  user?: {
    displayName: string;
    role: "owner" | "manager";
    concept: string | null;
  };
}

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  return (
    <aside className="w-56 border-r border-stone-200 bg-white p-6 flex flex-col">
      <div className="mb-10">
        <div className="text-japonesa-red text-xl font-bold tracking-widest">
          JAPONESA
        </div>
        <div className="text-xs text-stone-500 mt-1">Poblacion · Exec</div>
      </div>
      <nav className="space-y-1 flex-1">
        {TABS.map((tab) => {
          const active =
            tab.href === "/"
              ? pathname === "/"
              : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href as any}
              className={`flex items-center px-3 py-3 rounded text-sm transition min-h-[44px] ${
                active
                  ? "bg-japonesa-red text-white"
                  : "text-stone-700 hover:bg-stone-100"
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </Link>
          );
        })}
        {user?.role === "owner" && (
          <Link
            href={"/admin/users" as any}
            className={`flex items-center px-3 py-3 rounded text-sm transition min-h-[44px] ${
              pathname.startsWith("/admin")
                ? "bg-japonesa-red text-white"
                : "text-stone-700 hover:bg-stone-100"
            }`}
          >
            <span className="mr-2">🔐</span>
            Admin
          </Link>
        )}
      </nav>
      <div className="mt-10 text-xs text-stone-400 leading-relaxed">
        Wed–Tue week<br />
        Targets: 28-32% food · 26-30% labor · &lt;62% prime
      </div>
      {user && (
        <UserMenu
          displayName={user.displayName}
          role={user.role}
          concept={user.concept}
        />
      )}
    </aside>
  );
}
