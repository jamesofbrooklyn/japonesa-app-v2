"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { manilaYesterday } from "@/lib/dates";
import { useToast } from "./Toast";

function yesterday() {
  return manilaYesterday();
}

interface DailyCloseFormProps {
  /** When true, the form starts open (no collapse toggle). Use on mobile / dedicated pages. */
  defaultExpanded?: boolean;
}

export default function DailyCloseForm({ defaultExpanded = false }: DailyCloseFormProps = {}) {
  const router = useRouter();
  const toast = useToast();
  const [closeDate, setCloseDate] = useState(yesterday());
  // Revenue stack: GM enters gross (customer-facing total). VAT and SC are
  // computed at standard PH rates (12% VAT, 10% SC) and editable in case the
  // mix of VAT-exempt items (senior/PWD discount) requires manual override.
  const [grossSales, setGrossSales] = useState("");
  const [vat, setVat] = useState("");
  const [serviceCharge, setServiceCharge] = useState("");
  const [autoCompute, setAutoCompute] = useState(true);

  const [covers, setCovers] = useState("");
  const [cashCollected, setCashCollected] = useState("");
  const [cashVariance, setCashVariance] = useState("");
  const [deposit, setDeposit] = useState("");
  const [tipPool, setTipPool] = useState("");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(defaultExpanded);

  // Derived values
  const grossNum = Number(grossSales) || 0;
  // PH menu prices are VAT-INCLUSIVE. Service charge is added on top.
  // gross = (menu × 1.12) × 1.10 → menu × 1.232
  // VAT (output) = menu × 0.12 = gross / 1.232 × 0.12
  // SC = menu × 1.12 × 0.10 = gross / 1.232 × 0.112 = gross / 11
  // Net base revenue = gross - VAT - SC = menu (the booked income)
  const computedVat = autoCompute ? Math.round((grossNum / 1.232) * 0.12 * 100) / 100 : Number(vat) || 0;
  const computedSc = autoCompute ? Math.round((grossNum / 11) * 100) / 100 : Number(serviceCharge) || 0;
  const netRevenue = Math.max(0, grossNum - computedVat - computedSc);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/daily-close", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        close_date: closeDate,
        gross_sales_php: grossNum,
        vat_php: computedVat,
        service_charge_php: computedSc,
        net_revenue_php: netRevenue,
        covers: Number(covers),
        cash_collected_php: Number(cashCollected),
        cash_variance_php: Number(cashVariance),
        deposit_amount_php: Number(deposit),
        tip_pool_php: Number(tipPool),
        gm_notes: notes || undefined,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : JSON.stringify(data.error));
      return;
    }

    toast.success(`Daily close saved for ${data.close_date}`);
    setGrossSales("");
    setVat("");
    setServiceCharge("");
    setCovers("");
    setCashCollected("");
    setCashVariance("");
    setDeposit("");
    setTipPool("");
    setNotes("");
    router.refresh();
  }

  const inputCls =
    "w-full rounded border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-japonesa-red focus:border-transparent";

  return (
    <section className={defaultExpanded ? "" : "mt-10"}>
      {!defaultExpanded && (
        <button
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
          className="flex items-center gap-2 text-lg font-semibold text-stone-900 mb-3"
        >
          <span className="text-sm">{expanded ? "▼" : "▶"}</span>
          Daily Close Entry
        </button>
      )}

      {expanded && (
        <div className="rounded border border-stone-200 bg-white p-4 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={closeDate}
                  onChange={(e) => setCloseDate(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Covers</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="1"
                  value={covers}
                  onChange={(e) => setCovers(e.target.value)}
                  className={inputCls}
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Cash Collected (PHP)
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="1"
                  value={cashCollected}
                  onChange={(e) => setCashCollected(e.target.value)}
                  className={inputCls}
                  placeholder="0"
                />
              </div>
            </div>

            {/* Revenue stack */}
            <div className="rounded border border-stone-200 bg-stone-50 p-3 space-y-3">
              <div className="flex items-baseline justify-between">
                <div className="text-xs uppercase tracking-wider text-stone-500 font-semibold">
                  Revenue stack
                </div>
                <label className="text-xs text-stone-600 flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoCompute}
                    onChange={(e) => setAutoCompute(e.target.checked)}
                  />
                  Auto-compute VAT &amp; SC
                </label>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">
                    Gross sales (₱) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={grossSales}
                    onChange={(e) => setGrossSales(e.target.value)}
                    className={inputCls}
                    placeholder="customer-facing total (incl. VAT + SC)"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">
                    VAT (₱) {autoCompute && <span className="text-stone-400 text-xs">auto</span>}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={autoCompute ? computedVat.toFixed(2) : vat}
                    onChange={(e) => setVat(e.target.value)}
                    disabled={autoCompute}
                    className={`${inputCls} ${autoCompute ? "bg-stone-100" : ""}`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">
                    Service charge (₱) {autoCompute && <span className="text-stone-400 text-xs">auto</span>}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={autoCompute ? computedSc.toFixed(2) : serviceCharge}
                    onChange={(e) => setServiceCharge(e.target.value)}
                    disabled={autoCompute}
                    className={`${inputCls} ${autoCompute ? "bg-stone-100" : ""}`}
                  />
                </div>
              </div>
              <div className="text-xs text-stone-600 border-t border-stone-200 pt-2">
                <span className="font-semibold">Net base revenue (booked income):</span>{" "}
                <span className="tabular-nums">₱{netRevenue.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                {grossNum > 0 && (
                  <span className="text-stone-400 ml-2">
                    = gross − VAT − SC. Used by all KPIs (food cost%, labor%, prime cost).
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Cash Variance (PHP)
                </label>
                <input
                  type="number"
                  required
                  step="1"
                  value={cashVariance}
                  onChange={(e) => setCashVariance(e.target.value)}
                  className={inputCls}
                  placeholder="0 (can be negative)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Deposit Amount (PHP)
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="1"
                  value={deposit}
                  onChange={(e) => setDeposit(e.target.value)}
                  className={inputCls}
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Tip Pool (PHP)
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="1"
                  value={tipPool}
                  onChange={(e) => setTipPool(e.target.value)}
                  className={inputCls}
                  placeholder="0"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                GM Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className={inputCls}
                placeholder="Optional — anything notable about the day"
              />
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
              {loading ? "Saving..." : "Save Daily Close"}
            </button>
          </form>
        </div>
      )}
    </section>
  );
}
