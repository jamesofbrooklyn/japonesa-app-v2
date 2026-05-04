/**
 * Shared runners for AI endpoints. Each takes a pre-collected `WeeklyDataBundle`,
 * applies the prompt, calls Claude, and parses the result.
 *
 * Used by /api/ai/{anomalies,weekly-review,monday-digest}.
 */
import { anthropic, CLAUDE_MODEL } from "./anthropic";
import {
  weeklyReviewPrompt,
  anomalyDetectionPrompt,
  mondayDigestPrompt,
} from "./ai-prompts";
import type { WeeklyDataBundle } from "./ai-data-collector";

export interface Anomaly {
  severity: "high" | "medium" | "low";
  title: string;
  detail: string;
  category: string;
}

function extractText(result: { content: Array<{ type: string; text?: string }> }): string {
  const block = result.content[0];
  return block?.type === "text" && block.text ? block.text : "";
}

export async function generateWeeklyReview(bundle: WeeklyDataBundle): Promise<string> {
  const message = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 1024,
    messages: [{ role: "user", content: weeklyReviewPrompt(bundle) }],
  });
  return extractText(message);
}

export async function detectAnomalies(bundle: WeeklyDataBundle): Promise<Anomaly[]> {
  const message = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 1024,
    messages: [{ role: "user", content: anomalyDetectionPrompt(bundle) }],
  });
  const raw = extractText(message);

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  if (!Array.isArray(parsed)) return [];
  // Light shape validation — drop anything obviously malformed
  return parsed.filter((a): a is Anomaly => {
    if (!a || typeof a !== "object") return false;
    const o = a as Record<string, unknown>;
    return (
      typeof o.severity === "string" &&
      typeof o.title === "string" &&
      typeof o.detail === "string" &&
      typeof o.category === "string"
    );
  });
}

export async function generateMondayDigest(
  bundle: WeeklyDataBundle,
  anomalies: Anomaly[]
): Promise<string> {
  const message = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 1024,
    messages: [{ role: "user", content: mondayDigestPrompt(bundle, anomalies) }],
  });
  return extractText(message);
}
