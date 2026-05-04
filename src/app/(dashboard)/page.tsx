import SectionHeader from "@/components/SectionHeader";
import KpiCard from "@/components/KpiCard";
import Sparkline from "@/components/Sparkline";
import DailyCloseForm from "@/components/DailyCloseForm";
import DailyCloseList from "@/components/DailyCloseList";
import AIAnomalyCards from "@/components/AIAnomalyCards";
import { php, pct, band, TARGETS } from "@/lib/kpis";
import { fetchPulseData, fetchPulseHistory, fetchRedFlags } from "@/lib/queries";
import { generatePreShift } from "@/lib/pre-shift";
import { supabaseServer } from "@/lib/supabase-server";
import { optionalAuth } from "@/lib/auth";
import { getActiveConcept } from "@/lib/concept";

export default async function PulsePage() {
  const sb = await supabaseServer();
  const auth = await optionalAuth();
  const concept = auth ? await getActiveConcept(auth.profile) : undefined;

  const [pulse, history, redFlags, preShift] = await Promise.all([
    fetchPulseData(sb, concept),
    fetchPulseHistory(sb, 30, concept),
    fetchRedFlags(sb, concept),
    generatePreShift(sb, concept),
  ]);

  const trend = history.daily.map((d) => ({ x: d.date, y: d.revenue }));
  const hasDelta = pulse.revenueDelta !== null;
  const deltaSign = hasDelta && pulse.revenueDelta! >= 0 ? "▲" : "▼";
  const deltaTone = !hasDelta
    ? "text-stone-500"
    : pulse.revenueDelta! >= 0
    ? "text-emerald-700"
    : "text-red-700";
  const deltaLabel = hasDelta
    ? `${deltaSign} ${pct(Math.abs(pulse.revenueDelta!))} vs prior 7d`
    : "— need 8+ days of closes";

  return (
    <div>
      <SectionHeader
        title="Pulse"
        subtitle="The 60-second view. Wed–Tue week, auto-refreshed."
      />

      {pulse.source === "empty" && (
        <div className="mb-4 rounded border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-800">
          No data yet. Submit a Daily Close at the bottom of this page to start populating numbers.
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Revenue (7d)"
          value={php(pulse.revenue)}
          sub={deltaLabel}
        />
        <KpiCard
          label="Covers (7d)"
          value={pulse.covers.toLocaleString("en-PH")}
          sub={`avg ${Math.round(pulse.covers / 7)}/day`}
        />
        <KpiCard label="Avg Check" value={php(Math.round(pulse.avgCheck))} sub="per cover" />
        <KpiCard
          label="Prime Cost"
          value={pct(pulse.primeCost)}
          sub="target ≤ 62%"
          band={band(pulse.primeCost, TARGETS.primeCost)}
        />
        <KpiCard
          label="Food Cost"
          value={pct(pulse.foodCost)}
          sub="target 28–32%"
          band={band(pulse.foodCost, TARGETS.foodCost)}
        />
        <KpiCard
          label="Labor Cost"
          value={pct(pulse.laborCost)}
          sub="incl. statutory"
          band={band(pulse.laborCost, TARGETS.laborCost)}
        />
        <KpiCard label="Cash on Hand" value={php(pulse.cashOnHand)} sub="last 3d deposits" />
        <KpiCard
          label="RevPASH"
          value={php(Math.round(pulse.revPASH))}
          sub="56 seats × 9 hrs"
        />
      </div>

      <section className="mt-10">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-lg font-semibold text-stone-900">Revenue trend (30d)</h2>
          <span className={`text-sm font-semibold ${deltaTone}`}>
            {hasDelta ? `${deltaSign} ${pct(Math.abs(pulse.revenueDelta!))} WoW` : "— WoW"}
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
            {redFlags.flags.length === 0 ? (
              <div className="rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                All clear — no flags this week.
              </div>
            ) : (
              redFlags.flags.map((f, i) => (
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
              ))
            )}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-stone-900 mb-3">
            Pre-shift brief — {preShift.service}
          </h2>
          <div className="rounded border border-stone-200 bg-white p-4 shadow-sm space-y-3 text-sm">
            <div className="flex gap-6 text-stone-700">
              <div>
                <div className="text-[10px] uppercase text-stone-500">Reservations</div>
                <div className="text-xl font-semibold">{preShift.reservations}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-stone-500">VIPs</div>
                <div className="text-xl font-semibold">{preShift.vipCount}</div>
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase text-stone-500 mb-1">86'd tonight</div>
              <div className="flex flex-wrap gap-1">
                {preShift.eightySixed.map((x) => (
                  <span key={x} className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-700">
                    {x}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase text-stone-500 mb-1">Prep priorities</div>
              <ul className="text-xs text-stone-700 space-y-0.5 list-disc pl-4">
                {preShift.prepPriorities.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
            <div className="text-xs text-stone-500 italic border-t pt-2">
              Yesterday: {preShift.yesterday}
            </div>
          </div>
        </div>
      </section>

      {auth?.profile.role === "owner" && (
        <section className="mt-10">
          <AIAnomalyCards />
        </section>
      )}

      {auth && <DailyCloseForm />}

      {auth?.profile.role === "owner" && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold text-stone-900 mb-3">Recent closes</h2>
          <DailyCloseList />
        </section>
      )}
    </div>
  );
}
