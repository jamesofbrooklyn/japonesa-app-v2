"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "./Toast";
import { manilaToday } from "@/lib/dates";

const ROLES = [
  "GM", "Head Chef", "Sous Chef", "Sushi Chef", "Line Cook",
  "Prep Cook", "Dishwasher", "Bartender", "Server", "Host",
  "Runner", "Cashier",
];

interface StaffFormProps {
  existing?: {
    id: string;
    name: string;
    role: string;
    hire_date: string;
    base_rate_php: number;
    rate_unit: string;
    employment_type: string;
    statutory_loaded_rate_php: number;
    active: boolean;
  };
  onClose?: () => void;
}

function today() {
  return manilaToday();
}

export default function StaffForm({ existing, onClose }: StaffFormProps) {
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState(existing?.name ?? "");
  const [role, setRole] = useState(existing?.role ?? "Server");
  const [hireDate, setHireDate] = useState(existing?.hire_date ?? today());
  const [baseRate, setBaseRate] = useState(existing?.base_rate_php?.toString() ?? "");
  const [rateUnit, setRateUnit] = useState(existing?.rate_unit ?? "monthly");
  const [empType, setEmpType] = useState(existing?.employment_type ?? "regular");
  const [loadedRate, setLoadedRate] = useState(existing?.statutory_loaded_rate_php?.toString() ?? "");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const payload = {
      name,
      role,
      hire_date: hireDate,
      base_rate_php: Number(baseRate),
      rate_unit: rateUnit,
      employment_type: empType,
      statutory_loaded_rate_php: loadedRate ? Number(loadedRate) : undefined,
      active: true,
    };

    const url = existing ? `/api/staff?id=${existing.id}` : "/api/staff";
    const method = existing ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : JSON.stringify(data.error));
      return;
    }

    toast.success(`${existing ? "Updated" : "Added"} ${data.name} (${data.role})`);
    if (!existing) {
      setName("");
      setBaseRate("");
      setLoadedRate("");
    }
    router.refresh();
  }

  const inputCls =
    "w-full rounded border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-japonesa-red focus:border-transparent";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Name</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputCls}
            placeholder="Full name"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Role</label>
          <select value={role} onChange={(e) => setRole(e.target.value)} className={inputCls}>
            {ROLES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Hire Date</label>
          <input
            type="date"
            required
            value={hireDate}
            onChange={(e) => setHireDate(e.target.value)}
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Employment</label>
          <select value={empType} onChange={(e) => setEmpType(e.target.value)} className={inputCls}>
            <option value="regular">Regular</option>
            <option value="probationary">Probationary</option>
            <option value="contractual">Contractual</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Base Rate (PHP)</label>
          <input
            type="number"
            required
            min="0"
            value={baseRate}
            onChange={(e) => setBaseRate(e.target.value)}
            className={inputCls}
            placeholder="0"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Rate Unit</label>
          <select value={rateUnit} onChange={(e) => setRateUnit(e.target.value)} className={inputCls}>
            <option value="monthly">Monthly</option>
            <option value="daily">Daily</option>
            <option value="hourly">Hourly</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">
            Loaded Rate (PHP)
          </label>
          <input
            type="number"
            min="0"
            value={loadedRate}
            onChange={(e) => setLoadedRate(e.target.value)}
            className={inputCls}
            placeholder="Auto: base monthly × 1.27 (regular) or × 1.10 (probationary/contractual)"
          />
        </div>
      </div>

      {error && (
        <div className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="rounded bg-japonesa-red px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-900 transition disabled:opacity-50"
        >
          {loading ? "Saving..." : existing ? "Update Staff" : "Add Staff"}
        </button>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-stone-300 px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-100 transition"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
