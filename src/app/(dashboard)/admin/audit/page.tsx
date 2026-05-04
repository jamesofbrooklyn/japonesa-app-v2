import { redirect } from "next/navigation";
import SectionHeader from "@/components/SectionHeader";
import { requireAuth } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase-server";

const TABLE_LABELS: Record<string, string> = {
  daily_close: "Daily Close",
  pnl_lines: "P&L Line",
  purchase_orders: "Purchase Order",
  staff: "Staff",
  menu_items: "Menu Item",
  inventory_counts: "Inventory Count",
  waste_log: "Waste Log",
};

const OP_STYLES: Record<string, string> = {
  insert: "bg-emerald-100 text-emerald-800",
  update: "bg-amber-100 text-amber-800",
  delete: "bg-red-100 text-red-800",
};

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ table?: string; user?: string }>;
}) {
  const { profile } = await requireAuth();
  if (profile.role !== "owner") redirect("/");

  const params = await searchParams;
  const sb = await supabaseServer();

  let query = sb
    .from("audit_log")
    .select("id, occurred_at, user_id, table_name, op, row_id, concept, before_json, after_json")
    .order("occurred_at", { ascending: false })
    .limit(200);

  if (params.table) query = query.eq("table_name", params.table);
  if (params.user) query = query.eq("user_id", params.user);

  const { data: rows } = await query;

  // Resolve user_ids to display names in one query
  const userIds = [...new Set((rows ?? []).map((r: any) => r.user_id).filter(Boolean))];
  const { data: profiles } = userIds.length > 0
    ? await sb
        .from("user_profiles")
        .select("user_id, display_name, role")
        .in("user_id", userIds)
    : { data: [] };
  const userMap = new Map(
    (profiles ?? []).map((p: any) => [p.user_id, { name: p.display_name, role: p.role }])
  );

  return (
    <div>
      <SectionHeader
        title="Audit log"
        subtitle="Recent edits to financial and operational records (latest 200)"
      />

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-2 text-xs">
        <FilterChip
          href="/admin/audit"
          label="All tables"
          active={!params.table}
        />
        {Object.entries(TABLE_LABELS).map(([t, label]) => (
          <FilterChip
            key={t}
            href={`/admin/audit?table=${t}`}
            label={label}
            active={params.table === t}
          />
        ))}
      </div>

      {!rows || rows.length === 0 ? (
        <div className="rounded border border-sky-200 bg-sky-50 p-4 text-sm text-sky-800">
          No audit entries{params.table ? ` for ${TABLE_LABELS[params.table] ?? params.table}` : ""}.
        </div>
      ) : (
        <div className="rounded border border-stone-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-100 text-stone-600 text-xs uppercase">
                <tr>
                  <th className="text-left px-3 py-2">When</th>
                  <th className="text-left px-3 py-2">Who</th>
                  <th className="text-left px-3 py-2">Action</th>
                  <th className="text-left px-3 py-2">Record</th>
                  <th className="text-left px-3 py-2">Summary</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r: any) => {
                  const user = r.user_id ? userMap.get(r.user_id) : null;
                  return (
                    <tr key={r.id} className="border-t border-stone-100 hover:bg-stone-50 align-top">
                      <td className="px-3 py-2 text-stone-500 text-xs tabular-nums whitespace-nowrap">
                        {formatTimestamp(r.occurred_at)}
                      </td>
                      <td className="px-3 py-2">
                        {user ? (
                          <>
                            <div className="text-stone-900">{user.name}</div>
                            <div className="text-[10px] text-stone-500 uppercase">{user.role}</div>
                          </>
                        ) : (
                          <span className="text-stone-400 text-xs">system</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-semibold ${OP_STYLES[r.op] || "bg-stone-100"}`}>
                          {r.op}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="text-stone-900">{TABLE_LABELS[r.table_name] ?? r.table_name}</div>
                        <div className="text-[10px] text-stone-500 font-mono">{r.row_id?.slice(0, 8)}</div>
                      </td>
                      <td className="px-3 py-2 text-xs text-stone-600 max-w-md">
                        {summarizeChange(r)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterChip({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <a
      href={href}
      className={`px-2 py-1 rounded border ${
        active
          ? "bg-japonesa-red text-white border-japonesa-red"
          : "border-stone-300 text-stone-700 hover:bg-stone-100"
      }`}
    >
      {label}
    </a>
  );
}

function formatTimestamp(iso: string): string {
  // Render in Manila local time so the audit log makes sense to PH staff
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

/**
 * Produce a one-line summary of what changed. For updates, diff before vs after.
 * For inserts, list the most informative fields. For deletes, show what was removed.
 */
function summarizeChange(row: {
  op: string;
  table_name: string;
  before_json: Record<string, unknown> | null;
  after_json: Record<string, unknown> | null;
}): string {
  const skipFields = new Set([
    "id", "created_at", "updated_at", "submitted_at", "ingested_at",
    "before_json", "after_json",
  ]);

  if (row.op === "insert" && row.after_json) {
    // Pick a couple of "headline" fields per table
    const headlines: Record<string, string[]> = {
      daily_close: ["close_date", "net_revenue_php", "covers"],
      pnl_lines: ["category", "subcategory", "amount_php", "occurred_on"],
      purchase_orders: ["po_number", "status", "total"],
      staff: ["name", "role", "base_rate_php"],
      menu_items: ["sku", "name", "price_php"],
      inventory_counts: ["ingredient_id", "qty_on_hand"],
      waste_log: ["occurred_on", "qty", "reason"],
    };
    const fields = headlines[row.table_name] ?? Object.keys(row.after_json).slice(0, 3);
    return fields
      .filter((f) => !skipFields.has(f))
      .map((f) => `${f}=${formatValue(row.after_json![f])}`)
      .join(" · ");
  }

  if (row.op === "delete" && row.before_json) {
    const headline = (row.before_json.po_number ?? row.before_json.close_date ??
      row.before_json.subcategory ?? row.before_json.name ?? row.before_json.id) as string;
    return `Deleted ${headline ?? "record"}`;
  }

  if (row.op === "update" && row.before_json && row.after_json) {
    const changed: string[] = [];
    for (const key of Object.keys(row.after_json)) {
      if (skipFields.has(key)) continue;
      const before = row.before_json[key];
      const after = row.after_json[key];
      if (JSON.stringify(before) !== JSON.stringify(after)) {
        changed.push(`${key}: ${formatValue(before)} → ${formatValue(after)}`);
      }
    }
    if (changed.length === 0) return "No field changes (touch)";
    return changed.slice(0, 3).join(" · ") + (changed.length > 3 ? ` (+${changed.length - 3} more)` : "");
  }

  return "";
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return "∅";
  if (typeof v === "string") {
    if (v.length > 30) return `"${v.slice(0, 27)}…"`;
    return `"${v}"`;
  }
  if (typeof v === "number") return v.toLocaleString();
  if (typeof v === "boolean") return v ? "true" : "false";
  return JSON.stringify(v).slice(0, 30);
}
