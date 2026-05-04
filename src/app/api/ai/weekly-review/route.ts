import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth";
import { apiError, rateLimit } from "@/lib/api-helpers";
import { getActiveConcept } from "@/lib/concept";
import { collectWeeklyData } from "@/lib/ai-data-collector";
import { generateWeeklyReview } from "@/lib/ai-runners";
import { getCachedAiResponse, setCachedAiResponse } from "@/lib/ai-cache";

export async function POST() {
  const auth = await requireApiAuth({ ownerOnly: true });
  if (auth instanceof NextResponse) return auth;
  const { sb, user, profile } = auth;

  const limited = rateLimit({
    userId: user.id,
    endpoint: "ai-weekly-review",
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
      tag: "ai-weekly-review",
    });
  }

  const cacheParts = {
    endpoint: "weekly-review" as const,
    periodStart: bundle.period.start,
    periodEnd: bundle.period.end,
    concept,
  };

  const cached = await getCachedAiResponse<{
    review: string;
    period: typeof bundle.period;
    generated_at: string;
  }>(sb, cacheParts);
  if (cached) {
    return NextResponse.json({ ...cached.response, cached: true });
  }

  let review: string;
  try {
    review = await generateWeeklyReview(bundle);
  } catch (e) {
    return apiError({
      status: 502,
      message: "AI provider error. Try again in a moment.",
      cause: e,
      tag: "ai-weekly-review:anthropic",
    });
  }

  const response = {
    review,
    period: bundle.period,
    generated_at: new Date().toISOString(),
  };

  await setCachedAiResponse(sb, cacheParts, response, user.id).catch(() => {
    // Cache write failures shouldn't block the response — they self-heal next call.
  });

  return NextResponse.json(response);
}
