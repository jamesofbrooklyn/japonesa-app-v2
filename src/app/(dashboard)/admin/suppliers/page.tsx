import { redirect } from "next/navigation";
import SectionHeader from "@/components/SectionHeader";
import SupplierForm from "@/components/SupplierForm";
import { requireAuth } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase-server";

export default async function SuppliersAdminPage() {
  const { profile } = await requireAuth();
  if (profile.role !== "owner") redirect("/");

  const sb = await supabaseServer();
  const { data: suppliers } = await sb
    .from("suppliers")
    .select("id, name, class, category, contact, lead_time_days, payment_terms, created_at")
    .order("name");

  return (
    <div>
      <SectionHeader
        title="Suppliers"
        subtitle="Add and manage suppliers used by purchase orders"
      />

      <h2 className="text-lg font-semibold text-stone-900 mb-3">
        Existing suppliers ({suppliers?.length ?? 0})
      </h2>
      {!suppliers || suppliers.length === 0 ? (
        <div className="rounded border border-sky-200 bg-sky-50 p-4 text-sm text-sky-800 mb-10">
          No suppliers yet. Add your first one below.
        </div>
      ) : (
        <div className="rounded border border-stone-200 bg-white shadow-sm overflow-hidden mb-10">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-100 text-stone-600">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Name</th>
                  <th className="text-left px-3 py-2 font-medium">Class</th>
                  <th className="text-left px-3 py-2 font-medium">Category</th>
                  <th className="text-left px-3 py-2 font-medium">Contact</th>
                  <th className="text-right px-3 py-2 font-medium">Lead time</th>
                  <th className="text-left px-3 py-2 font-medium">Terms</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((s: any) => (
                  <tr key={s.id} className="border-t border-stone-100 hover:bg-stone-50">
                    <td className="px-3 py-2 text-stone-900">{s.name}</td>
                    <td className="px-3 py-2">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-semibold ${
                        s.class === "contract"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800"
                      }`}>
                        {s.class}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-stone-500 text-xs">{s.category ?? "—"}</td>
                    <td className="px-3 py-2 text-stone-500 text-xs">{s.contact ?? "—"}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-stone-500">
                      {s.lead_time_days != null ? `${s.lead_time_days}d` : "—"}
                    </td>
                    <td className="px-3 py-2 text-stone-500 text-xs">{s.payment_terms ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <h2 className="text-lg font-semibold text-stone-900 mb-3">Add supplier</h2>
      <div className="rounded border border-stone-200 bg-white shadow-sm p-6">
        <SupplierForm />
      </div>
    </div>
  );
}
