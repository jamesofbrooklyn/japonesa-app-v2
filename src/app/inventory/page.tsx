import SectionHeader from "@/components/SectionHeader";
import { php, pct } from "@/lib/kpis";
import {
  INVENTORY_ROWS,
  INVENTORY_SUMMARY,
  PENDING_DELIVERIES,
  TRANSFERS,
} from "@/lib/mock-inventory";

export default function InventoryPage() {
  const variances = INVENTORY_ROWS.filter((r) => r.variance_total !== 0)
    .sort((a, b) => b.variance_value_php - a.variance_value_php);

  return (
    <div>
      <SectionHeader
        title="Inventory"
        subtitle="Delivery → Purchase reconciliation · Alamat Bar / Japonesa Bar shared sourcing · variance hunting"
      />

      {/* Top KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-10">
        <Stat label="Pending Today" value={String(PENDING_DELIVERIES.filter((d) => d.expected_at.startsWith("2026-04-14")).length)} />
        <Stat
          label="Variance Items"
          value={`${INVENTORY_SUMMARY.overCount + INVENTORY_SUMMARY.underCount} / ${INVENTORY_ROWS.length}`}
          tone={INVENTORY_SUMMARY.highSev > 0 ? "watch" : "good"}
        />
        <Stat
          label="Variance Value"
          value={php(Math.round(INVENTORY_SUMMARY.totalVariancePhp))}
          tone={INVENTORY_SUMMARY.totalVariancePhp > 500 ? "bad" : "good"}
        />
        <Stat label="Delivery Value" value={php(Math.round(INVENTORY_SUMMARY.totalDelivery))} />
        <Stat label="Purchase Billed" value={php(Math.round(INVENTORY_SUMMARY.totalPurchase))} />
      </div>

      {/* SECTION 1 — Delivery Incoming */}
      <h2 className="text-lg font-semibold text-stone-900 mb-3">Delivery incoming</h2>
      <div className="rounded border border-stone-200 bg-white shadow-sm overflow-hidden mb-10">
        <table className="w-full text-sm">
          <thead className="bg-stone-100 text-stone-600">
            <tr>
              <th className="text-left px-3 py-2 font-medium">Expected</th>
              <th className="text-left px-3 py-2 font-medium">Supplier</th>
              <th className="text-left px-3 py-2 font-medium">Category</th>
              <th className="text-right px-3 py-2 font-medium">Items</th>
              <th className="text-right px-3 py-2 font-medium">Value</th>
              <th className="text-left px-3 py-2 font-medium">PO</th>
              <th className="text-center px-3 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {PENDING_DELIVERIES.map((d) => (
              <tr key={d.supplier + d.expected_at} className="border-t border-stone-100 hover:bg-stone-50">
                <td className="px-3 py-2 text-stone-700 text-xs tabular-nums">{d.expected_at}</td>
                <td className="px-3 py-2 text-stone-900">{d.supplier}</td>
                <td className="px-3 py-2 text-stone-500 text-xs">{d.category}</td>
                <td className="px-3 py-2 text-right tabular-nums">{d.items_count}</td>
                <td className="px-3 py-2 text-right tabular-nums font-medium">{php(d.expected_value_php)}</td>
                <td className="px-3 py-2 text-stone-500 text-xs">{d.pos_ref ?? "—"}</td>
                <td className="px-3 py-2 text-center">
                  <DeliveryBadge s={d.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* SECTION 2 — Variance identification (the headline workflow) */}
      <h2 className="text-lg font-semibold text-stone-900 mb-1">Variance identification</h2>
      <p className="text-xs text-stone-500 mb-3">
        Delivery form qty − Purchase summary qty. Negative = supplier billed more than we received (claw back).
        Positive = we got more than billed (supplier error or receiving over-count). Sorted by peso impact.
      </p>
      {variances.length === 0 ? (
        <div className="rounded border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-800 mb-10">
          ✓ No variances on this batch. Clean reconciliation.
        </div>
      ) : (
        <div className="rounded border border-stone-200 bg-white shadow-sm overflow-hidden mb-10">
          <table className="w-full text-sm">
            <thead className="bg-stone-100 text-stone-600">
              <tr>
                <th className="text-left px-3 py-2 font-medium">Item</th>
                <th className="text-right px-3 py-2 font-medium">Delivered</th>
                <th className="text-right px-3 py-2 font-medium">Billed</th>
                <th className="text-right px-3 py-2 font-medium">Δ Qty</th>
                <th className="text-right px-3 py-2 font-medium">Unit Cost</th>
                <th className="text-right px-3 py-2 font-medium">Δ Value</th>
                <th className="text-left px-3 py-2 font-medium">Direction</th>
                <th className="text-center px-3 py-2 font-medium">Sev</th>
              </tr>
            </thead>
            <tbody>
              {variances.map((r) => (
                <tr key={r.sku} className="border-t border-stone-100 hover:bg-stone-50">
                  <td className="px-3 py-2">
                    <div className="text-stone-900">{r.description}</div>
                    <div className="text-[10px] text-stone-500">{r.unit}</div>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.delivery_total.toFixed(2)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.purchase_total.toFixed(2)}</td>
                  <td className={`px-3 py-2 text-right tabular-nums font-semibold ${r.variance_total < 0 ? "text-red-700" : "text-amber-700"}`}>
                    {r.variance_total > 0 ? "+" : ""}{r.variance_total.toFixed(4)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-stone-500">{php(r.unit_cost)}</td>
                  <td className="px-3 py-2 text-right tabular-nums font-semibold">{php(Math.round(r.variance_value_php))}</td>
                  <td className="px-3 py-2 text-xs text-stone-600">{r.remarks}</td>
                  <td className="px-3 py-2 text-center">
                    <SevBadge s={r.severity} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* SECTION 3 — Purchase summary (full reconciliation table — every item) */}
      <h2 className="text-lg font-semibold text-stone-900 mb-3">
        Purchase summary — Alamat / Japonesa shared sourcing
      </h2>
      <div className="rounded border border-stone-200 bg-white shadow-sm overflow-hidden mb-10">
        <table className="w-full text-xs">
          <thead className="bg-stone-100 text-stone-600">
            <tr>
              <th rowSpan={2} className="text-left px-2 py-2 font-medium align-bottom">Description</th>
              <th rowSpan={2} className="text-left px-2 py-2 font-medium align-bottom">Unit</th>
              <th colSpan={3} className="text-center px-2 py-1 font-medium border-l border-stone-200">Delivery Form Qty</th>
              <th colSpan={3} className="text-center px-2 py-1 font-medium border-l border-stone-200">Purchase Summary Qty</th>
              <th colSpan={2} className="text-center px-2 py-1 font-medium border-l border-stone-200">Variance</th>
              <th rowSpan={2} className="text-left px-2 py-2 font-medium align-bottom border-l border-stone-200">Remarks</th>
            </tr>
            <tr className="text-[10px] text-stone-500">
              <th className="text-right px-2 py-1 font-normal border-l border-stone-200">Alamat</th>
              <th className="text-right px-2 py-1 font-normal">Jap</th>
              <th className="text-right px-2 py-1 font-normal">Total</th>
              <th className="text-right px-2 py-1 font-normal border-l border-stone-200">Alamat</th>
              <th className="text-right px-2 py-1 font-normal">Jap</th>
              <th className="text-right px-2 py-1 font-normal">Total</th>
              <th className="text-right px-2 py-1 font-normal border-l border-stone-200">Alamat</th>
              <th className="text-right px-2 py-1 font-normal">Jap</th>
            </tr>
          </thead>
          <tbody>
            {INVENTORY_ROWS.map((r) => (
              <tr key={r.sku} className="border-t border-stone-100 hover:bg-stone-50">
                <td className="px-2 py-1.5 text-stone-900">{r.description}</td>
                <td className="px-2 py-1.5 text-stone-500">{r.unit}</td>
                <td className="px-2 py-1.5 text-right tabular-nums border-l border-stone-100">{fmt(r.delivery_alamat)}</td>
                <td className="px-2 py-1.5 text-right tabular-nums">{fmt(r.delivery_japonesa)}</td>
                <td className="px-2 py-1.5 text-right tabular-nums font-medium">{fmt(r.delivery_total)}</td>
                <td className="px-2 py-1.5 text-right tabular-nums border-l border-stone-100">{fmt(r.purchase_alamat)}</td>
                <td className="px-2 py-1.5 text-right tabular-nums">{fmt(r.purchase_japonesa)}</td>
                <td className="px-2 py-1.5 text-right tabular-nums font-medium">{fmt(r.purchase_total)}</td>
                <td className={`px-2 py-1.5 text-right tabular-nums border-l border-stone-100 ${r.variance_alamat ? (r.variance_alamat < 0 ? "text-red-700" : "text-amber-700") : "text-stone-400"}`}>
                  {r.variance_alamat ? r.variance_alamat.toFixed(3) : "—"}
                </td>
                <td className={`px-2 py-1.5 text-right tabular-nums ${r.variance_japonesa ? (r.variance_japonesa < 0 ? "text-red-700" : "text-amber-700") : "text-stone-400"}`}>
                  {r.variance_japonesa ? r.variance_japonesa.toFixed(3) : "—"}
                </td>
                <td className="px-2 py-1.5 text-stone-500 text-[10px] border-l border-stone-100">{r.remarks ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* SECTION 4 — Transfers between bars */}
      <h2 className="text-lg font-semibold text-stone-900 mb-3">Inter-bar transfers (MTD)</h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <TransferCard
          title="Greens transfer"
          rows={[
            { label: "Japonesa Bar", value: TRANSFERS.greens_total.jap_bar },
            { label: "Alamat Bar", value: TRANSFERS.greens_total.alamat_bar },
          ]}
        />
        <TransferCard
          title="Ice tube (per sack)"
          rows={[
            { label: "Japonesa Bar", value: TRANSFERS.ice_tube_per_sack.japonesa_bar },
            { label: "Alamat Bar", value: TRANSFERS.ice_tube_per_sack.alamat_bar },
          ]}
        />
        <TransferCard
          title="Dry ice"
          rows={[
            { label: "Japonesa Bar", value: TRANSFERS.dry_ice.japonesa_bar },
            { label: "Alamat Bar", value: TRANSFERS.dry_ice.alamat_bar },
          ]}
        />
      </div>
    </div>
  );
}

function fmt(n: number) {
  if (n === 0) return "—";
  return n.toFixed(2);
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "good" | "watch" | "bad" }) {
  const toneCls =
    tone === "bad" ? "border-red-300 bg-red-50 text-red-800"
    : tone === "watch" ? "border-amber-300 bg-amber-50 text-amber-800"
    : tone === "good" ? "border-emerald-300 bg-emerald-50 text-emerald-800"
    : "border-stone-200 bg-white text-stone-900";
  return (
    <div className={`rounded border p-3 shadow-sm ${toneCls}`}>
      <div className="text-[10px] uppercase tracking-wider text-stone-500">{label}</div>
      <div className="text-xl font-semibold mt-1">{value}</div>
    </div>
  );
}

function DeliveryBadge({ s }: { s: "scheduled" | "in_transit" | "arrived" | "late" }) {
  const map = {
    scheduled: "bg-stone-100 text-stone-700",
    in_transit: "bg-sky-100 text-sky-800",
    arrived: "bg-emerald-100 text-emerald-800",
    late: "bg-red-100 text-red-800",
  };
  const label = { scheduled: "scheduled", in_transit: "in transit", arrived: "arrived", late: "LATE" };
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-semibold ${map[s]}`}>
      {label[s]}
    </span>
  );
}

function SevBadge({ s }: { s: "ok" | "watch" | "high" }) {
  const map = {
    ok: "bg-emerald-100 text-emerald-800",
    watch: "bg-amber-100 text-amber-800",
    high: "bg-red-100 text-red-800",
  };
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-semibold ${map[s]}`}>
      {s}
    </span>
  );
}

function TransferCard({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; value: number }[];
}) {
  const total = rows.reduce((a, b) => a + b.value, 0);
  return (
    <div className="rounded border border-stone-200 bg-white shadow-sm p-4">
      <div className="text-[10px] uppercase tracking-wider text-stone-500">{title}</div>
      <div className="mt-3 space-y-2">
        {rows.map((r) => (
          <div key={r.label} className="flex justify-between text-sm">
            <span className="text-stone-700">{r.label}</span>
            <span className="tabular-nums font-medium">{php(r.value)}</span>
          </div>
        ))}
        <div className="flex justify-between text-sm border-t border-stone-200 pt-2 mt-2">
          <span className="font-semibold text-stone-900">Total</span>
          <span className="tabular-nums font-semibold">{php(total)}</span>
        </div>
      </div>
    </div>
  );
}
