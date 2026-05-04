import SectionHeader from "@/components/SectionHeader";
import POForm from "@/components/POForm";
import POList from "@/components/POList";
import { requireAuth } from "@/lib/auth";

export default async function PurchaseOrdersPage() {
  const auth = await requireAuth();
  const isOwner = auth.profile.role === "owner";

  return (
    <div>
      <SectionHeader
        title="Purchase Orders"
        subtitle="Create, approve, track, and log purchase orders. Auto-numbered PO-YYYY-NNNN."
      />

      <div className="rounded border border-stone-200 bg-white p-4 shadow-sm mb-8">
        <h2 className="text-lg font-semibold text-stone-900 mb-3">Create New PO</h2>
        <POForm />
      </div>

      <div className="rounded border border-stone-200 bg-white p-4 shadow-sm">
        <POList isOwner={isOwner} />
      </div>
    </div>
  );
}
