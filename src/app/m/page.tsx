import { php, pct } from "@/lib/kpis";
import { PULSE, RED_FLAGS, PRE_SHIFT, INVENTORY } from "@/lib/mock";
import Link from "next/link";

export default function MobileQuickGlance() {
  const lowOrOut = INVENTORY.filter((i) => i.status !== "ok");

  return (
    <div className="p-4 space-y-5 pb-10">
      {/* Header */}
      <div className="flex items-baseline justify-between">
        <div className="text-japonesa-red text-lg font-bold tracking-widest">JAPONESA</div>
        <div className="text-xs text-stone-500">7-day pulse</div>
      </div>

      {/* Key KPIs */}
      <div className="grid grid-cols-2 gap-3">
        <KpiTile label="Revenue (7d)"   value={php(PULSE.revenue)} />
        <KpiTile label="Avg Check"      value={php(Math.round(PULSE.avgCheck))} />
        <KpiTile label="Food Cost"      value={pct(PULSE.foodCost)}     alert={PULSE.foodCost  > 0.34} />
        <KpiTile label="Labor Cost"     value={pct(PULSE.laborCost)}    alert={PULSE.laborCost > 0.30} />
        <KpiTile label="Prime Cost"     value={pct(PULSE.primeCost)}    alert={PULSE.primeCost > 0.62} />
        <KpiTile label="Covers (7d)"    value={String(PULSE.covers)} />
      </div>

      {/* Tonight */}
      <div className="rounded border border-stone-200 bg-white p-4">
        <div className="text-[10px] uppercase tracking-wider text-stone-500 mb-2">Tonight</div>
        <div className="text-sm font-semibold text-stone-900">{PRE_SHIFT.service}</div>
        <div className="text-sm text-stone-600 mt-0.5">
          {PRE_SHIFT.reservations} covers · {PRE_SHIFT.vipCount} VIPs
        </div>
        {PRE_SHIFT.eightySixed.length > 0 && (
          <div className="mt-3 rounded bg-red-50 border border-red-200 p-2">
            <div className="text-[10px] font-semibold uppercase text-red-700 mb-1">86'd</div>
            <div className="text-xs text-red-700">{PRE_SHIFT.eightySixed.join(" · ")}</div>
          </div>
        )}
        {PRE_SHIFT.prepPriorities.length > 0 && (
          <ul className="mt-3 space-y-1">
            {PRE_SHIFT.prepPriorities.map((p, i) => (
              <li key={i} className="text-xs text-stone-600 flex gap-2">
                <span className="text-stone-400 shrink-0">·</span>{p}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Red flags */}
      {RED_FLAGS.length > 0 && (
        <div className="space-y-2">
          <div className="text-[10px] uppercase tracking-wider text-stone-500">Alerts</div>
          {RED_FLAGS.map((f, i) => (
            <div
              key={i}
              className={`rounded border p-3 text-xs ${
                f.severity === "high"
                  ? "border-red-300 bg-red-50 text-red-900"
                  : "border-amber-300 bg-amber-50 text-amber-900"
              }`}
            >
              <div className="font-semibold">{f.title}</div>
              <div className="mt-1 opacity-80">{f.detail}</div>
            </div>
          ))}
        </div>
      )}

      {/* Inventory alerts */}
      {lowOrOut.length > 0 && (
        <div className="space-y-2">
          <div className="text-[10px] uppercase tracking-wider text-stone-500">
            Inventory — {lowOrOut.filter(i => i.status === "out").length} out · {lowOrOut.filter(i => i.status === "low").length} low
          </div>
          {lowOrOut.map((item) => (
            <div
              key={item.ingredient}
              className={`flex justify-between items-center rounded border px-3 py-2 text-xs ${
                item.status === "out"
                  ? "border-red-300 bg-red-50 text-red-900"
                  : "border-amber-200 bg-amber-50 text-amber-900"
              }`}
            >
              <span className="font-medium">{item.ingredient}</span>
              <span className="uppercase font-semibold text-[10px]">{item.status}</span>
            </div>
          ))}
        </div>
      )}

      {/* Link to full dashboard */}
      <div className="pt-2">
        <Link
          href="/"
          className="block w-full text-center rounded border border-stone-300 bg-white py-3 text-sm text-stone-700 font-medium"
        >
          Open full dashboard →
        </Link>
      </div>
    </div>
  );
}

function KpiTile({
  label,
  value,
  alert,
}: {
  label: string;
  value: string;
  alert?: boolean;
}) {
  return (
    <div
      className={`rounded border p-3 ${
        alert ? "border-red-200 bg-red-50" : "border-stone-200 bg-white"
      }`}
    >
      <div className="text-[10px] uppercase tracking-wider text-stone-500">{label}</div>
      <div
        className={`text-lg font-semibold mt-0.5 ${
          alert ? "text-red-700" : "text-stone-900"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
