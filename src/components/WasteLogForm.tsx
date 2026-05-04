"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "./Toast";
import { manilaToday } from "@/lib/dates";

interface Item {
  id: string;
  name: string;
  type: "ingredient" | "menu_item";
}

const REASONS = [
  "expired",
  "spoiled",
  "overcooked",
  "dropped",
  "overproduction",
  "other",
] as const;

function today() {
  return manilaToday();
}

export default function WasteLogForm() {
  const router = useRouter();
  const toast = useToast();
  const [items, setItems] = useState<Item[]>([]);
  const [occurredOn, setOccurredOn] = useState(today());
  const [selectedItem, setSelectedItem] = useState("");
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState("expired");
  const [otherReason, setOtherReason] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/ingredients").then((r) => r.json()),
      fetch("/api/menu-items").then((r) => r.json()),
    ]).then(([ingredients, menuItems]) => {
      const combined: Item[] = [
        ...(Array.isArray(ingredients)
          ? ingredients.map((i: any) => ({ id: i.id, name: `[Ingredient] ${i.name}`, type: "ingredient" as const }))
          : []),
        ...(Array.isArray(menuItems)
          ? menuItems.map((m: any) => ({ id: m.id, name: `[Menu] ${m.name}`, type: "menu_item" as const }))
          : []),
      ];
      setItems(combined);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const selected = items.find((i) => i.id === selectedItem);
    if (!selected) {
      setError("Please select an item");
      return;
    }

    setLoading(true);

    const payload: any = {
      occurred_on: occurredOn,
      qty: Number(qty),
      reason: reason === "other" ? otherReason : reason,
    };

    if (selected.type === "ingredient") {
      payload.ingredient_id = selected.id;
    } else {
      payload.menu_item_id = selected.id;
    }

    const res = await fetch("/api/waste-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : JSON.stringify(data.error));
      return;
    }

    toast.success(`Waste logged: ${data.qty} × ${selected.name.replace(/\[(Ingredient|Menu)\] /, "")}`);
    setQty("");
    setSelectedItem("");
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
          <label className="block text-sm font-medium text-stone-700 mb-1">Item</label>
          <select
            required
            value={selectedItem}
            onChange={(e) => setSelectedItem(e.target.value)}
            className={inputCls}
          >
            <option value="">Select item...</option>
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Quantity</label>
          <input
            type="number"
            required
            min="0.01"
            step="0.01"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            className={inputCls}
            placeholder="0"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Reason</label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className={inputCls}
          >
            {REASONS.map((r) => (
              <option key={r} value={r}>
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {reason === "other" && (
        <input
          type="text"
          required
          value={otherReason}
          onChange={(e) => setOtherReason(e.target.value)}
          className={inputCls}
          placeholder="Describe the reason"
        />
      )}

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
        {loading ? "Logging..." : "Log Waste"}
      </button>
    </form>
  );
}
