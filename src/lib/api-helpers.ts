/**
 * Shared helpers for API routes:
 *   - apiError: standardized error responses (no DB.error.message leakage)
 *   - logError: structured server-side logging with a request id
 *   - rateLimit: per-user in-memory token bucket
 *   - sanitizeCsvField: strip CSV-injection prefixes (`=`, `+`, `-`, `@`)
 *
 * Rate limits and the AI cache are intentionally in-memory + DB respectively;
 * this is fine for a single-tenant low-traffic dashboard. If we ever need
 * multi-instance deploys we'll move to Upstash or a `api_rate_limits` table.
 */
import { NextResponse } from "next/server";
import type { ZodError } from "zod";

// ---- Error responses ----

/**
 * Standardized API error. Logs the underlying cause server-side (with a request id)
 * and returns a generic message + the request id so the client can quote it in support.
 *
 * NEVER pass raw DB error messages, Zod issues, or stack traces directly to the client.
 */
export function apiError(opts: {
  /** HTTP status. */
  status: number;
  /** Public-facing message. Should not contain internals. */
  message: string;
  /** What to log server-side (DB error, Zod issues, exception, etc.). */
  cause?: unknown;
  /** Optional context tag for the log line. */
  tag?: string;
}): NextResponse {
  const requestId = newRequestId();
  if (opts.cause !== undefined) {
    logError(opts.tag ?? "api", opts.cause, { requestId, status: opts.status });
  }
  return NextResponse.json(
    { error: opts.message, request_id: requestId },
    { status: opts.status }
  );
}

/**
 * Convenience for Zod validation failures. Returns a generic 400 with a
 * compact list of issue paths the client can surface to users; the full
 * issue list is logged server-side.
 */
export function apiValidationError(error: ZodError, tag = "validation"): NextResponse {
  const requestId = newRequestId();
  logError(tag, error.issues, { requestId });
  // Surface field paths only — never values, which can leak PII back via logs.
  const fields = error.issues.map((i) => i.path.join(".")).filter(Boolean);
  return NextResponse.json(
    {
      error: "Validation failed",
      fields: fields.length > 0 ? fields : undefined,
      request_id: requestId,
    },
    { status: 400 }
  );
}

/**
 * Server-side structured logger. On Vercel this writes to the Functions log;
 * locally to stderr. Request ids tie a log line to a client error response.
 */
export function logError(
  tag: string,
  cause: unknown,
  meta: Record<string, unknown> = {}
): void {
  const payload = {
    level: "error",
    tag,
    ts: new Date().toISOString(),
    ...meta,
    cause: serializeCause(cause),
  };
  // eslint-disable-next-line no-console -- intentional, this is the logging path
  console.error(JSON.stringify(payload));
}

function serializeCause(cause: unknown): unknown {
  if (cause instanceof Error) {
    return { name: cause.name, message: cause.message, stack: cause.stack };
  }
  return cause;
}

function newRequestId(): string {
  // 8 random hex chars — enough for a low-traffic tool
  return Math.random().toString(16).slice(2, 10);
}

// ---- Rate limiting ----

interface RateBucket {
  /** Timestamps of recent calls, oldest-first. */
  timestamps: number[];
}

/**
 * Module-scoped buckets. Each Vercel instance has its own; on cold-start a user
 * gets a "free" call. Acceptable for a single-tenant internal tool.
 */
const buckets = new Map<string, RateBucket>();

/**
 * Returns null if the call is allowed, or a NextResponse 429 if rate limited.
 * Use as: `const limited = rateLimit(...); if (limited) return limited;`
 */
export function rateLimit(opts: {
  userId: string;
  /** Distinguish endpoints so /ai/anomalies and /ai/weekly-review have separate quotas. */
  endpoint: string;
  /** Max calls allowed in the window. */
  maxCalls: number;
  /** Window length in milliseconds. */
  windowMs: number;
}): NextResponse | null {
  const key = `${opts.userId}:${opts.endpoint}`;
  const now = Date.now();
  const cutoff = now - opts.windowMs;

  const bucket = buckets.get(key) ?? { timestamps: [] };
  // Drop expired timestamps
  bucket.timestamps = bucket.timestamps.filter((t) => t > cutoff);

  if (bucket.timestamps.length >= opts.maxCalls) {
    const oldest = bucket.timestamps[0];
    const retryAfterMs = oldest + opts.windowMs - now;
    const retryAfterSec = Math.max(1, Math.ceil(retryAfterMs / 1000));
    return NextResponse.json(
      {
        error: `Too many requests. Try again in ${retryAfterSec}s.`,
        retry_after_seconds: retryAfterSec,
      },
      { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
    );
  }

  bucket.timestamps.push(now);
  buckets.set(key, bucket);
  return null;
}

// ---- CSV injection guard ----

/**
 * Strip leading characters that Excel/Sheets/Numbers interpret as formulas.
 * Apply to any user-supplied string that may later be re-exported to CSV.
 *
 * E.g. `=cmd|'/c calc'!A1` becomes `cmd|'/c calc'!A1`.
 */
export function sanitizeCsvField(s: string | null | undefined): string {
  if (s == null) return "";
  return s.replace(/^[=+\-@\t\r]+/, "").trim();
}
