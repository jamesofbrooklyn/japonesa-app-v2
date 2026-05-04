import SectionHeader from "@/components/SectionHeader";
import { php, pct } from "@/lib/kpis";
import { fetchSuppliers, fetchReservations } from "@/lib/queries";
import { supabaseServer } from "@/lib/supabase-server";
import { optionalAuth } from "@/lib/auth";
import { getActiveConcept } from "@/lib/concept";

export default async function OpsPage() {
  const sb = await supabaseServer();
  const auth = await optionalAuth();
  const concept = auth ? await getActiveConcept(auth.profile) : undefined;
  const [suppliersData, reservationsData] = await Promise.all([
    fetchSuppliers(sb, concept),
    fetchReservations(sb, 7, concept),
  ]);

  const SUPPLIERS = suppliersData.suppliers;
  const RESERVATIONS = reservationsData.reservations;

  const totalSpend = SUPPLIERS.reduce((a, b) => a + b.spend_30d, 0);

  return (
    <div>
      <SectionHeader
        title="Operations"
        subtitle="Suppliers · reservations"
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <Stat label="Suppliers Active" value={String(SUPPLIERS.length)} />
        <Stat label="30d Supplier Spend" value={php(totalSpend)} />
        <Stat label="Reservations (7d)" value={String(reservationsData.reservations.reduce((a, r) => a + r.booked + r.walked_in, 0))} />
        <Stat label="No-shows (7d)" value={String(reservationsData.reservations.reduce((a, r) => a + r.no_shows, 0))} />
      </div>

      <h2 className="text-lg font-semibold text-stone-900 mb-3">Suppliers</h2>
      {SUPPLIERS.length === 0 ? (
        <div className="rounded border border-sky-200 bg-sky-50 p-4 text-sm text-sky-800 mb-10">
          No suppliers yet. Suppliers are seeded in the database — if you don&apos;t see any here, add them in Supabase or via a future supplier admin page.
        </div>
      ) : (
        <div className="rounded border border-stone-200 bg-white shadow-sm overflow-hidden mb-10">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-100 text-stone-600">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Supplier</th>
                  <th className="text-left px-3 py-2 font-medium">Category</th>
                  <th className="text-right px-3 py-2 font-medium">30d spend</th>
                </tr>
              </thead>
              <tbody>
                {SUPPLIERS.map((s) => (
                  <tr key={s.id} className="border-t border-stone-100 hover:bg-stone-50">
                    <td className="px-3 py-2 text-stone-900">{s.name}</td>
                    <td className="px-3 py-2 text-stone-500 text-xs">{s.category}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-medium">{php(s.spend_30d)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <h2 className="text-lg font-semibold text-stone-900 mb-3">Reservation density (this week)</h2>
      {reservationsData.source === "empty" ? (
        <div className="rounded border border-sky-200 bg-sky-50 p-4 text-sm text-sky-800 mb-10">
          No reservations recorded for this week.
        </div>
      ) : (
        <div className="rounded border border-stone-200 bg-white shadow-sm p-4 mb-10 overflow-x-auto">
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
                const max = Math.max(...row.map((r) => r.booked + r.walked_in), 1);
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
        </div>
      )}
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
