"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "./Toast";

const CATEGORIES = ["dry", "protein", "produce", "dairy", "alcohol", "import"] as const;
const UNITS = ["kg", "g", "l", "ml", "pc"] as const;

interface Supplier {
  id: string;
  name: string;
}

export default function IngredientForm({ onCreated }: { onCreated?: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState<typeof CATEGORIES[number]>("produce");
  const [unit, setUnit] = useState<typeof UNITS[number]>("kg");
  const [unitCost, setUnitCost] = useState("");
  const [supplierId, setSupplierId] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/suppliers")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setSuppliers(data);
      })
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/ingredients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sku,
        name,
        category,
        unit,
        current_unit_cost: unitCost ? Number(unitCost) : null,
        supplier_id: supplierId || null,
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
    setName("");
    setUnitCost("");
    setSupplierId("");
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
            placeholder="e.g. PROD-OTORO"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Name *</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputCls}
            placeholder="Otoro (bluefin belly)"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Category *</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as typeof CATEGORIES[number])}
            className={inputCls}
          >
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Unit *</label>
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value as typeof UNITS[number])}
            className={inputCls}
          >
            {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Current unit cost (₱)</label>
          <input
            type="number"
            min="0"
            step="0.0001"
            value={unitCost}
            onChange={(e) => setUnitCost(e.target.value)}
            className={inputCls}
            placeholder="per unit"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Default supplier</label>
          <select
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            className={inputCls}
          >
            <option value="">None / multiple</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}
      <button
        type="submit"
        disabled={loading || !sku || !name}
        className="rounded bg-japonesa-red px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-900 transition disabled:opacity-50"
      >
        {loading ? "Adding..." : "Add Ingredient"}
      </button>
      </fieldset>
    </form>
  );
}
