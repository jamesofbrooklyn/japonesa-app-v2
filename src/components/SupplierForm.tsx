"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "./Toast";

const CATEGORIES = [
  "fresh fish", "import (sashimi)", "produce", "poultry", "dairy/dry",
  "alcohol/sake", "rice/dry", "packaging", "other",
];

interface SupplierFormProps {
  onCreated?: (s: { id: string; name: string }) => void;
}

export default function SupplierForm({ onCreated }: SupplierFormProps) {
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState("");
  const [klass, setKlass] = useState<"spot" | "contract">("contract");
  const [category, setCategory] = useState("");
  const [contact, setContact] = useState("");
  const [leadTimeDays, setLeadTimeDays] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/suppliers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        class: klass,
        category: category || null,
        contact: contact || null,
        lead_time_days: leadTimeDays ? Number(leadTimeDays) : null,
        payment_terms: paymentTerms || null,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : JSON.stringify(data.error));
      return;
    }

    toast.success(`Supplier "${data.name}" added`);
    setName("");
    setCategory("");
    setContact("");
    setLeadTimeDays("");
    setPaymentTerms("");
    onCreated?.(data);
    router.refresh();
  }

  const inputCls =
    "w-full rounded border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-japonesa-red focus:border-transparent";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <fieldset disabled={loading} className="space-y-4 disabled:opacity-60">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Name *</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputCls}
            placeholder="e.g. Cartimar Wet Market"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Class *</label>
          <select
            value={klass}
            onChange={(e) => setKlass(e.target.value as "spot" | "contract")}
            className={inputCls}
          >
            <option value="contract">Contract (regular)</option>
            <option value="spot">Spot (one-off / market)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Category</label>
          <input
            type="text"
            list="supplier-categories"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={inputCls}
            placeholder="fresh fish / produce / sake / etc."
          />
          <datalist id="supplier-categories">
            {CATEGORIES.map((c) => <option key={c} value={c} />)}
          </datalist>
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Contact</label>
          <input
            type="text"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            className={inputCls}
            placeholder="Tito Boy · 0917-xxx-xxxx"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Lead time (days)</label>
          <input
            type="number"
            min="0"
            max="365"
            value={leadTimeDays}
            onChange={(e) => setLeadTimeDays(e.target.value)}
            className={inputCls}
            placeholder="0 (same day) / 1 / 7"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Payment terms</label>
          <input
            type="text"
            value={paymentTerms}
            onChange={(e) => setPaymentTerms(e.target.value)}
            className={inputCls}
            placeholder="COD / Net 15 / Net 30"
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
        disabled={loading || !name}
        className="rounded bg-japonesa-red px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-900 transition disabled:opacity-50"
      >
        {loading ? "Adding..." : "Add Supplier"}
      </button>
      </fieldset>
    </form>
  );
}
