import { redirect } from "next/navigation";
import SectionHeader from "@/components/SectionHeader";
import IngredientForm from "@/components/IngredientForm";
import { php } from "@/lib/kpis";
import { requireAuth } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase-server";

export default async function IngredientsAdminPage() {
  const { profile } = await requireAuth();
  if (profile.role !== "owner") redirect("/");

  const sb = await supabaseServer();
  const { data: ingredients } = await sb
    .from("ingredients")
    .select("id, sku, name, category, unit, current_unit_cost, currency, supplier_id, suppliers(name)")
    .order("category")
    .order("name");

  return (
    <div>
      <SectionHeader
        title="Ingredients"
        subtitle="Manage ingredients used by inventory counts, recipes, and POs"
      />

      <h2 className="text-lg font-semibold text-stone-900 mb-3">
        Existing ingredients ({ingredients?.length ?? 0})
      </h2>
      {!ingredients || ingredients.length === 0 ? (
        <div className="rounded border border-sky-200 bg-sky-50 p-4 text-sm text-sky-800 mb-10">
          No ingredients yet. Add your first one below.
        </div>
      ) : (
        <div className="rounded border border-stone-200 bg-white shadow-sm overflow-hidden mb-10">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-100 text-stone-600">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">SKU</th>
                  <th className="text-left px-3 py-2 font-medium">Name</th>
                  <th className="text-left px-3 py-2 font-medium">Category</th>
                  <th className="text-left px-3 py-2 font-medium">Unit</th>
                  <th className="text-right px-3 py-2 font-medium">Unit cost</th>
                  <th className="text-left px-3 py-2 font-medium">Supplier</th>
                </tr>
              </thead>
              <tbody>
                {ingredients.map((i: any) => (
                  <tr key={i.id} className="border-t border-stone-100 hover:bg-stone-50">
                    <td className="px-3 py-2 font-mono text-xs text-stone-700">{i.sku}</td>
                    <td className="px-3 py-2 text-stone-900">{i.name}</td>
                    <td className="px-3 py-2 text-stone-500 text-xs">{i.category}</td>
                    <td className="px-3 py-2 text-stone-500 text-xs">{i.unit}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {i.current_unit_cost != null ? php(Number(i.current_unit_cost)) : "—"}
                    </td>
                    <td className="px-3 py-2 text-stone-500 text-xs">{i.suppliers?.name ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <h2 className="text-lg font-semibold text-stone-900 mb-3">Add ingredient</h2>
      <div className="rounded border border-stone-200 bg-white shadow-sm p-6">
        <IngredientForm />
      </div>
    </div>
  );
}
