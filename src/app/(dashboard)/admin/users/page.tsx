import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import SectionHeader from "@/components/SectionHeader";
import InviteForm from "@/components/InviteForm";
import { supabaseAdmin } from "@/lib/supabase";

export default async function AdminUsersPage() {
  const { profile } = await requireAuth();
  if (profile.role !== "owner") redirect("/");

  const admin = supabaseAdmin();
  const { data: profiles } = await admin
    .from("user_profiles")
    .select("*")
    .order("created_at", { ascending: true });

  return (
    <div>
      <SectionHeader
        title="User Management"
        subtitle="Invite team members and manage access"
      />

      {/* Existing users */}
      <h2 className="text-lg font-semibold text-stone-900 mb-3">Team members</h2>
      <div className="rounded border border-stone-200 bg-white shadow-sm overflow-hidden mb-10">
        <table className="w-full text-sm">
          <thead className="bg-stone-100 text-stone-600">
            <tr>
              <th className="text-left px-3 py-2 font-medium">Name</th>
              <th className="text-left px-3 py-2 font-medium">Role</th>
              <th className="text-left px-3 py-2 font-medium">Concept</th>
              <th className="text-left px-3 py-2 font-medium">Added</th>
            </tr>
          </thead>
          <tbody>
            {(profiles ?? []).map((p: any) => (
              <tr key={p.id} className="border-t border-stone-100 hover:bg-stone-50">
                <td className="px-3 py-2 text-stone-900">{p.display_name}</td>
                <td className="px-3 py-2">
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-semibold ${
                      p.role === "owner"
                        ? "bg-japonesa-red/10 text-japonesa-red"
                        : "bg-stone-100 text-stone-700"
                    }`}
                  >
                    {p.role}
                  </span>
                </td>
                <td className="px-3 py-2 text-stone-500 text-xs">
                  {p.concept ?? "All concepts"}
                </td>
                <td className="px-3 py-2 text-stone-500 text-xs">
                  {new Date(p.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Invite form */}
      <h2 className="text-lg font-semibold text-stone-900 mb-3">Invite new user</h2>
      <div className="rounded border border-stone-200 bg-white shadow-sm p-6 max-w-lg">
        <InviteForm />
      </div>
    </div>
  );
}
