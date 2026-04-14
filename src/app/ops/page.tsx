import SectionHeader from "@/components/SectionHeader";
import { php, pct } from "@/lib/kpis";
import { INVENTORY, SUPPLIERS, RESERVATIONS } from "@/lib/mock";

export default function OpsPage() {
  const stockOuts = INVENTORY.filter((i) => i.status === "out").length;
  const lowStock = INVENTORY.filter((i) => i.status === "low").length;
  const totalSpend = SUPPLIERS.reduce((a, b) => a + b.spend_30d, 0);

  return (
    <div>
      <SectionHeader
        title="Operations"
        subtitle="Inventory · suppliers · reorder · reservations"
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <Stat label="Stock-outs" value={String(stockOuts)} tone={stockOuts ? "bad" : "good"} />
        <Stat label="Low stock" value={String(lowStock)} tone={lowStock > 3 ? "watch" : "good"} />
        <Stat label="30d Supplier Spend" value={php(totalSpend)} />
        <Stat label="Suppliers Active" value={String(SUPPLIERS.length)} />
      </div>

      <h2 className="text-lg font-semibold text-stone-900 mb-3">Inventory health</h2>
      <div className="rounded border border-stone-200 bg-white shadow-sm overflow-hidden mb-10">
        <table className="w-full text-sm">
          <thead className="bg-stone-100 text-stone-600">
            <tr>
              <th className="text-left px-3 py-2 font-medium">Ingredient</th>
              <th className="text-left px-3 py-2 font-medium">Cat</th>
              <th className="text-right px-3 py-2 font-medium">On hand</th>
              <th className="text-right px-3 py-2 font-medium">Par</th>
              <th className="text-right px-3 py-2 font-medium">Days</th>
              <th className="text-center px-3 py-2 font-medium">Status</th>
              <th className="text-left px-3 py-2 font-medium">Last count</th>
            </tr>
          </thead>
          <tbody>
            {INVENTORY.map((row) => (
              <tr key={row.ingredient} className="border-t border-stone-100 hover:bg-stone-50">
                <td className="px-3 py-2 text-stone-900">{row.ingredient}</td>
                <td className="px-3 py-2 text-stone-500 text-xs">{row.category}</td>
                <td className="px-3 py-2 text-right tabular-nums">{row.on_hand} {row.unit}</td>
                <td className="px-3 py-2 text-right tabular-nums text-stone-500">{row.par}</td>
                <td className="px-3 py-2 text-right tabular-nums">{row.days_on_hand.toFixed(1)}</td>
                <td className="px-3 py-2 text-center">
                  <StatusBadge s={row.status} />
                </td>
                <td className="px-3 py-2 text-stone-500 text-xs">{row.last_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="text-lg font-semibold text-stone-900 mb-3">Supplier scorecards</h2>
      <div className="rounded border border-stone-200 bg-white shadow-sm overflow-hidden mb-10">
        <table className="w-full text-sm">
          <thead className="bg-stone-100 text-stone-600">
            <tr>
              <th className="text-left px-3 py-2 font-medium">Supplier</th>
              <th className="text-left px-3 py-2 font-medium">Category</th>
              <th className="text-right px-3 py-2 font-medium">Fill rate</th>
              <th className="text-right px-3 py-2 font-medium">On time</th>
              <th className="text-right px-3 py-2 font-medium">Price drift</th>
              <th className="text-right px-3 py-2 font-medium">Reject</th>
              <th className="text-right px-3 py-2 font-medium">30d spend</th>
            </tr>
          </thead>
          <tbody>
            {SUPPLIERS.map((s) => (
              <tr key={s.id} className="border-t border-stone-100 hover:bg-stone-50">
                <td className="px-3 py-2 text-stone-900">{s.name}</td>
                <td className="px-3 py-2 text-stone-500 text-xs">{s.category}</td>
                <td className="px-3 py-2 text-right tabular-nums">
                  <Heatmark v={s.fill_rate} good={0.97} watch={0.92} />
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  <Heatmark v={s.on_time} good={0.95} watch={0.9} />
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  <span className={s.price_drift > 0.04 ? "text-red-700" : s.price_drift > 0.02 ? "text-amber-700" : "text-emerald-700"}>
                    {s.price_drift > 0 ? "+" : ""}{pct(s.price_drift)}
                  </span>
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-stone-600">{pct(s.reject_rate)}</td>
                <td className="px-3 py-2 text-right tabular-nums font-medium">{php(s.spend_30d)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="text-lg font-semibold text-stone-900 mb-3">Reservation density (this week)</h2>
      <div className="rounded border border-stone-200 bg-white shadow-sm p-4 mb-10">
        <table className="w-full text-sm">
          <thead className="text-stone-500 text-xs">
            <tr>
              <th className="text-left py-1">Daypart</th>
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                <th key={d} className="text-center py-1">{d}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(["lunch", "dinner", "late_night"] as const).map((dp) => {
              const row = RESERVATIONS.filter((r) => r.daypart === dp);
              const max = Math.max(...row.map((r) => r.booked + r.walked_in));
              return (
                <tr key={dp}>
                  <td className="py-1 text-stone-700 capitalize text-xs">{dp.replace("_", " ")}</td>
                  {row.map((r) => {
                    const total = r.booked + r.walked_in;
                    const intensity = Math.min(1, total / max);
                    return (
                      <td key={r.date} className="py-1 px-1 text-center">
                        <div
                          className="rounded px-2 py-3 text-xs font-medium"
                          style={{
                            background: `rgba(122, 15, 23, ${0.08 + intensity * 0.55})`,
                            color: intensity > 0.6 ? "#fff" : "#1a1a1a",
                          }}
                          title={`booked ${r.booked} · walk-in ${r.walked_in} · no-shows ${r.no_shows}`}
                        >
                          {total}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="text-xs text-stone-500 mt-3">
          Booked + walk-ins per daypart. Hover for breakdown. Saturday dinner runs hottest.
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "good" | "watch" | "bad" }) {
  const toneCls =
    tone === "bad" ? "border-red-300 bg-red-50 text-red-800"
    : tone === "watch" ? "border-amber-300 bg-amber-50 text-amber-800"
    : "border-stone-200 bg-white text-stone-900";
  return (
    <div className={`rounded border p-3 shadow-sm ${toneCls}`}>
      <div className="text-[10px] uppercase tracking-wider text-stone-500">{label}</div>
      <div className="text-xl font-semibold mt-1">{value}</div>
    </div>
  );
}

function StatusBadge({ s }: { s: "ok" | "low" | "out" }) {
  const map = {
    ok: "bg-emerald-100 text-emerald-800",
    low: "bg-amber-100 text-amber-800",
    out: "bg-red-100 text-red-800",
  };
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-semibold ${map[s]}`}>
      {s}
    </span>
  );
}

function Heatmark({ v, good, watch }: { v: number; good: number; watch: number }) {
  const tone = v >= good ? "text-emerald-700" : v >= watch ? "text-amber-700" : "text-red-700";
  return <span className={tone}>{pct(v)}</span>;
}
