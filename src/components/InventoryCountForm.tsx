"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "./Toast";

interface Ingredient {
  id: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  current_unit_cost: number;
}

interface CountEntry {
  ingredient_id: string;
  qty_on_hand: string;
  unit_cost: string;
}

function now() {
  return new Date().toISOString().slice(0, 16);
}

export default function InventoryCountForm() {
  const router = useRouter();
  const toast = useToast();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [entries, setEntries] = useState<CountEntry[]>([]);
  const [countedAt, setCountedAt] = useState(now());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetch("/api/ingredients")
      .then((r) => r.json())
      .then((data: Ingredient[]) => {
        if (!Array.isArray(data)) return;
        setIngredients(data);
        setEntries(
          data.map((ing) => ({
            ingredient_id: ing.id,
            qty_on_hand: "",
            unit_cost: String(ing.current_unit_cost || ""),
          }))
        );
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function updateEntry(index: number, field: "qty_on_hand" | "unit_cost", value: string) {
    setEntries((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const filledRows = entries
      .filter((e) => e.qty_on_hand !== "")
      .map((e) => ({
        ingredient_id: e.ingredient_id,
        qty_on_hand: Number(e.qty_on_hand),
        unit_cost: Number(e.unit_cost) || 0,
      }));

    if (filledRows.length === 0) {
      setError("Please enter at least one count");
      return;
    }

    setSubmitting(true);

    const res = await fetch("/api/inventory-counts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        counted_at: new Date(countedAt).toISOString(),
        rows: filledRows,
      }),
    });

    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : JSON.stringify(data.error));
      return;
    }

    toast.success(`Saved ${data.inserted} inventory counts`);
    // Clear qty fields
    setEntries((prev) =>
      prev.map((e) => ({ ...e, qty_on_hand: "" }))
    );
    router.refresh();
  }

  const inputCls =
    "w-full rounded border border-stone-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-japonesa-red focus:border-transparent tabular-nums";

  const filledCount = entries.filter((e) => e.qty_on_hand !== "").length;

  return (
    <section className="mt-10">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-lg font-semibold text-stone-900 mb-3"
      >
        <span className="text-sm">{expanded ? "▼" : "▶"}</span>
        Inventory Count Entry
      </button>

      {expanded && (
        <div className="rounded border border-stone-200 bg-white p-4 shadow-sm">
          {loading ? (
            <div className="text-sm text-stone-500">Loading ingredients...</div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="flex items-center gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">
                    Count Date/Time
                  </label>
                  <input
                    type="datetime-local"
                    value={countedAt}
                    onChange={(e) => setCountedAt(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div className="text-sm text-stone-500 mt-5">
                  {filledCount} of {entries.length} items counted
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-stone-100 text-stone-600 text-xs uppercase">
                    <tr>
                      <th className="text-left px-3 py-2">Ingredient</th>
                      <th className="text-left px-3 py-2">Category</th>
                      <th className="text-left px-3 py-2">Unit</th>
                      <th className="text-right px-3 py-2 w-28">Qty on Hand</th>
                      <th className="text-right px-3 py-2 w-28">Unit Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ingredients.map((ing, i) => (
                      <tr key={ing.id} className="border-t border-stone-100">
                        <td className="px-3 py-1.5 text-stone-900">{ing.name}</td>
                        <td className="px-3 py-1.5 text-stone-500 text-xs">{ing.category}</td>
                        <td className="px-3 py-1.5 text-stone-500 text-xs">{ing.unit}</td>
                        <td className="px-3 py-1.5">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={entries[i]?.qty_on_hand ?? ""}
                            onChange={(e) => updateEntry(i, "qty_on_hand", e.target.value)}
                            className={inputCls}
                            placeholder="—"
                          />
                        </td>
                        <td className="px-3 py-1.5">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={entries[i]?.unit_cost ?? ""}
                            onChange={(e) => updateEntry(i, "unit_cost", e.target.value)}
                            className={inputCls}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {error && (
                <div className="mt-4 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
                  {error}
                </div>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="mt-4 rounded bg-japonesa-red px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-900 transition disabled:opacity-50"
              >
                {submitting ? "Saving..." : `Save Count (${filledCount} items)`}
              </button>
            </form>
          )}
        </div>
      )}
    </section>
  );
}
