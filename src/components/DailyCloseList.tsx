"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { php } from "@/lib/kpis";
import { TableSkeleton } from "./Skeleton";

interface Close {
  id: string;
  close_date: string;
  total_revenue_php: number;
  covers: number;
  cash_variance_php: number;
  gm_notes: string | null;
}

export default function DailyCloseList() {
  const router = useRouter();
  const [closes, setCloses] = useState<Close[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCloses();
  }, []);

  async function loadCloses() {
    setLoading(true);
    try {
      const res = await fetch("/api/daily-close");
      if (res.ok) {
        const data = await res.json();
        setCloses(Array.isArray(data) ? data : []);
      }
    } catch {
      // ignore
    }
    setLoading(false);
  }

  async function handleDelete(id: string, date: string) {
    if (!confirm(`Delete daily close for ${date}? This cannot be undone.`)) return;
    setDeletingId(id);
    setError(null);

    const res = await fetch(`/api/daily-close?id=${id}`, { method: "DELETE" });
    setDeletingId(null);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "Delete failed");
      return;
    }

    setCloses((prev) => prev.filter((c) => c.id !== id));
    router.refresh();
  }

  if (loading) {
    return <TableSkeleton rows={5} cols={6} />;
  }

  if (closes.length === 0) {
    return (
      <div className="text-sm text-stone-400">
        No daily closes yet. Submit your first one above.
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="mb-3 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}
      <div className="rounded border border-stone-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-stone-100 text-stone-600 text-xs uppercase">
              <tr>
                <th className="text-left px-3 py-2">Date</th>
                <th className="text-right px-3 py-2">Revenue</th>
                <th className="text-right px-3 py-2">Covers</th>
                <th className="text-right px-3 py-2">Cash variance</th>
                <th className="text-left px-3 py-2">Notes</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {closes.map((c) => (
                <tr key={c.id} className="border-t border-stone-100 hover:bg-stone-50">
                  <td className="px-3 py-2 font-medium tabular-nums">{c.close_date}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {php(Number(c.total_revenue_php))}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{c.covers}</td>
                  <td className={`px-3 py-2 text-right tabular-nums ${
                    Math.abs(Number(c.cash_variance_php)) > 1000
                      ? "text-red-700 font-semibold"
                      : Math.abs(Number(c.cash_variance_php)) > 100
                      ? "text-amber-700"
                      : "text-stone-500"
                  }`}>
                    {Number(c.cash_variance_php) === 0
                      ? "—"
                      : php(Number(c.cash_variance_php))}
                  </td>
                  <td className="px-3 py-2 text-stone-500 text-xs max-w-[300px] truncate">
                    {c.gm_notes ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => handleDelete(c.id, c.close_date)}
                      disabled={deletingId === c.id}
                      className="text-xs text-red-600 hover:text-red-800 disabled:opacity-50"
                    >
                      {deletingId === c.id ? "Deleting..." : "Delete"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="text-xs text-stone-500 mt-2">
        To edit a close, delete it and re-submit with corrected values.
      </div>
    </div>
  );
}
