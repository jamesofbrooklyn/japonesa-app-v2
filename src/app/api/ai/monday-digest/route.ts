import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth";
import { apiError, rateLimit } from "@/lib/api-helpers";
import { getActiveConcept } from "@/lib/concept";
import { collectWeeklyData } from "@/lib/ai-data-collector";
import { detectAnomalies, generateMondayDigest, type Anomaly } from "@/lib/ai-runners";
import { getCachedAiResponse, setCachedAiResponse } from "@/lib/ai-cache";

/**
 * Monday digest = anomalies + narrative weekly briefing.
 * Reuses the cached anomalies if available so we don't pay Claude twice.
 */
export async function POST() {
  const auth = await requireApiAuth({ ownerOnly: true });
  if (auth instanceof NextResponse) return auth;
  const { sb, user, profile } = auth;

  const limited = rateLimit({
    userId: user.id,
    endpoint: "ai-monday-digest",
    maxCalls: 3,
    windowMs: 60_000,
  });
  if (limited) return limited;

  const concept = await getActiveConcept(profile);
  const bundle = await collectWeeklyData(sb, concept);
  if (!bundle) {
    return apiError({
      status: 400,
      message: "Not enough data for analysis. Submit daily close entries first.",
      tag: "ai-monday-digest",
    });
  }

  const period = bundle.period;

  // Check digest cache first — full hit short-circuits both Claude calls
  const digestCacheParts = {
    endpoint: "monday-digest" as const,
    periodStart: period.start,
    periodEnd: period.end,
    concept,
  };
  const cachedDigest = await getCachedAiResponse<{
    digest: string;
    anomalies: Anomaly[];
    period: typeof period;
    generated_at: string;
  }>(sb, digestCacheParts);
  if (cachedDigest) {
    return NextResponse.json({ ...cachedDigest.response, cached: true });
  }

  // Reuse cached anomalies if we have them — saves the second Claude call.
  let anomalies: Anomaly[];
  const anomalyCacheParts = {
    endpoint: "anomalies" as const,
    periodStart: period.start,
    periodEnd: period.end,
    concept,
  };
  const cachedAnomalies = await getCachedAiResponse<{
    anomalies: Anomaly[];
  }>(sb, anomalyCacheParts);

  try {
    if (cachedAnomalies) {
      anomalies = cachedAnomalies.response.anomalies;
    } else {
      anomalies = await detectAnomalies(bundle);
      // Backfill the anomaly cache so a follow-up /api/ai/anomalies call is free
      await setCachedAiResponse(
        sb,
        anomalyCacheParts,
        { anomalies, period, generated_at: new Date().toISOString() },
        user.id
      ).catch(() => {});
    }
  } catch (e) {
    return apiError({
      status: 502,
      message: "AI provider error during anomaly detection.",
      cause: e,
      tag: "ai-monday-digest:anomalies",
    });
  }

  let digest: string;
  try {
    digest = await generateMondayDigest(bundle, anomalies);
  } catch (e) {
    return apiError({
      status: 502,
      message: "AI provider error during digest generation.",
      cause: e,
      tag: "ai-monday-digest:digest",
    });
  }

  const response = {
    digest,
    anomalies,
    period,
    generated_at: new Date().toISOString(),
  };

  await setCachedAiResponse(sb, digestCacheParts, response, user.id).catch(() => {});

  return NextResponse.json(response);
}
