import SectionHeader from "@/components/SectionHeader";
import KpiCard from "@/components/KpiCard";
import Sparkline from "@/components/Sparkline";
import { php, pct, band, TARGETS } from "@/lib/kpis";
import { PULSE, LAST_30D, RED_FLAGS, PRE_SHIFT } from "@/lib/mock";

export default function PulsePage() {
  const trend = LAST_30D.map((d) => ({ x: d.date, y: d.revenue }));
  const deltaSign = PULSE.revenueDelta >= 0 ? "▲" : "▼";
  const deltaTone = PULSE.revenueDelta >= 0 ? "text-emerald-700" : "text-red-700";

  return (
    <div>
      <SectionHeader
        title="Pulse"
        subtitle="The 60-second view. Wed–Tue week, auto-refreshed."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Revenue (7d)"
          value={php(PULSE.revenue)}
          sub={`${deltaSign} ${pct(Math.abs(PULSE.revenueDelta))} vs prior 7d`}
        />
        <KpiCard
          label="Covers (7d)"
          value={PULSE.covers.toLocaleString("en-PH")}
          sub={`avg ${Math.round(PULSE.covers / 7)}/day`}
        />
        <KpiCard label="Avg Check" value={php(Math.round(PULSE.avgCheck))} sub="per cover" />
        <KpiCard
          label="Prime Cost"
          value={pct(PULSE.primeCost)}
          sub="target ≤ 62%"
          band={band(PULSE.primeCost, TARGETS.primeCost)}
        />
        <KpiCard
          label="Food Cost"
          value={pct(PULSE.foodCost)}
          sub="target 28–32%"
          band={band(PULSE.foodCost, TARGETS.foodCost)}
        />
        <KpiCard
          label="Labor Cost"
          value={pct(PULSE.laborCost)}
          sub="incl. statutory"
          band={band(PULSE.laborCost, TARGETS.laborCost)}
        />
        <KpiCard label="Cash on Hand" value={php(PULSE.cashOnHand)} sub="last 3d deposits" />
        <KpiCard
          label="RevPASH"
          value={php(Math.round(PULSE.revPASH))}
          sub="56 seats × 9 hrs"
        />
      </div>

      <section className="mt-10">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-lg font-semibold text-stone-900">Revenue trend (30d)</h2>
          <span className={`text-sm font-semibold ${deltaTone}`}>
            {deltaSign} {pct(Math.abs(PULSE.revenueDelta))} WoW
          </span>
        </div>
        <div className="rounded border border-stone-200 bg-white p-4 shadow-sm">
          <Sparkline data={trend} height={140} />
        </div>
      </section>

      <section className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <h2 className="text-lg font-semibold text-stone-900 mb-3">Red flags</h2>
          <div className="space-y-2">
            {RED_FLAGS.map((f, i) => (
              <div
                key={i}
                className={`rounded border p-3 shadow-sm ${
                  f.severity === "high"
                    ? "border-red-300 bg-red-50"
                    : "border-amber-300 bg-amber-50"
                }`}
              >
                <div className="text-sm font-semibold text-stone-900">{f.title}</div>
                <div className="text-xs text-stone-600 mt-1">{f.detail}</div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-stone-900 mb-3">
            Pre-shift brief — {PRE_SHIFT.service}
          </h2>
          <div className="rounded border border-stone-200 bg-white p-4 shadow-sm space-y-3 text-sm">
            <div className="flex gap-6 text-stone-700">
              <div>
                <div className="text-[10px] uppercase text-stone-500">Reservations</div>
                <div className="text-xl font-semibold">{PRE_SHIFT.reservations}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-stone-500">VIPs</div>
                <div className="text-xl font-semibold">{PRE_SHIFT.vipCount}</div>
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase text-stone-500 mb-1">86'd tonight</div>
              <div className="flex flex-wrap gap-1">
                {PRE_SHIFT.eightySixed.map((x) => (
                  <span key={x} className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-700">
                    {x}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase text-stone-500 mb-1">Prep priorities</div>
              <ul className="text-xs text-stone-700 space-y-0.5 list-disc pl-4">
                {PRE_SHIFT.prepPriorities.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
            <div className="text-xs text-stone-500 italic border-t pt-2">
              Yesterday: {PRE_SHIFT.yesterday}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
