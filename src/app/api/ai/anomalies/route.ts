import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth";
import { apiError, rateLimit } from "@/lib/api-helpers";
import { getActiveConcept } from "@/lib/concept";
import { collectWeeklyData } from "@/lib/ai-data-collector";
import { detectAnomalies, type Anomaly } from "@/lib/ai-runners";
import { getCachedAiResponse, setCachedAiResponse } from "@/lib/ai-cache";

export type { Anomaly };

export async function POST() {
  const auth = await requireApiAuth({ ownerOnly: true });
  if (auth instanceof NextResponse) return auth;
  const { sb, user, profile } = auth;

  const limited = rateLimit({
    userId: user.id,
    endpoint: "ai-anomalies",
    maxCalls: 4,
    windowMs: 60_000,
  });
  if (limited) return limited;

  const concept = await getActiveConcept(profile);
  const bundle = await collectWeeklyData(sb, concept);
  if (!bundle) {
    return apiError({
      status: 400,
      message: "Not enough data for analysis. Submit daily close entries first.",
      tag: "ai-anomalies",
    });
  }

  const cacheParts = {
    endpoint: "anomalies" as const,
    periodStart: bundle.period.start,
    periodEnd: bundle.period.end,
    concept,
  };

  const cached = await getCachedAiResponse<{
    anomalies: Anomaly[];
    period: typeof bundle.period;
    generated_at: string;
  }>(sb, cacheParts);
  if (cached) {
    return NextResponse.json({ ...cached.response, cached: true });
  }

  let anomalies: Anomaly[];
  try {
    anomalies = await detectAnomalies(bundle);
  } catch (e) {
    return apiError({
      status: 502,
      message: "AI provider error. Try again in a moment.",
      cause: e,
      tag: "ai-anomalies:anthropic",
    });
  }

  const response = {
    anomalies,
    period: bundle.period,
    generated_at: new Date().toISOString(),
  };

  await setCachedAiResponse(sb, cacheParts, response, user.id).catch(() => {});

  return NextResponse.json(response);
}
