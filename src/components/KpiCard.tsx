import type { Band } from "@/lib/kpis";

const BAND_STYLES: Record<Band, string> = {
  good: "border-emerald-300 bg-emerald-50 text-emerald-800",
  watch: "border-amber-300 bg-amber-50 text-amber-800",
  bad: "border-red-300 bg-red-50 text-red-800",
};

export default function KpiCard({
  label,
  value,
  sub,
  band: b,
}: {
  label: string;
  value: string;
  sub?: string;
  band?: Band;
}) {
  const tone = b ? BAND_STYLES[b] : "border-stone-200 bg-white text-stone-900";
  return (
    <div className={`rounded-lg border p-4 shadow-sm ${tone}`}>
      <div className="text-xs uppercase tracking-wider text-stone-500">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
      {sub && <div className="mt-1 text-xs text-stone-500">{sub}</div>}
    </div>
  );
}
