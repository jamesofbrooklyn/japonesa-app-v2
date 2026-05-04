"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "./Toast";

interface Supplier {
  id: string;
  name: string;
  category?: string | null;
}

interface Ingredient {
  id: string;
  name: string;
  unit: string;
  current_unit_cost: number;
}

interface LineItem {
  ingredient_id: string;
  ingredient_name: string;
  qty: number;
  unit: string;
  unit_price: number;
}

export default function POForm({ onCreated }: { onCreated?: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [supplierId, setSupplierId] = useState("");
  const [expectedAt, setExpectedAt] = useState("");
  const [notes, setNotes] = useState("");
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Current line item being added
  const [curIngredient, setCurIngredient] = useState("");
  const [curQty, setCurQty] = useState("");
  const [curPrice, setCurPrice] = useState("");

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/suppliers").then((r) => {
        if (!r.ok) throw new Error(`Suppliers fetch failed (${r.status})`);
        return r.json();
      }),
      fetch("/api/ingredients").then((r) => {
        if (!r.ok) throw new Error(`Ingredients fetch failed (${r.status})`);
        return r.json();
      }),
    ])
      .then(([sups, ings]) => {
        if (cancelled) return;
        if (Array.isArray(sups)) setSuppliers(sups);
        if (Array.isArray(ings)) setIngredients(ings);
      })
      .catch((e) => {
        if (!cancelled) setLoadError(e.message || "Failed to load suppliers/ingredients");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function addLineItem() {
    const ing = ingredients.find((i) => i.id === curIngredient);
    if (!ing || !curQty) return;

    setLineItems((prev) => [
      ...prev,
      {
        ingredient_id: ing.id,
        ingredient_name: ing.name,
        qty: Number(curQty),
        unit: ing.unit,
        unit_price: Number(curPrice) || ing.current_unit_cost || 0,
      },
    ]);
    setCurIngredient("");
    setCurQty("");
    setCurPrice("");
  }

  function removeLineItem(index: number) {
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supplierId || lineItems.length === 0) {
      setError("Select a supplier and add at least one line item");
      return;
    }

    setError(null);
    setLoading(true);

    const res = await fetch("/api/purchase-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        supplier_id: supplierId,
        expected_at: expectedAt || undefined,
        line_items: lineItems,
        notes: notes || undefined,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : JSON.stringify(data.error));
      return;
    }

    toast.success(`PO ${data.po_number} created (${data.status})`);
    setLineItems([]);
    setNotes("");
    setSupplierId("");
    onCreated?.();
    router.refresh();
  }

  const inputCls =
    "w-full rounded border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-japonesa-red focus:border-transparent";

  const total = lineItems.reduce((a, li) => a + li.qty * li.unit_price, 0);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {loadError && (
        <div className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
          {loadError}. Refresh the page to retry.
        </div>
      )}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Supplier *</label>
          <select
            required
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            className={inputCls}
          >
            <option value="">
              {suppliers.length === 0 ? "No suppliers — add one in /admin/suppliers" : "Select supplier..."}
            </option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
                {s.category ? ` — ${s.category}` : ""}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Expected Delivery</label>
          <input
            type="date"
            value={expectedAt}
            onChange={(e) => setExpectedAt(e.target.value)}
            className={inputCls}
          />
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

      {/* Add line item */}
      <div className="border-t border-stone-200 pt-4">
        <h4 className="text-sm font-semibold text-stone-700 mb-2">Line Items</h4>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-2">
          <select
            value={curIngredient}
            onChange={(e) => {
              setCurIngredient(e.target.value);
              const ing = ingredients.find((i) => i.id === e.target.value);
              if (ing) setCurPrice(String(ing.current_unit_cost || ""));
            }}
            className={inputCls}
          >
            <option value="">Select ingredient...</option>
            {ingredients.map((ing) => (
              <option key={ing.id} value={ing.id}>
                {ing.name} ({ing.unit})
              </option>
            ))}
          </select>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={curQty}
            onChange={(e) => setCurQty(e.target.value)}
            className={inputCls}
            placeholder="Qty"
          />
          <input
            type="number"
            min="0"
            step="0.01"
            value={curPrice}
            onChange={(e) => setCurPrice(e.target.value)}
            className={inputCls}
            placeholder="Unit price"
          />
          <button
            type="button"
            onClick={addLineItem}
            disabled={!curIngredient || !curQty}
            className="rounded border border-stone-300 px-3 py-2 text-sm hover:bg-stone-100 transition disabled:opacity-50"
          >
            + Add
          </button>
        </div>

        {lineItems.length > 0 && (
          <table className="w-full text-sm mb-2">
            <thead className="bg-stone-100 text-stone-600 text-xs uppercase">
              <tr>
                <th className="text-left px-3 py-1.5">Ingredient</th>
                <th className="text-right px-3 py-1.5">Qty</th>
                <th className="text-right px-3 py-1.5">Price</th>
                <th className="text-right px-3 py-1.5">Subtotal</th>
                <th className="px-3 py-1.5" />
              </tr>
            </thead>
            <tbody>
              {lineItems.map((li, i) => (
                <tr key={i} className="border-t border-stone-100">
                  <td className="px-3 py-1.5">{li.ingredient_name}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{li.qty} {li.unit}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">₱{li.unit_price.toLocaleString()}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums font-medium">
                    ₱{(li.qty * li.unit_price).toLocaleString()}
                  </td>
                  <td className="px-3 py-1.5">
                    <button
                      type="button"
                      onClick={() => removeLineItem(i)}
                      className="text-xs text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
              <tr className="border-t-2 border-stone-300 font-semibold">
                <td className="px-3 py-1.5" colSpan={3}>Total</td>
                <td className="px-3 py-1.5 text-right tabular-nums">₱{total.toLocaleString()}</td>
                <td />
              </tr>
            </tbody>
          </table>
        )}
      </div>

      {error && (
        <div className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}
      <button
        type="submit"
        disabled={loading || lineItems.length === 0}
        className="rounded bg-japonesa-red px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-900 transition disabled:opacity-50"
      >
        {loading ? "Creating..." : "Create PO (Draft)"}
      </button>
    </form>
  );
}
