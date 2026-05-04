import SectionHeader from "@/components/SectionHeader";
import AIWeeklyReview from "@/components/AIWeeklyReview";
import AIAnomalyCards from "@/components/AIAnomalyCards";
import AIMondayDigest from "@/components/AIMondayDigest";
import { requireAuth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function InsightsPage() {
  const auth = await requireAuth();

  if (auth.profile.role !== "owner") {
    redirect("/");
  }

  return (
    <div>
      <SectionHeader
        title="AI Insights"
        subtitle="Claude-powered analysis of your operations. Generate weekly reviews, detect anomalies, and get Monday morning briefings."
      />

      <div className="space-y-8">
        <AIMondayDigest />
        <AIWeeklyReview />

        <div className="rounded border border-stone-200 bg-white p-4 shadow-sm">
          <AIAnomalyCards />
        </div>
      </div>
    </div>
  );
}
