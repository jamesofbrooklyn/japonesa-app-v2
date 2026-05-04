import SectionHeader from "@/components/SectionHeader";
import InventoryCountForm from "@/components/InventoryCountForm";
import WasteLogForm from "@/components/WasteLogForm";
import { php } from "@/lib/kpis";
import { fetchLatestCounts, fetchActivePOs, fetchRecentWaste } from "@/lib/queries";
import { supabaseServer } from "@/lib/supabase-server";
import { optionalAuth } from "@/lib/auth";
import { getActiveConcept } from "@/lib/concept";

export default async function InventoryPage() {
  const sb = await supabaseServer();
  const auth = await optionalAuth();
  const concept = auth ? await getActiveConcept(auth.profile) : undefined;
  const [counts, activePOs, waste] = await Promise.all([
    fetchLatestCounts(sb, concept),
    fetchActivePOs(sb, concept),
    fetchRecentWaste(sb, 30, concept),
  ]);

  const inventoryValue = counts.counts.reduce(
    (a, c) => a + c.qty_on_hand * c.unit_cost,
    0
  );
  const activePOValue = activePOs.orders.reduce((a, p) => a + p.total, 0);

  const isEmpty =
    counts.source === "empty" &&
    activePOs.source === "empty" &&
    waste.source === "empty";

  return (
    <div>
      <SectionHeader
        title="Inventory"
        subtitle="Counts · purchase orders · waste log"
      />

      {isEmpty && (
        <div className="mb-4 rounded border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-800">
          No inventory data yet. {auth ? "Use the forms below to record counts, create POs, and log waste." : "Sign in to record inventory data."}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <Stat label="Items Counted" value={String(counts.counts.length)} />
        <Stat label="Inventory Value" value={php(Math.round(inventoryValue))} />
        <Stat label="Active POs" value={String(activePOs.orders.length)} />
        <Stat label="PO Value" value={php(Math.round(activePOValue))} />
      </div>

      {/* Live inventory counts */}
      <h2 className="text-lg font-semibold text-stone-900 mb-3">Latest Counts</h2>
      {counts.counts.length === 0 ? (
        <div className="rounded border border-sky-200 bg-sky-50 p-4 text-sm text-sky-800 mb-10">
          No inventory counts recorded yet.
        </div>
      ) : (
        <div className="rounded border border-stone-200 bg-white shadow-sm overflow-hidden mb-10">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-100 text-stone-600 text-xs uppercase">
                <tr>
                  <th className="text-left px-3 py-2">Ingredient</th>
                  <th className="text-left px-3 py-2">Category</th>
                  <th className="text-left px-3 py-2">Unit</th>
                  <th className="text-right px-3 py-2">Qty on Hand</th>
                  <th className="text-right px-3 py-2">Unit Cost</th>
                  <th className="text-right px-3 py-2">Value</th>
                  <th className="text-left px-3 py-2">Counted</th>
                </tr>
              </thead>
              <tbody>
                {counts.counts.map((c) => (
                  <tr key={c.ingredient_id} className="border-t border-stone-100 hover:bg-stone-50">
                    <td className="px-3 py-2 text-stone-900">{c.ingredient_name}</td>
                    <td className="px-3 py-2 text-stone-500 text-xs">{c.category}</td>
                    <td className="px-3 py-2 text-stone-500 text-xs">{c.unit}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-medium">{c.qty_on_hand}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{php(c.unit_cost)}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-medium">
                      {php(Math.round(c.qty_on_hand * c.unit_cost))}
                    </td>
                    <td className="px-3 py-2 text-stone-500 text-xs tabular-nums">
                      {c.counted_at?.slice(0, 10)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Active POs */}
      <h2 className="text-lg font-semibold text-stone-900 mb-3">Active Purchase Orders</h2>
      {activePOs.orders.length === 0 ? (
        <div className="rounded border border-sky-200 bg-sky-50 p-4 text-sm text-sky-800 mb-10">
          No active POs. Create one at <a href="/purchase-orders" className="underline">/purchase-orders</a>.
        </div>
      ) : (
        <div className="rounded border border-stone-200 bg-white shadow-sm overflow-hidden mb-10">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-100 text-stone-600 text-xs uppercase">
                <tr>
                  <th className="text-left px-3 py-2">PO #</th>
                  <th className="text-left px-3 py-2">Supplier</th>
                  <th className="text-center px-3 py-2">Status</th>
                  <th className="text-left px-3 py-2">Ordered</th>
                  <th className="text-left px-3 py-2">Expected</th>
                  <th className="text-right px-3 py-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {activePOs.orders.map((po) => (
                  <tr key={po.id} className="border-t border-stone-100 hover:bg-stone-50">
                    <td className="px-3 py-2 font-medium tabular-nums">{po.po_number}</td>
                    <td className="px-3 py-2">{po.supplier_name}</td>
                    <td className="px-3 py-2 text-center">
                      <POBadge status={po.status} />
                    </td>
                    <td className="px-3 py-2 text-stone-500 text-xs tabular-nums">
                      {po.ordered_at?.slice(0, 10)}
                    </td>
                    <td className="px-3 py-2 text-stone-500 text-xs tabular-nums">
                      {po.expected_at?.slice(0, 10) ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums font-medium">
                      {php(po.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent waste */}
      <h2 className="text-lg font-semibold text-stone-900 mb-3">Recent Waste (30d)</h2>
      {waste.entries.length === 0 ? (
        <div className="rounded border border-sky-200 bg-sky-50 p-4 text-sm text-sky-800 mb-10">
          No waste logged in the last 30 days.
        </div>
      ) : (
        <div className="rounded border border-stone-200 bg-white shadow-sm overflow-hidden mb-10">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-100 text-stone-600 text-xs uppercase">
                <tr>
                  <th className="text-left px-3 py-2">Date</th>
                  <th className="text-left px-3 py-2">Item</th>
                  <th className="text-right px-3 py-2">Qty</th>
                  <th className="text-left px-3 py-2">Reason</th>
                </tr>
              </thead>
              <tbody>
                {waste.entries.map((w) => (
                  <tr key={w.id} className="border-t border-stone-100 hover:bg-stone-50">
                    <td className="px-3 py-2 text-stone-500 text-xs tabular-nums">
                      {w.occurred_on}
                    </td>
                    <td className="px-3 py-2 text-stone-900">
                      {w.ingredient_name ?? w.menu_item_name ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{w.qty}</td>
                    <td className="px-3 py-2">
                      <span className="text-xs px-1.5 py-0.5 rounded bg-stone-100 text-stone-600 capitalize">
                        {w.reason}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Data entry forms for authenticated users */}
      {auth && (
        <>
          <InventoryCountForm />

          <section className="mt-10">
            <h2 className="text-lg font-semibold text-stone-900 mb-3">Log Waste</h2>
            <div className="rounded border border-stone-200 bg-white p-4 shadow-sm">
              <WasteLogForm />
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-stone-200 bg-white p-3 shadow-sm">
      <div className="text-[10px] uppercase tracking-wider text-stone-500">{label}</div>
      <div className="text-xl font-semibold mt-1">{value}</div>
    </div>
  );
}

function POBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    draft: "bg-stone-200 text-stone-700",
    approved: "bg-blue-100 text-blue-800",
    sent: "bg-amber-100 text-amber-800",
    received: "bg-emerald-100 text-emerald-800",
  };
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-semibold ${colors[status] || "bg-stone-100"}`}>
      {status}
    </span>
  );
}
