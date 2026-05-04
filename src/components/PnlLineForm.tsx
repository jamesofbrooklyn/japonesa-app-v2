"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { manilaToday } from "@/lib/dates";
import { useToast } from "./Toast";

const CATEGORIES = [
  { value: "cogs", label: "COGS" },
  { value: "labor", label: "Labor" },
  { value: "rent", label: "Rent" },
  { value: "utilities", label: "Utilities" },
  { value: "marketing", label: "Marketing" },
  { value: "other", label: "Other OPEX" },
] as const;

function today() {
  return manilaToday();
}

export default function PnlLineForm() {
  const router = useRouter();
  const toast = useToast();
  const [occurredOn, setOccurredOn] = useState(today());
  const [category, setCategory] = useState("cogs");
  const [subcategory, setSubcategory] = useState("");
  const [amount, setAmount] = useState("");
  const [source, setSource] = useState("manual");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/pnl-lines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        occurred_on: occurredOn,
        category,
        subcategory,
        amount_php: Number(amount),
        source,
        notes: notes || undefined,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : JSON.stringify(data.error));
      return;
    }

    toast.success(`Added ${data.category} — ${data.subcategory}: ₱${Number(data.amount_php).toLocaleString()}`);
    setSubcategory("");
    setAmount("");
    setNotes("");
    router.refresh();
  }

  const inputCls =
    "w-full rounded border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-japonesa-red focus:border-transparent";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Date</label>
          <input
            type="date"
            required
            value={occurredOn}
            onChange={(e) => setOccurredOn(e.target.value)}
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={inputCls}
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Subcategory</label>
          <input
            type="text"
            required
            value={subcategory}
            onChange={(e) => setSubcategory(e.target.value)}
            className={inputCls}
            placeholder="e.g. Fish import, Electricity"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Amount (PHP)</label>
          <input
            type="number"
            required
            step="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={inputCls}
            placeholder="0"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Source</label>
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className={inputCls}
          >
            <option value="manual">Manual</option>
            <option value="pos">POS</option>
            <option value="payroll">Payroll</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Notes</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={inputCls}
            placeholder="Optional"
          />
        </div>
      </div>

      {error && (
        <div className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="rounded bg-japonesa-red px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-900 transition disabled:opacity-50"
      >
        {loading ? "Adding..." : "Add P&L Line"}
      </button>
    </form>
  );
}
