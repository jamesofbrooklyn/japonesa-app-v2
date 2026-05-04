"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TableSkeleton } from "./Skeleton";

interface PnlLine {
  id: string;
  occurred_on: string;
  category: string;
  subcategory: string;
  amount_php: number;
  source: string;
  notes: string | null;
}

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function PnlLineList({ isOwner }: { isOwner: boolean }) {
  const router = useRouter();
  const [lines, setLines] = useState<PnlLine[]>([]);
  const [month, setMonth] = useState(currentMonth());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{
    subcategory: string;
    amount_php: string;
  } | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/pnl-lines?month=${month}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load P&L entries");
        return r.json();
      })
      .then((data) => {
        setLines(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message || "Failed to load");
        setLoading(false);
      });
  }, [month]);

  async function handleDelete(id: string) {
    if (!confirm("Delete this P&L line?")) return;
    const res = await fetch(`/api/pnl-lines?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setLines((prev) => prev.filter((l) => l.id !== id));
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "Delete failed");
    }
  }

  function startEdit(line: PnlLine) {
    setEditingId(line.id);
    setEditDraft({
      subcategory: line.subcategory,
      amount_php: String(line.amount_php),
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditDraft(null);
  }

  async function saveEdit(id: string) {
    if (!editDraft) return;
    setSavingId(id);
    setError(null);

    const res = await fetch(`/api/pnl-lines?id=${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subcategory: editDraft.subcategory,
        amount_php: Number(editDraft.amount_php),
      }),
    });

    setSavingId(null);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "Save failed");
      return;
    }

    const updated = await res.json();
    setLines((prev) =>
      prev.map((l) =>
        l.id === id
          ? { ...l, subcategory: updated.subcategory, amount_php: updated.amount_php }
          : l
      )
    );
    cancelEdit();
    router.refresh();
  }

  const catColors: Record<string, string> = {
    cogs: "bg-amber-100 text-amber-800",
    labor: "bg-blue-100 text-blue-800",
    rent: "bg-stone-200 text-stone-700",
    utilities: "bg-purple-100 text-purple-800",
    marketing: "bg-pink-100 text-pink-800",
    other: "bg-stone-200 text-stone-600",
  };

  const grouped = lines.reduce<Record<string, number>>((acc, l) => {
    acc[l.category] = (acc[l.category] || 0) + Number(l.amount_php);
    return acc;
  }, {});

  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <h3 className="text-sm font-semibold text-stone-700">P&L Entries</h3>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="rounded border border-stone-300 px-2 py-1 text-xs"
        />
      </div>

      {error && (
        <div className="mb-3 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}

      {Object.keys(grouped).length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {Object.entries(grouped).map(([cat, total]) => (
            <span
              key={cat}
              className={`text-xs px-2 py-1 rounded ${catColors[cat] || "bg-stone-100"}`}
            >
              {cat.toUpperCase()}: ₱{total.toLocaleString()}
            </span>
          ))}
        </div>
      )}

      {loading ? (
        <TableSkeleton rows={4} cols={isOwner ? 6 : 5} />
      ) : lines.length === 0 ? (
        <div className="text-sm text-stone-400">No entries for {month}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-stone-100 text-stone-600 text-left text-xs uppercase">
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2">Subcategory</th>
                <th className="px-3 py-2 text-right">Amount</th>
                <th className="px-3 py-2">Source</th>
                {isOwner && <th className="px-3 py-2" />}
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => {
                const isEditing = editingId === l.id;
                return (
                  <tr key={l.id} className="border-t border-stone-100 hover:bg-stone-50">
                    <td className="px-3 py-2 tabular-nums">{l.occurred_on}</td>
                    <td className="px-3 py-2">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${catColors[l.category] || ""}`}>
                        {l.category}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {isEditing && editDraft ? (
                        <input
                          type="text"
                          value={editDraft.subcategory}
                          onChange={(e) => setEditDraft({ ...editDraft, subcategory: e.target.value })}
                          className="w-full rounded border border-stone-300 px-2 py-1 text-sm"
                        />
                      ) : (
                        l.subcategory
                      )}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {isEditing && editDraft ? (
                        <input
                          type="number"
                          step="0.01"
                          value={editDraft.amount_php}
                          onChange={(e) => setEditDraft({ ...editDraft, amount_php: e.target.value })}
                          className="w-32 rounded border border-stone-300 px-2 py-1 text-sm text-right tabular-nums"
                        />
                      ) : (
                        `₱${Number(l.amount_php).toLocaleString()}`
                      )}
                    </td>
                    <td className="px-3 py-2 text-stone-500">{l.source}</td>
                    {isOwner && (
                      <td className="px-3 py-2 whitespace-nowrap">
                        {isEditing ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => saveEdit(l.id)}
                              disabled={savingId === l.id}
                              className="text-xs text-emerald-700 hover:text-emerald-900 disabled:opacity-50"
                            >
                              {savingId === l.id ? "Saving..." : "Save"}
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="text-xs text-stone-500 hover:text-stone-700"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <button
                              onClick={() => startEdit(l)}
                              className="text-xs text-blue-600 hover:text-blue-800"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(l.id)}
                              className="text-xs text-red-600 hover:text-red-800"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
