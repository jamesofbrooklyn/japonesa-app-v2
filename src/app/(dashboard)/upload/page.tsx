import SectionHeader from "@/components/SectionHeader";
import CSVUploadForm from "@/components/CSVUploadForm";
import { requireAuth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function UploadPage() {
  const auth = await requireAuth();

  if (auth.profile.role !== "owner") {
    redirect("/");
  }

  return (
    <div>
      <SectionHeader
        title="Upload Sales Data"
        subtitle="Import POS CSV exports from OneClickTech. Supports 90-day backfill."
      />

      <div className="rounded border border-stone-200 bg-white p-4 shadow-sm">
        <CSVUploadForm />
      </div>
    </div>
  );
}
