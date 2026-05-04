"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import UserMenu from "./UserMenu";
import ConceptSwitcher from "./ConceptSwitcher";

const TABS = [
  { href: "/",                label: "Pulse",     icon: "◉" },
  { href: "/menu",            label: "Menu",      icon: "🍣" },
  { href: "/inventory",       label: "Inventory", icon: "📦" },
  { href: "/purchase-orders", label: "POs",       icon: "📋" },
  { href: "/ops",             label: "Ops",       icon: "⚙︎" },
  { href: "/team",            label: "Team",      icon: "👥" },
  { href: "/money",           label: "Money",     icon: "₱" },
];

const CONCEPT_LABELS: Record<string, string> = {
  japonesa: "JAPONESA",
  alamat: "ALAMAT",
  tryst: "TRYST",
};

interface ShellProps {
  children: React.ReactNode;
  user?: {
    displayName: string;
    role: "owner" | "manager";
    concept: string | null;
  };
  activeConcept: string;
  conceptOptions: readonly string[];
}

export default function Shell({ children, user, activeConcept, conceptOptions }: ShellProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-stone-50">
      {/* Desktop sidebar — hidden below md */}
      <div className="hidden md:block shrink-0">
        <Sidebar
          user={user}
          activeConcept={activeConcept}
          conceptOptions={conceptOptions}
        />
      </div>

      {/* Mobile overlay */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
          />
          <aside className="relative z-10 w-64 bg-white h-full p-6 shadow-xl flex flex-col">
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
                    onClick={() => setOpen(false)}
                    className={`flex items-center px-3 py-3 rounded text-sm transition min-h-[44px] ${
                      active
                        ? "bg-japonesa-red text-white"
                        : "text-stone-700 hover:bg-stone-100"
                    }`}
                  >
                    <span className="mr-3 text-base">{tab.icon}</span>
                    {tab.label}
                  </Link>
                );
              })}
              {user?.role === "owner" && (
                <>
                  <div className="text-[10px] uppercase tracking-wider text-stone-400 mt-4 mb-1 px-3">
                    Owner
                  </div>
                  <Link
                    href={"/upload" as any}
                    onClick={() => setOpen(false)}
                    className={`flex items-center px-3 py-3 rounded text-sm transition min-h-[44px] ${
                      pathname.startsWith("/upload")
                        ? "bg-japonesa-red text-white"
                        : "text-stone-700 hover:bg-stone-100"
                    }`}
                  >
                    <span className="mr-3 text-base">📤</span>
                    Upload
                  </Link>
                  <Link
                    href={"/insights" as any}
                    onClick={() => setOpen(false)}
                    className={`flex items-center px-3 py-3 rounded text-sm transition min-h-[44px] ${
                      pathname.startsWith("/insights")
                        ? "bg-japonesa-red text-white"
                        : "text-stone-700 hover:bg-stone-100"
                    }`}
                  >
                    <span className="mr-3 text-base">🧠</span>
                    Insights
                  </Link>
                  <div className="text-[10px] uppercase tracking-wider text-stone-400 mt-4 mb-1 px-3">
                    Admin
                  </div>
                  <Link
                    href={"/admin/suppliers" as any}
                    onClick={() => setOpen(false)}
                    className={`flex items-center px-3 py-3 rounded text-sm transition min-h-[44px] ${
                      pathname.startsWith("/admin/suppliers")
                        ? "bg-japonesa-red text-white"
                        : "text-stone-700 hover:bg-stone-100"
                    }`}
                  >
                    <span className="mr-3 text-base">🚚</span>
                    Suppliers
                  </Link>
                  <Link
                    href={"/admin/menu" as any}
                    onClick={() => setOpen(false)}
                    className={`flex items-center px-3 py-3 rounded text-sm transition min-h-[44px] ${
                      pathname.startsWith("/admin/menu")
                        ? "bg-japonesa-red text-white"
                        : "text-stone-700 hover:bg-stone-100"
                    }`}
                  >
                    <span className="mr-3 text-base">📖</span>
                    Menu items
                  </Link>
                  <Link
                    href={"/admin/ingredients" as any}
                    onClick={() => setOpen(false)}
                    className={`flex items-center px-3 py-3 rounded text-sm transition min-h-[44px] ${
                      pathname.startsWith("/admin/ingredients")
                        ? "bg-japonesa-red text-white"
                        : "text-stone-700 hover:bg-stone-100"
                    }`}
                  >
                    <span className="mr-3 text-base">🥢</span>
                    Ingredients
                  </Link>
                  <Link
                    href={"/admin/users" as any}
                    onClick={() => setOpen(false)}
                    className={`flex items-center px-3 py-3 rounded text-sm transition min-h-[44px] ${
                      pathname === "/admin/users"
                        ? "bg-japonesa-red text-white"
                        : "text-stone-700 hover:bg-stone-100"
                    }`}
                  >
                    <span className="mr-3 text-base">🔐</span>
                    Users
                  </Link>
                  <Link
                    href={"/admin/audit" as any}
                    onClick={() => setOpen(false)}
                    className={`flex items-center px-3 py-3 rounded text-sm transition min-h-[44px] ${
                      pathname.startsWith("/admin/audit")
                        ? "bg-japonesa-red text-white"
                        : "text-stone-700 hover:bg-stone-100"
                    }`}
                  >
                    <span className="mr-3 text-base">📜</span>
                    Audit log
                  </Link>
                </>
              )}
            </nav>
            <div className="text-xs text-stone-400 leading-relaxed mt-4">
              Targets: 28–32% food · 26–30% labor · &lt;62% prime
            </div>
            {user && (
              <UserMenu
                displayName={user.displayName}
                role={user.role}
                concept={user.concept}
              />
            )}
          </aside>
        </div>
      )}

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-stone-900 h-12 flex items-center px-4 gap-3">
        <button
          onClick={() => setOpen(true)}
          className="text-white text-xl leading-none w-10 h-10 flex items-center justify-center rounded"
          aria-label="Open navigation"
        >
          ☰
        </button>
        <span className="text-white font-bold tracking-widest text-sm">JAPONESA</span>
      </div>

      {/* Main content */}
      <main className="flex-1 min-w-0 p-4 pt-16 md:pt-4 md:p-8 max-w-[1400px] overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
