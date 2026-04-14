import SectionHeader from "@/components/SectionHeader";
import { CATEGORY_LABEL, CATEGORY_ORDER } from "@/lib/categories";
import { php, pct } from "@/lib/kpis";
import { MENU_PERF, QUADRANT_COUNTS } from "@/lib/mock";

const QUADRANT_META = {
  star: { label: "STARS", color: "bg-emerald-50 border-emerald-300 text-emerald-900", hint: "high margin · high velocity — protect & feature" },
  puzzle: { label: "PUZZLES", color: "bg-amber-50 border-amber-300 text-amber-900", hint: "high margin · low velocity — re-merchandise" },
  plowhorse: { label: "PLOWHORSES", color: "bg-sky-50 border-sky-300 text-sky-900", hint: "low margin · high velocity — re-engineer cost" },
  dog: { label: "DOGS", color: "bg-red-50 border-red-300 text-red-900", hint: "low margin · low velocity — cut or rework" },
};

export default function MenuPage() {
  const totalSKU = MENU_PERF.length;
  const totalContribution = MENU_PERF.reduce((a, b) => a + b.contribution, 0);

  // ---- COGS breakdown (30d, derived from per-item cost × qty sold) ----
  const foodItems  = MENU_PERF.filter((m) => m.type === "food");
  const drinkItems = MENU_PERF.filter((m) => m.type === "drink");
  const foodSales   = foodItems.reduce((a, b)  => a + b.price * b.qty30d, 0);
  const drinkSales  = drinkItems.reduce((a, b) => a + b.price * b.qty30d, 0);
  const foodCOGS    = foodItems.reduce((a, b)  => a + b.cost  * b.qty30d, 0);
  const drinkCOGS   = drinkItems.reduce((a, b) => a + b.cost  * b.qty30d, 0);
  const totalSales  = foodSales + drinkSales;
  const totalCOGS   = foodCOGS + drinkCOGS;

  const stars = MENU_PERF.filter((m) => m.quadrant === "star")
    .sort((a, b) => b.contribution - a.contribution)
    .slice(0, 10);
  const dogs = MENU_PERF.filter((m) => m.quadrant === "dog")
    .sort((a, b) => a.contribution - b.contribution)
    .slice(0, 10);

  const grouped = CATEGORY_ORDER.map((cat) => ({
    cat,
    items: MENU_PERF.filter((i) => i.category === cat),
  })).filter((g) => g.items.length > 0);

  return (
    <div>
      <SectionHeader
        title="Menu Engineering"
        subtitle={`${totalSKU} items · 30-day classification · contribution = margin × qty sold`}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <Stat label="Total SKUs" value={String(totalSKU)} />
        <Stat label="30d Contribution" value={php(totalContribution)} />
        <Stat label="Stars / Dogs" value={`${QUADRANT_COUNTS.star} / ${QUADRANT_COUNTS.dog}`} />
        <Stat label="Avg Margin %" value={pct(MENU_PERF.reduce((a, b) => a + (b.margin / b.price), 0) / totalSKU)} />
      </div>

      {/* ---- COGS Breakdown ---- */}
      <h2 className="text-lg font-semibold text-stone-900 mb-3">COGS vs Sales — 30 days</h2>
      <div className="rounded border border-stone-200 bg-white shadow-sm overflow-hidden mb-10 max-w-2xl">
        <table className="w-full text-sm">
          <thead className="bg-stone-100 text-stone-600">
            <tr>
              <th className="text-left px-4 py-2 font-medium">Category</th>
              <th className="text-right px-4 py-2 font-medium">30d Sales</th>
              <th className="text-right px-4 py-2 font-medium">30d COGS</th>
              <th className="text-right px-4 py-2 font-medium">COGS %</th>
            </tr>
          </thead>
          <tbody>
            <CogsRow label="Food" sales={foodSales} cogs={foodCOGS} loTarget={0.28} hiTarget={0.34} />
            <CogsRow label="Drinks" sales={drinkSales} cogs={drinkCOGS} loTarget={0.22} hiTarget={0.30} />
            <tr className="border-t-2 border-stone-300 bg-stone-50 font-semibold">
              <td className="px-4 py-2 text-stone-900">Total</td>
              <td className="px-4 py-2 text-right tabular-nums">{php(totalSales)}</td>
              <td className="px-4 py-2 text-right tabular-nums">{php(totalCOGS)}</td>
              <td className="px-4 py-2 text-right tabular-nums">
                <CogsBadge pct={totalCOGS / totalSales} lo={0.27} hi={0.33} />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 className="text-lg font-semibold text-stone-900 mb-3">
        Menu Engineering Quadrant
      </h2>
      <div className="grid grid-cols-2 gap-3 mb-10 max-w-3xl">
        {(["star", "puzzle", "plowhorse", "dog"] as const).map((q) => {
          const meta = QUADRANT_META[q];
          return (
            <div key={q} className={`rounded border p-4 shadow-sm ${meta.color}`}>
              <div className="flex items-baseline justify-between">
                <div className="font-semibold tracking-wide">{meta.label}</div>
                <div className="text-2xl font-bold">{QUADRANT_COUNTS[q]}</div>
              </div>
              <div className="text-[11px] mt-1 opacity-70">{meta.hint}</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
        <div>
          <h3 className="text-sm font-semibold text-emerald-800 uppercase tracking-wider mb-2">
            Top 10 Stars (by contribution)
          </h3>
          <PerfTable rows={stars} />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-red-800 uppercase tracking-wider mb-2">
            Bottom 10 Dogs (cut candidates)
          </h3>
          <PerfTable rows={dogs} />
        </div>
      </div>

      <h2 className="text-lg font-semibold text-stone-900 mb-3">Full menu by category</h2>
      {grouped.map(({ cat, items }) => (
        <section key={cat} className="mb-8">
          <h3 className="text-sm font-semibold text-japonesa-red mb-3 tracking-wider uppercase">
            {CATEGORY_LABEL[cat] ?? cat} ({items.length})
          </h3>
          <div className="rounded border border-stone-200 overflow-hidden bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-stone-100 text-stone-600">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Item</th>
                  <th className="text-right px-3 py-2 font-medium">Price</th>
                  <th className="text-right px-3 py-2 font-medium">Cost</th>
                  <th className="text-right px-3 py-2 font-medium">Margin</th>
                  <th className="text-right px-3 py-2 font-medium">Qty 7d</th>
                  <th className="text-right px-3 py-2 font-medium">Qty 30d</th>
                  <th className="text-right px-3 py-2 font-medium">Contrib.</th>
                  <th className="text-center px-3 py-2 font-medium">Q</th>
                </tr>
              </thead>
              <tbody>
                {items
                  .sort((a, b) => b.contribution - a.contribution)
                  .map((it) => (
                    <tr key={it.sku} className="border-t border-stone-100 hover:bg-stone-50">
                      <td className="px-3 py-2 text-stone-900">{it.name}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{php(it.price)}</td>
                      <td className="px-3 py-2 text-right text-stone-500 tabular-nums">{php(it.cost)}</td>
                      <td className="px-3 py-2 text-right tabular-nums font-medium">{php(it.margin)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-stone-600">{it.qty7d}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-stone-600">{it.qty30d}</td>
                      <td className="px-3 py-2 text-right tabular-nums font-semibold">{php(it.contribution)}</td>
                      <td className="px-3 py-2 text-center">
                        <QuadrantBadge q={it.quadrant} />
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}

function PerfTable({ rows }: { rows: typeof MENU_PERF }) {
  return (
    <div className="rounded border border-stone-200 bg-white shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <tbody>
          {rows.map((r) => (
            <tr key={r.sku} className="border-t border-stone-100 first:border-t-0">
              <td className="px-3 py-2">
                <div className="text-stone-900 text-xs font-medium">{r.name}</div>
                <div className="text-[10px] text-stone-500">{r.qty30d} sold · margin {php(r.margin)}</div>
              </td>
              <td className="px-3 py-2 text-right text-xs font-semibold tabular-nums">
                {php(r.contribution)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function QuadrantBadge({ q }: { q: "star" | "puzzle" | "plowhorse" | "dog" }) {
  const map = {
    star: "bg-emerald-100 text-emerald-800",
    puzzle: "bg-amber-100 text-amber-800",
    plowhorse: "bg-sky-100 text-sky-800",
    dog: "bg-red-100 text-red-800",
  };
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-semibold ${map[q]}`}>
      {q}
    </span>
  );
}

function CogsRow({ label, sales, cogs, loTarget, hiTarget }: {
  label: string; sales: number; cogs: number; loTarget: number; hiTarget: number;
}) {
  const pctVal = cogs / sales;
  return (
    <tr className="border-t border-stone-100">
      <td className="px-4 py-2 text-stone-700 font-medium">{label}</td>
      <td className="px-4 py-2 text-right tabular-nums text-stone-600">{php(sales)}</td>
      <td className="px-4 py-2 text-right tabular-nums text-stone-600">{php(cogs)}</td>
      <td className="px-4 py-2 text-right tabular-nums">
        <CogsBadge pct={pctVal} lo={loTarget} hi={hiTarget} />
      </td>
    </tr>
  );
}

function CogsBadge({ pct: val, lo, hi }: { pct: number; lo: number; hi: number }) {
  const color = val <= hi
    ? "bg-emerald-100 text-emerald-800"
    : val <= hi + 0.04
      ? "bg-amber-100 text-amber-800"
      : "bg-red-100 text-red-800";
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold tabular-nums ${color}`}>
      {pct(val)}
    </span>
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
