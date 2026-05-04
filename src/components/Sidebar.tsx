"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import UserMenu from "./UserMenu";
import ConceptSwitcher from "./ConceptSwitcher";

const TABS = [
  { href: "/", label: "Pulse", icon: "◉" },
  { href: "/menu", label: "Menu Eng.", icon: "🍣" },
  { href: "/inventory", label: "Inventory", icon: "📦" },
  { href: "/purchase-orders", label: "POs", icon: "📋" },
  { href: "/ops", label: "Operations", icon: "⚙︎" },
  { href: "/team", label: "Team", icon: "👥" },
  { href: "/money", label: "Money", icon: "₱" },
];

const CONCEPT_LABELS: Record<string, string> = {
  japonesa: "JAPONESA",
  alamat: "ALAMAT",
  tryst: "TRYST",
};

interface SidebarProps {
  user?: {
    displayName: string;
    role: "owner" | "manager";
    concept: string | null;
  };
  /** Active concept resolved server-side; passed down so the wordmark + switcher are SSR-correct. */
  activeConcept: string;
  /** All concepts the current user can switch to (only meaningful for owners). */
  conceptOptions: readonly string[];
}

export default function Sidebar({ user, activeConcept, conceptOptions }: SidebarProps) {
  const pathname = usePathname();
  return (
    <aside className="w-56 border-r border-stone-200 bg-white p-6 flex flex-col">
      <div className="mb-6">
        <div className="text-japonesa-red text-xl font-bold tracking-widest">
          {CONCEPT_LABELS[activeConcept] ?? activeConcept.toUpperCase()}
        </div>
        <div className="text-xs text-stone-500 mt-1">Poblacion · Exec</div>
      </div>
      {user?.role === "owner" && conceptOptions.length > 1 && (
        <ConceptSwitcher currentConcept={activeConcept} options={conceptOptions} />
      )}
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
          <>
            <div className="text-[10px] uppercase tracking-wider text-stone-400 mt-6 mb-1 px-3">
              Owner
            </div>
            <Link
              href={"/upload" as any}
              className={`flex items-center px-3 py-3 rounded text-sm transition min-h-[44px] ${
                pathname.startsWith("/upload")
                  ? "bg-japonesa-red text-white"
                  : "text-stone-700 hover:bg-stone-100"
              }`}
            >
              <span className="mr-2">📤</span>
              Upload
            </Link>
            <Link
              href={"/insights" as any}
              className={`flex items-center px-3 py-3 rounded text-sm transition min-h-[44px] ${
                pathname.startsWith("/insights")
                  ? "bg-japonesa-red text-white"
                  : "text-stone-700 hover:bg-stone-100"
              }`}
            >
              <span className="mr-2">🧠</span>
              Insights
            </Link>
            <div className="text-[10px] uppercase tracking-wider text-stone-400 mt-4 mb-1 px-3">
              Admin
            </div>
            <Link
              href={"/admin/suppliers" as any}
              className={`flex items-center px-3 py-3 rounded text-sm transition min-h-[44px] ${
                pathname.startsWith("/admin/suppliers")
                  ? "bg-japonesa-red text-white"
                  : "text-stone-700 hover:bg-stone-100"
              }`}
            >
              <span className="mr-2">🚚</span>
              Suppliers
            </Link>
            <Link
              href={"/admin/menu" as any}
              className={`flex items-center px-3 py-3 rounded text-sm transition min-h-[44px] ${
                pathname.startsWith("/admin/menu")
                  ? "bg-japonesa-red text-white"
                  : "text-stone-700 hover:bg-stone-100"
              }`}
            >
              <span className="mr-2">📖</span>
              Menu items
            </Link>
            <Link
              href={"/admin/ingredients" as any}
              className={`flex items-center px-3 py-3 rounded text-sm transition min-h-[44px] ${
                pathname.startsWith("/admin/ingredients")
                  ? "bg-japonesa-red text-white"
                  : "text-stone-700 hover:bg-stone-100"
              }`}
            >
              <span className="mr-2">🥢</span>
              Ingredients
            </Link>
            <Link
              href={"/admin/users" as any}
              className={`flex items-center px-3 py-3 rounded text-sm transition min-h-[44px] ${
                pathname === "/admin/users"
                  ? "bg-japonesa-red text-white"
                  : "text-stone-700 hover:bg-stone-100"
              }`}
            >
              <span className="mr-2">🔐</span>
              Users
            </Link>
            <Link
              href={"/admin/audit" as any}
              className={`flex items-center px-3 py-3 rounded text-sm transition min-h-[44px] ${
                pathname.startsWith("/admin/audit")
                  ? "bg-japonesa-red text-white"
                  : "text-stone-700 hover:bg-stone-100"
              }`}
            >
              <span className="mr-2">📜</span>
              Audit log
            </Link>
          </>
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
