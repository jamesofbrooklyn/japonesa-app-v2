import SectionHeader from "@/components/SectionHeader";
import { php } from "@/lib/kpis";
import { STAFF, LABOR_TOTALS, PULSE } from "@/lib/mock";

export default function TeamPage() {
  const fohRoles = ["Server", "Host", "Bartender", "Runner", "GM", "Cashier"];
  const fohStaff = STAFF.filter((s) => fohRoles.includes(s.role));
  const bohStaff = STAFF.filter((s) => !fohRoles.includes(s.role));
  const laborPctOfRev = LABOR_TOTALS.weekly_loaded / PULSE.revenue;

  return (
    <div>
      <SectionHeader
        title="Team"
        subtitle={`${LABOR_TOTALS.headcount} staff · loaded with SSS, PhilHealth, Pag-IBIG, 13th-month, holiday accrual`}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <Stat label="Headcount" value={String(LABOR_TOTALS.headcount)} />
        <Stat label="Monthly Loaded" value={php(LABOR_TOTALS.monthly_loaded)} />
        <Stat label="Weekly Loaded" value={php(Math.round(LABOR_TOTALS.weekly_loaded))} />
        <Stat label="Labor % (last 7d)" value={`${(laborPctOfRev * 100).toFixed(1)}%`} />
      </div>

      <h2 className="text-lg font-semibold text-stone-900 mb-3">Front of house ({fohStaff.length})</h2>
      <RosterTable rows={fohStaff} showProductivity />

      <h2 className="text-lg font-semibold text-stone-900 mb-3 mt-10">Back of house ({bohStaff.length})</h2>
      <RosterTable rows={bohStaff} />
    </div>
  );
}

function RosterTable({
  rows,
  showProductivity = false,
}: {
  rows: typeof STAFF;
  showProductivity?: boolean;
}) {
  return (
    <div className="rounded border border-stone-200 bg-white shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-stone-100 text-stone-600">
          <tr>
            <th className="text-left px-3 py-2 font-medium">Name</th>
            <th className="text-left px-3 py-2 font-medium">Role</th>
            <th className="text-right px-3 py-2 font-medium">Tenure</th>
            <th className="text-right px-3 py-2 font-medium">Monthly</th>
            <th className="text-right px-3 py-2 font-medium">Loaded</th>
            <th className="text-right px-3 py-2 font-medium">Hrs (7d)</th>
            {showProductivity && <th className="text-right px-3 py-2 font-medium">Covers</th>}
            {showProductivity && <th className="text-right px-3 py-2 font-medium">Rev/₱ labor</th>}
            <th className="text-right px-3 py-2 font-medium">Rating</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => (
            <tr key={s.id} className="border-t border-stone-100 hover:bg-stone-50">
              <td className="px-3 py-2 text-stone-900">{s.name}</td>
              <td className="px-3 py-2 text-stone-600">{s.role}</td>
              <td className="px-3 py-2 text-right tabular-nums text-stone-500">{s.tenure_months}mo</td>
              <td className="px-3 py-2 text-right tabular-nums">{php(s.monthly_php)}</td>
              <td className="px-3 py-2 text-right tabular-nums font-medium">{php(s.loaded_php)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{s.hours_7d}</td>
              {showProductivity && (
                <td className="px-3 py-2 text-right tabular-nums">{s.covers_7d}</td>
              )}
              {showProductivity && (
                <td className="px-3 py-2 text-right tabular-nums">
                  <span className={s.productivity > 4 ? "text-emerald-700" : s.productivity > 2.5 ? "text-amber-700" : "text-red-700"}>
                    {s.productivity > 0 ? `₱${s.productivity.toFixed(1)}` : "—"}
                  </span>
                </td>
              )}
              <td className="px-3 py-2 text-right tabular-nums">
                <span className={s.rating >= 4.5 ? "text-emerald-700" : s.rating >= 4.0 ? "text-amber-700" : "text-red-700"}>
                  ★ {s.rating.toFixed(1)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-stone-200 bg-white p-3 shadow-sm">
      <div className="text-[10px] uppercase tracking-wider text-stone-500">{label}</div>
      <div className="text-xl font-semibold text-stone-900 mt-1">{value}</div>
    </div>
  );
}
