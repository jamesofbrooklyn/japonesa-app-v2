"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Pulse", icon: "◉" },
  { href: "/menu", label: "Menu Eng.", icon: "🍣" },
  { href: "/inventory", label: "Inventory", icon: "📦" },
  { href: "/ops", label: "Operations", icon: "⚙︎" },
  { href: "/team", label: "Team", icon: "👥" },
  { href: "/money", label: "Money", icon: "₱" },
];

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-56 border-r border-stone-200 bg-white p-6">
      <div className="mb-10">
        <div className="text-japonesa-red text-xl font-bold tracking-widest">
          JAPONESA
        </div>
        <div className="text-xs text-stone-500 mt-1">Poblacion · Exec</div>
      </div>
      <nav className="space-y-1">
        {TABS.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href as any}
              className={`block px-3 py-2 rounded text-sm transition ${
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
      </nav>
      <div className="mt-10 text-[10px] text-stone-400 leading-relaxed">
        Wed–Tue week<br />
        Targets: 28-32% food · 26-30% labor · &lt;62% prime
      </div>
    </aside>
  );
}
