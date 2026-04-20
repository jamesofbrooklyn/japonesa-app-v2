import SectionHeader from "@/components/SectionHeader";
import KpiCard from "@/components/KpiCard";
import { php, pct } from "@/lib/kpis";
import {
  REVENUE_BREAKDOWN_MTD as REV,
  PNL_DERIVED as PNL,
  AP_AGING,
  FX_EXPOSURE,
} from "@/lib/mock";

export default function MoneyPage() {
  const ap = AP_AGING;
  const apTotal = ap.reduce((a, b) => a + b.current + b.d30 + b.d60 + b.d90, 0);
  const apOverdue = ap.reduce((a, b) => a + b.d30 + b.d60 + b.d90, 0);

  return (
    <div>
      <SectionHeader
        title="Money"
        subtitle="Month-to-date P&L · revenue breakdown · AP aging · FX exposure"
      />

      {/* Headline KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <KpiCard label="Net Base Revenue (MTD)" value={php(PNL.revenue)} sub="ex-VAT, post-discount" />
        <KpiCard label="Customer Collection" value={php(REV.customer_collection)} sub="incl. VAT + service" />
        <KpiCard label="Prime Cost" value={pct(PNL.prime_pct)} sub="target ≤ 62%" />
        <KpiCard label="EBITDA" value={php(PNL.ebitda)} sub={`${pct(PNL.ebitda_pct)} margin`} />
      </div>

      {/* Revenue Breakdown — the new section the user asked for */}
      <h2 className="text-lg font-semibold text-stone-900 mb-3">
        Revenue breakdown (MTD)
      </h2>
      <div className="rounded border border-stone-200 bg-white shadow-sm overflow-hidden mb-10">
        <table className="w-full text-sm">
          <tbody>
            <RevRow label="Gross Menu Sales" sub="sum of menu prices, pre-discount" value={REV.gross_menu} bold />

            <RevRow label="− Senior / PWD discount" sub="20% off, VAT-exempt" value={-REV.discounts.senior_pwd} indent />
            <RevRow label="− Owner discount" sub="50% comp (Jon, partners, hosting)" value={-REV.discounts.owner} indent />
            <RevRow label="− Employee discount" sub="20% staff meals" value={-REV.discounts.employee} indent />
            <RevRow label="Total Discounts" value={-REV.discounts.total} subtle />

            <RevRow label="Net of Discounts" value={REV.net_of_discounts} bold divider />

            <RevRow label="− 12% VAT (output)" sub="remitted to BIR" value={-REV.vat_output} indent />
            <RevRow label="Net Base Revenue" sub="what the restaurant books as income" value={REV.net_base_revenue} bold accent />

            <RevRow label="+ 10% Service Charge" sub="goes to staff tip pool" value={REV.service_charge} indent />
            <RevRow label="Customer Collection (cash through register)" value={REV.customer_collection} bold divider />
          </tbody>
        </table>
      </div>

      {/* P&L */}
      <h2 className="text-lg font-semibold text-stone-900 mb-3">P&amp;L (MTD)</h2>
      <div className="rounded border border-stone-200 bg-white shadow-sm overflow-hidden mb-10">
        <table className="w-full text-sm">
          <tbody>
            <PnlRow label="Net Base Revenue" value={PNL.revenue} bold />
            <PnlRow label="COGS (food + bev)" value={-PNL.cogs} pctOf={PNL.revenue} />
            <PnlRow label="Labor (loaded)" value={-PNL.labor} pctOf={PNL.revenue} />
            <PnlRow label="Prime Cost subtotal" value={-(PNL.cogs + PNL.labor)} pctOf={PNL.revenue} subtle />
            <PnlRow label="Rent" value={-PNL.rent} pctOf={PNL.revenue} />
            <PnlRow label="Utilities" value={-PNL.utilities} pctOf={PNL.revenue} />
            <PnlRow label="Marketing" value={-PNL.marketing} pctOf={PNL.revenue} />
            <PnlRow label="Other OPEX" value={-PNL.other_opex} pctOf={PNL.revenue} />
            <PnlRow label="EBITDA" value={PNL.ebitda} pctOf={PNL.revenue} bold accent />
          </tbody>
        </table>
      </div>

      {/* AP + FX */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
        <div>
          <h2 className="text-lg font-semibold text-stone-900 mb-3">AP aging</h2>
          <div className="rounded border border-stone-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-100 text-stone-600">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Supplier</th>
                  <th className="text-right px-3 py-2 font-medium">Current</th>
                  <th className="text-right px-3 py-2 font-medium">30d</th>
                  <th className="text-right px-3 py-2 font-medium">60d</th>
                </tr>
              </thead>
              <tbody>
                {ap.map((r) => (
                  <tr key={r.supplier} className="border-t border-stone-100">
                    <td className="px-3 py-2 text-stone-900">{r.supplier}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{php(r.current)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-amber-700">{r.d30 ? php(r.d30) : "—"}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-red-700">{r.d60 ? php(r.d60) : "—"}</td>
                  </tr>
                ))}
                <tr className="border-t border-stone-200 bg-stone-50 font-semibold">
                  <td className="px-3 py-2">Total AP</td>
                  <td className="px-3 py-2 text-right tabular-nums" colSpan={3}>{php(apTotal)}</td>
                </tr>
              </tbody>
            </table>
            </div>
          </div>
          <div className="text-xs text-stone-500 mt-2">
            {php(apOverdue)} overdue (30+ days). Manila Wine has a stale 60d line — chase it.
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-stone-900 mb-3">FX exposure (30d imports)</h2>
          <div className="rounded border border-stone-200 bg-white shadow-sm p-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-[10px] uppercase text-stone-500">JPY purchases</div>
                <div className="text-xl font-semibold">{php(FX_EXPOSURE.jpy_purchases_30d)}</div>
                <div className={`text-xs mt-1 ${FX_EXPOSURE.jpy_drift_pct > 0.03 ? "text-red-700 font-semibold" : "text-stone-500"}`}>
                  drift {FX_EXPOSURE.jpy_drift_pct > 0 ? "+" : ""}{pct(FX_EXPOSURE.jpy_drift_pct)} vs. 90d avg
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-stone-500">USD purchases</div>
                <div className="text-xl font-semibold">{php(FX_EXPOSURE.usd_purchases_30d)}</div>
                <div className="text-xs mt-1 text-stone-500">
                  drift +{pct(FX_EXPOSURE.usd_drift_pct)}
                </div>
              </div>
            </div>
            {FX_EXPOSURE.flagged && (
              <div className="mt-4 rounded border border-red-300 bg-red-50 p-3 text-xs text-red-800">
                ⚠ JPY drift exceeds 3% threshold. Hamachi, hotate, and uni costs are running hot — re-price or hedge the next PO.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function RevRow({
  label,
  sub,
  value,
  bold,
  indent,
  subtle,
  divider,
  accent,
}: {
  label: string;
  sub?: string;
  value: number;
  bold?: boolean;
  indent?: boolean;
  subtle?: boolean;
  divider?: boolean;
  accent?: boolean;
}) {
  const cls = [
    "border-t border-stone-100",
    bold && "font-semibold",
    subtle && "text-stone-500",
    accent && "bg-emerald-50",
    divider && "border-t-stone-300",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <tr className={cls}>
      <td className={`px-3 py-2 ${indent ? "pl-8" : ""} ${bold ? "text-stone-900" : ""}`}>
        <div>{label}</div>
        {sub && <div className="text-[10px] text-stone-500 font-normal">{sub}</div>}
      </td>
      <td className="px-3 py-2 text-right tabular-nums">{php(value)}</td>
    </tr>
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
