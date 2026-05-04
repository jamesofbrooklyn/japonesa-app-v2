import SectionHeader from "@/components/SectionHeader";
import StaffForm from "@/components/StaffForm";
import { php } from "@/lib/kpis";
import { fetchStaffList, fetchPulseData } from "@/lib/queries";
import { supabaseServer } from "@/lib/supabase-server";
import { optionalAuth } from "@/lib/auth";
import { getActiveConcept } from "@/lib/concept";

export default async function TeamPage() {
  const sb = await supabaseServer();
  const auth = await optionalAuth();
  const concept = auth ? await getActiveConcept(auth.profile) : undefined;
  const [staffData, pulseData] = await Promise.all([
    fetchStaffList(sb, concept),
    fetchPulseData(sb, concept),
  ]);

  const isOwner = auth?.profile.role === "owner";
  const fohRoles = ["Server", "Host", "Bartender", "Runner", "GM", "Cashier"];

  // Two distinct labor cost views:
  //  - "Capacity" = theoretical loaded payroll if every staff is fully accrued
  //    (sum of statutory_loaded_rate_php). What this team WOULD cost at full
  //    utilization.
  //  - "Actual paid" = what was actually booked as a labor expense in the last
  //    7 days, from pnl_lines.labor (via fetchPulseData.labor). Reflects real
  //    payroll runs, hours worked, etc.
  // These can differ by 2-3x depending on shift schedules and probationary mix.
  // We surface both so the owner can see capacity vs actual at a glance.
  const capacityPctOfRev =
    pulseData.revenue > 0
      ? staffData.totals.weekly_loaded / pulseData.revenue
      : null;
  const actualLaborPctOfRev =
    pulseData.revenue > 0 ? pulseData.labor / pulseData.revenue : null;

  return (
    <div>
      <SectionHeader
        title="Team"
        subtitle={`${staffData.totals.headcount} staff · loaded with SSS, PhilHealth, Pag-IBIG, 13th-month, holiday accrual`}
      />

      {staffData.source === "empty" && (
        <div className="mb-4 rounded border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-800">
          No staff records yet. {isOwner ? "Add staff members below." : "Ask an owner to add staff."}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-2">
        <Stat label="Headcount" value={String(staffData.totals.headcount)} />
        <Stat label="Monthly Loaded (capacity)" value={php(staffData.totals.monthly_loaded)} />
        <Stat
          label="Capacity % (7d)"
          value={capacityPctOfRev !== null ? `${(capacityPctOfRev * 100).toFixed(1)}%` : "—"}
        />
        <Stat
          label="Actual labor % (7d)"
          value={actualLaborPctOfRev !== null ? `${(actualLaborPctOfRev * 100).toFixed(1)}%` : "—"}
        />
      </div>
      <p className="text-xs text-stone-500 mb-10 max-w-3xl">
        <strong>Capacity %</strong> is what the team would cost at full
        utilization (sum of all staff loaded rates ÷ revenue) — useful for
        budgeting. <strong>Actual labor %</strong> is what you actually booked
        as labor expense in P&amp;L — that&apos;s the number to compare against
        the 26–30% target. The two diverge when scheduled hours are below
        capacity or when labor entries lag the close.
      </p>

      {/* Staff roster */}
      <h2 className="text-lg font-semibold text-stone-900 mb-3">
        Front of house ({staffData.staff.filter((s) => fohRoles.includes(s.role)).length})
      </h2>
      <div className="rounded border border-stone-200 bg-white shadow-sm overflow-hidden mb-10">
        <RosterTable
          rows={staffData.staff.filter((s) => fohRoles.includes(s.role))}
          showProductivity
        />
      </div>

      <h2 className="text-lg font-semibold text-stone-900 mb-3 mt-10">
        Back of house ({staffData.staff.filter((s) => !fohRoles.includes(s.role)).length})
      </h2>
      <div className="rounded border border-stone-200 bg-white shadow-sm overflow-hidden">
        <RosterTable
          rows={staffData.staff.filter((s) => !fohRoles.includes(s.role))}
        />
      </div>

      {/* Add Staff form */}
      {isOwner && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold text-stone-900 mb-3">Add Staff Member</h2>
          <div className="rounded border border-stone-200 bg-white p-4 shadow-sm">
            <StaffForm />
          </div>
        </section>
      )}
    </div>
  );
}

function RosterTable({
  rows,
  showProductivity = false,
}: {
  rows: Array<{
    id: string;
    name: string;
    role: string;
    tenure_months: number;
    monthly_php: number;
    loaded_php: number;
    hours_7d: number;
    covers_7d: number;
    rev_7d: number;
    productivity: number;
    rating: number;
  }>;
  showProductivity?: boolean;
}) {
  return (
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
              <td className="px-3 py-2 text-right tabular-nums">{s.hours_7d || "—"}</td>
              {showProductivity && (
                <td className="px-3 py-2 text-right tabular-nums">{s.covers_7d || "—"}</td>
              )}
              {showProductivity && (
                <td className="px-3 py-2 text-right tabular-nums">
                  <span className={s.productivity > 4 ? "text-emerald-700" : s.productivity > 2.5 ? "text-amber-700" : "text-red-700"}>
                    {s.productivity > 0 ? `₱${s.productivity.toFixed(1)}` : "—"}
                  </span>
                </td>
              )}
              <td className="px-3 py-2 text-right tabular-nums">
                {s.rating > 0 ? (
                  <span className={s.rating >= 4.5 ? "text-emerald-700" : s.rating >= 4.0 ? "text-amber-700" : "text-red-700"}>
                    ★ {s.rating.toFixed(1)}
                  </span>
                ) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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
