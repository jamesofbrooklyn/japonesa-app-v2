"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";

const TABS = [
  { href: "/",          label: "Pulse",     icon: "◉" },
  { href: "/menu",      label: "Menu",      icon: "🍣" },
  { href: "/inventory", label: "Inventory", icon: "📦" },
  { href: "/ops",       label: "Ops",       icon: "⚙︎" },
  { href: "/team",      label: "Team",      icon: "👥" },
  { href: "/money",     label: "Money",     icon: "₱" },
];

export default function Shell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-stone-50">
      {/* Desktop sidebar — hidden below md */}
      <div className="hidden md:block shrink-0">
        <Sidebar />
      </div>

      {/* Mobile overlay */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
          />
          <aside className="relative z-10 w-64 bg-white h-full p-6 shadow-xl flex flex-col">
            <div className="mb-8">
              <div className="text-japonesa-red text-xl font-bold tracking-widest">JAPONESA</div>
              <div className="text-xs text-stone-500 mt-1">Poblacion · Exec</div>
            </div>
            <nav className="space-y-1 flex-1">
              {TABS.map((tab) => {
                const active = pathname === tab.href;
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
            </nav>
            <div className="text-xs text-stone-400 leading-relaxed mt-4">
              Targets: 28–32% food · 26–30% labor · &lt;62% prime
            </div>
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
