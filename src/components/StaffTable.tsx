"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { php } from "@/lib/kpis";

interface Staff {
  id: string;
  name: string;
  role: string;
  hire_date: string;
  base_rate_php: number;
  rate_unit: string;
  employment_type: string;
  statutory_loaded_rate_php: number;
  active: boolean;
}

interface StaffTableProps {
  staff: Staff[];
  title: string;
  isOwner: boolean;
}

export default function StaffTable({ staff, title, isOwner }: StaffTableProps) {
  const router = useRouter();
  const [deactivating, setDeactivating] = useState<string | null>(null);

  async function handleDeactivate(s: Staff) {
    if (!confirm(`Deactivate ${s.name}?`)) return;
    setDeactivating(s.id);

    await fetch(`/api/staff?id=${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: false }),
    });

    setDeactivating(null);
    router.refresh();
  }

  function tenure(hireDate: string) {
    const months = Math.round(
      (Date.now() - new Date(hireDate).getTime()) / (30.44 * 86_400_000)
    );
    return months >= 12
      ? `${Math.floor(months / 12)}y ${months % 12}m`
      : `${months}m`;
  }

  if (staff.length === 0) {
    return null;
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-stone-700 mb-2">{title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-stone-100 text-stone-600 text-left text-xs uppercase">
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2">Tenure</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2 text-right">Base</th>
              <th className="px-3 py-2 text-right">Loaded</th>
              {isOwner && <th className="px-3 py-2" />}
            </tr>
          </thead>
          <tbody>
            {staff.map((s) => (
              <tr key={s.id} className="border-t border-stone-100 hover:bg-stone-50">
                <td className="px-3 py-2 font-medium">{s.name}</td>
                <td className="px-3 py-2">{s.role}</td>
                <td className="px-3 py-2 text-stone-500">{tenure(s.hire_date)}</td>
                <td className="px-3 py-2">
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded ${
                      s.employment_type === "regular"
                        ? "bg-emerald-100 text-emerald-700"
                        : s.employment_type === "probationary"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-stone-200 text-stone-600"
                    }`}
                  >
                    {s.employment_type}
                  </span>
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {php(s.base_rate_php)}
                  <span className="text-xs text-stone-400 ml-0.5">/{s.rate_unit.slice(0, 2)}</span>
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {/* Loaded rate must be persisted by /api/staff (POST applies the
                      correct PH factor: 1.27 regular / 1.10 probationary on the
                      monthly equivalent of base). If it isn't set, show a dash
                      rather than fabricate a fallback. */}
                  {s.statutory_loaded_rate_php ? php(s.statutory_loaded_rate_php) : "—"}
                </td>
                {isOwner && (
                  <td className="px-3 py-2">
                    <button
                      onClick={() => handleDeactivate(s)}
                      disabled={deactivating === s.id}
                      className="text-xs text-red-600 hover:text-red-800 disabled:opacity-50"
                    >
                      {deactivating === s.id ? "..." : "Deactivate"}
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
