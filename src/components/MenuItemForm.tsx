"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "./Toast";

const CATEGORIES = [
  "appetizers", "omakase", "sushi", "sashimi", "signature_maki", "maki",
  "mains", "kushiyaki", "roast_chicken", "donburi", "desserts", "drinks",
];

export default function MenuItemForm({ onCreated }: { onCreated?: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [sku, setSku] = useState("");
  const [posId, setPosId] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [variant, setVariant] = useState("");
  const [pricePhp, setPricePhp] = useState("");
  const [theoreticalCost, setTheoreticalCost] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/menu-items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sku,
        pos_id: posId || null,
        name,
        category,
        variant: variant || null,
        price_php: Number(pricePhp),
        theoretical_cost_php: theoreticalCost ? Number(theoreticalCost) : null,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : JSON.stringify(data.error));
      return;
    }

    toast.success(`Added "${data.name}" (${data.sku})`);
    setSku("");
    setPosId("");
    setName("");
    setVariant("");
    setPricePhp("");
    setTheoreticalCost("");
    onCreated?.();
    router.refresh();
  }

  const inputCls =
    "w-full rounded border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-japonesa-red focus:border-transparent";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <fieldset disabled={loading} className="space-y-4 disabled:opacity-60">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">SKU *</label>
          <input
            type="text"
            required
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            className={inputCls}
            placeholder="e.g. SUSHI-OTORO-2PC"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">POS ID</label>
          <input
            type="text"
            value={posId}
            onChange={(e) => setPosId(e.target.value)}
            className={inputCls}
            placeholder="OneClickTech ID for CSV matching"
          />
        </div>
        <div className="lg:col-span-2">
          <label className="block text-sm font-medium text-stone-700 mb-1">Name *</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputCls}
            placeholder="A5 Wagyu Steak Frites"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Category *</label>
          <select
            required
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={inputCls}
          >
            <option value="">Select...</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Variant</label>
          <input
            type="text"
            value={variant}
            onChange={(e) => setVariant(e.target.value)}
            className={inputCls}
            placeholder="8pc / sushi_2pc / whole"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Menu price (₱) *</label>
          <input
            type="number"
            required
            min="0"
            step="0.01"
            value={pricePhp}
            onChange={(e) => setPricePhp(e.target.value)}
            className={inputCls}
            placeholder="3500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Theoretical cost (₱)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={theoreticalCost}
            onChange={(e) => setTheoreticalCost(e.target.value)}
            className={inputCls}
            placeholder="recipe-driven; leave blank if unknown"
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
        disabled={loading || !sku || !name || !category || !pricePhp}
        className="rounded bg-japonesa-red px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-900 transition disabled:opacity-50"
      >
        {loading ? "Adding..." : "Add Menu Item"}
      </button>
      </fieldset>
    </form>
  );
}
