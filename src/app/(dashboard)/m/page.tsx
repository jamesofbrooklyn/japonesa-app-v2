import { php, pct } from "@/lib/kpis";
import { fetchPulseData, fetchRedFlags } from "@/lib/queries";
import { generatePreShift } from "@/lib/pre-shift";
import { supabaseServer } from "@/lib/supabase-server";
import { optionalAuth } from "@/lib/auth";
import DailyCloseForm from "@/components/DailyCloseForm";
import Link from "next/link";

export default async function MobileQuickGlance() {
  const sb = await supabaseServer();
  const [pulse, redFlags, preShift, auth] = await Promise.all([
    fetchPulseData(sb),
    fetchRedFlags(sb),
    generatePreShift(sb),
    optionalAuth(),
  ]);

  return (
    <div className="p-4 space-y-5 pb-10">
      {/* Header */}
      <div className="flex items-baseline justify-between">
        <div className="text-japonesa-red text-lg font-bold tracking-widest">JAPONESA</div>
        <div className="text-xs text-stone-500">7-day pulse</div>
      </div>

      {pulse.source === "empty" && (
        <div className="rounded border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-800">
          No data yet. Submit a daily close from the desktop dashboard.
        </div>
      )}

      {/* Key KPIs */}
      <div className="grid grid-cols-2 gap-3">
        <KpiTile label="Revenue (7d)"   value={php(pulse.revenue)} />
        <KpiTile label="Avg Check"      value={php(Math.round(pulse.avgCheck))} />
        <KpiTile label="Food Cost"      value={pct(pulse.foodCost)}     alert={pulse.foodCost  > 0.34} />
        <KpiTile label="Labor Cost"     value={pct(pulse.laborCost)}    alert={pulse.laborCost > 0.30} />
        <KpiTile label="Prime Cost"     value={pct(pulse.primeCost)}    alert={pulse.primeCost > 0.62} />
        <KpiTile label="Covers (7d)"    value={String(pulse.covers)} />
      </div>

      {/* Tonight */}
      {preShift.source === "live" && (
        <div className="rounded border border-stone-200 bg-white p-4">
          <div className="text-[10px] uppercase tracking-wider text-stone-500 mb-2">Tonight</div>
          <div className="text-sm font-semibold text-stone-900">{preShift.service}</div>
          <div className="text-sm text-stone-600 mt-0.5">
            {preShift.reservations} covers · {preShift.vipCount} VIPs
          </div>
          {preShift.eightySixed.length > 0 && (
            <div className="mt-3 rounded bg-red-50 border border-red-200 p-2">
              <div className="text-[10px] font-semibold uppercase text-red-700 mb-1">86&apos;d</div>
              <div className="text-xs text-red-700">{preShift.eightySixed.join(" · ")}</div>
            </div>
          )}
          {preShift.prepPriorities.length > 0 && (
            <ul className="mt-3 space-y-1">
              {preShift.prepPriorities.map((p, i) => (
                <li key={i} className="text-xs text-stone-600 flex gap-2">
                  <span className="text-stone-400 shrink-0">·</span>{p}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Red flags */}
      {redFlags.flags.length > 0 && (
        <div className="space-y-2">
          <div className="text-[10px] uppercase tracking-wider text-stone-500">Alerts</div>
          {redFlags.flags.map((f, i) => (
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

      {/* Daily close form — always visible on mobile, this is the 1am close-of-day entry point */}
      {auth && (
        <div className="pt-4">
          <h2 className="text-base font-semibold text-stone-900 mb-3">Submit daily close</h2>
          <div className="rounded border border-stone-200 bg-white p-3 shadow-sm">
            <DailyCloseForm defaultExpanded />
          </div>
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
