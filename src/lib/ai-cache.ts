/**
 * AI response cache backed by `ai_response_cache` (migration 0005).
 *
 * Why DB-backed: Vercel's serverless functions cold-start often, so an
 * in-memory cache would miss most of the time. A DB row + 15min TTL is enough
 * to debounce a frantic owner clicking "Generate" repeatedly, and it survives
 * deploys.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export type AiEndpoint = "weekly-review" | "anomalies" | "monday-digest";

export const AI_CACHE_TTL_MS = 15 * 60 * 1000;

interface CacheKeyParts {
  endpoint: AiEndpoint;
  periodStart: string; // YYYY-MM-DD
  periodEnd: string;   // YYYY-MM-DD
  concept: string;
}

function buildCacheKey(p: CacheKeyParts): string {
  return `${p.endpoint}:${p.periodStart}:${p.periodEnd}:${p.concept}`;
}

/**
 * Look up a fresh cached response. Returns null if missing or stale.
 */
export async function getCachedAiResponse<T = unknown>(
  sb: SupabaseClient,
  parts: CacheKeyParts
): Promise<{ response: T; generated_at: string } | null> {
  const cacheKey = buildCacheKey(parts);
  const { data } = await sb
    .from("ai_response_cache")
    .select("response_json, generated_at")
    .eq("cache_key", cacheKey)
    .maybeSingle();

  if (!data) return null;

  const age = Date.now() - new Date(data.generated_at).getTime();
  if (age > AI_CACHE_TTL_MS) return null;

  return {
    response: data.response_json as T,
    generated_at: data.generated_at,
  };
}

/**
 * Persist a response. Upserts on cache_key so repeated generations during
 * the TTL window overwrite (fine — we only cache the *latest* fresh response).
 */
export async function setCachedAiResponse(
  sb: SupabaseClient,
  parts: CacheKeyParts,
  response: unknown,
  generatedBy: string
): Promise<void> {
  const cacheKey = buildCacheKey(parts);
  await sb
    .from("ai_response_cache")
    .upsert(
      {
        cache_key: cacheKey,
        endpoint: parts.endpoint,
        period_start: parts.periodStart,
        period_end: parts.periodEnd,
        concept: parts.concept,
        response_json: response as object,
        generated_by: generatedBy,
        generated_at: new Date().toISOString(),
      },
      { onConflict: "cache_key" }
    );
}
