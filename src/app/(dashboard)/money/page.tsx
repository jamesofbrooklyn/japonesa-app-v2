import SectionHeader from "@/components/SectionHeader";
import KpiCard from "@/components/KpiCard";
import PnlLineForm from "@/components/PnlLineForm";
import PnlLineList from "@/components/PnlLineList";
import { php, pct } from "@/lib/kpis";
import { fetchPnlMTD } from "@/lib/queries";
import { supabaseServer } from "@/lib/supabase-server";
import { optionalAuth } from "@/lib/auth";
import { getActiveConcept } from "@/lib/concept";

export default async function MoneyPage() {
  const sb = await supabaseServer();
  const auth = await optionalAuth();
  const concept = auth ? await getActiveConcept(auth.profile) : undefined;
  const pnl = await fetchPnlMTD(sb, concept);
  const isOwner = auth?.profile.role === "owner";

  return (
    <div>
      <SectionHeader
        title="Money"
        subtitle="Month-to-date P&L"
      />

      {pnl.source === "empty" && (
        <div className="mb-4 rounded border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-800">
          No P&L data yet. Add P&L lines below to populate this page.
        </div>
      )}

      {/* Headline KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <KpiCard label="Net Base Revenue (MTD)" value={php(pnl.revenue)} sub="from daily close" />
        <KpiCard label="Prime Cost" value={pct(pnl.prime_pct)} sub="target ≤ 62%" />
        <KpiCard label="EBITDA" value={php(pnl.ebitda)} sub={`${pct(pnl.ebitda_pct)} margin`} />
        <KpiCard label="Food Cost" value={pct(pnl.food_pct)} sub="target 28–32%" />
      </div>

      {/* P&L */}
      <h2 className="text-lg font-semibold text-stone-900 mb-3">P&amp;L (MTD)</h2>
      <div className="rounded border border-stone-200 bg-white shadow-sm overflow-hidden mb-10">
        <table className="w-full text-sm">
          <tbody>
            <PnlRow label="Net Base Revenue" value={pnl.revenue} bold />
            <PnlRow label="COGS (food + bev)" value={-pnl.cogs} pctOf={pnl.revenue} />
            <PnlRow label="Labor (loaded)" value={-pnl.labor} pctOf={pnl.revenue} />
            <PnlRow label="Prime Cost subtotal" value={-(pnl.cogs + pnl.labor)} pctOf={pnl.revenue} subtle />
            <PnlRow label="Rent" value={-pnl.rent} pctOf={pnl.revenue} />
            <PnlRow label="Utilities" value={-pnl.utilities} pctOf={pnl.revenue} />
            <PnlRow label="Marketing" value={-pnl.marketing} pctOf={pnl.revenue} />
            <PnlRow label="Other OPEX" value={-pnl.other_opex} pctOf={pnl.revenue} />
            <PnlRow label="EBITDA" value={pnl.ebitda} pctOf={pnl.revenue} bold accent />
          </tbody>
        </table>
      </div>

      {/* P&L Entry Section */}
      {auth && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold text-stone-900 mb-3">Add P&L Line</h2>
          <div className="rounded border border-stone-200 bg-white p-4 shadow-sm mb-6">
            <PnlLineForm />
          </div>
          <PnlLineList isOwner={isOwner ?? false} />
        </section>
      )}
    </div>
  );
}

function PnlRow({
  label,
  value,
  pctOf,
  bold,
  subtle,
  accent,
}: {
  label: string;
  value: number;
  pctOf?: number;
  bold?: boolean;
  subtle?: boolean;
  accent?: boolean;
}) {
  const cls = [
    "border-t border-stone-100",
    bold && "font-semibold",
    subtle && "text-stone-500 italic",
    accent && "bg-emerald-50",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <tr className={cls}>
      <td className="px-3 py-2">{label}</td>
      <td className="px-3 py-2 text-right tabular-nums">{php(value)}</td>
      <td className="px-3 py-2 text-right tabular-nums text-stone-500 text-xs w-20">
        {pctOf ? pct(Math.abs(value) / pctOf) : ""}
      </td>
    </tr>
  );
}
