import { redirect } from "next/navigation";
import SectionHeader from "@/components/SectionHeader";
import MenuItemForm from "@/components/MenuItemForm";
import { php } from "@/lib/kpis";
import { requireAuth } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase-server";

export default async function MenuAdminPage() {
  const { profile } = await requireAuth();
  if (profile.role !== "owner") redirect("/");

  const sb = await supabaseServer();
  const { data: items } = await sb
    .from("menu_items")
    .select("id, sku, pos_id, name, category, variant, price_php, theoretical_cost_php, active")
    .order("category")
    .order("name");

  return (
    <div>
      <SectionHeader
        title="Menu items"
        subtitle="Manage menu items used by sales matching and menu engineering"
      />

      <h2 className="text-lg font-semibold text-stone-900 mb-3">
        Existing items ({items?.length ?? 0})
      </h2>
      {!items || items.length === 0 ? (
        <div className="rounded border border-sky-200 bg-sky-50 p-4 text-sm text-sky-800 mb-10">
          No menu items yet. Add your first one below — POS imports will match against name and pos_id.
        </div>
      ) : (
        <div className="rounded border border-stone-200 bg-white shadow-sm overflow-hidden mb-10">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-100 text-stone-600">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">SKU</th>
                  <th className="text-left px-3 py-2 font-medium">POS ID</th>
                  <th className="text-left px-3 py-2 font-medium">Name</th>
                  <th className="text-left px-3 py-2 font-medium">Category</th>
                  <th className="text-left px-3 py-2 font-medium">Variant</th>
                  <th className="text-right px-3 py-2 font-medium">Price</th>
                  <th className="text-right px-3 py-2 font-medium">Cost</th>
                  <th className="text-center px-3 py-2 font-medium">Active</th>
                </tr>
              </thead>
              <tbody>
                {items.map((m: any) => (
                  <tr key={m.id} className="border-t border-stone-100 hover:bg-stone-50">
                    <td className="px-3 py-2 font-mono text-xs text-stone-700">{m.sku}</td>
                    <td className="px-3 py-2 font-mono text-xs text-stone-500">{m.pos_id ?? "—"}</td>
                    <td className="px-3 py-2 text-stone-900">{m.name}</td>
                    <td className="px-3 py-2 text-stone-500 text-xs">{m.category}</td>
                    <td className="px-3 py-2 text-stone-500 text-xs">{m.variant ?? "—"}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{php(Number(m.price_php))}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-stone-500">
                      {m.theoretical_cost_php != null ? php(Number(m.theoretical_cost_php)) : "—"}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-semibold ${
                        m.active ? "bg-emerald-100 text-emerald-800" : "bg-stone-200 text-stone-500"
                      }`}>
                        {m.active ? "active" : "inactive"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <h2 className="text-lg font-semibold text-stone-900 mb-3">Add menu item</h2>
      <div className="rounded border border-stone-200 bg-white shadow-sm p-6">
        <MenuItemForm />
      </div>
    </div>
  );
}
