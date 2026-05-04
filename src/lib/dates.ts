/**
 * Date helpers anchored to Asia/Manila (the restaurant's local time).
 *
 * Vercel servers run in UTC. PH does not observe DST so the offset is a
 * stable +08:00, but `new Date().toISOString().slice(0, 10)` returns the
 * UTC date — at 7am Manila on Tuesday it returns Monday's date. Always
 * compute "today" / "yesterday" / day boundaries in Manila local time.
 */

const MANILA_TZ = "Asia/Manila";

/** Format a Date as YYYY-MM-DD in Manila local time. */
export function formatManilaDate(d: Date = new Date()): string {
  // en-CA locale conveniently yields YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: MANILA_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** Today's date (YYYY-MM-DD) in Manila. */
export function manilaToday(): string {
  return formatManilaDate(new Date());
}

/** Yesterday's date (YYYY-MM-DD) in Manila. */
export function manilaYesterday(): string {
  return formatManilaDate(new Date(Date.now() - 86_400_000));
}

/** N-days-ago date (YYYY-MM-DD) in Manila. */
export function manilaDaysAgo(n: number): string {
  return formatManilaDate(new Date(Date.now() - n * 86_400_000));
}

/** Manila local hour (0-23) for a given Date. */
export function manilaHour(d: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: MANILA_TZ,
    hour: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const hourPart = parts.find((p) => p.type === "hour");
  return hourPart ? parseInt(hourPart.value, 10) : 0;
}

/** Manila local day-of-week (0=Sunday, 6=Saturday). */
export function manilaDayOfWeek(d: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: MANILA_TZ,
    weekday: "short",
  }).formatToParts(d);
  const map: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  const w = parts.find((p) => p.type === "weekday")?.value ?? "Sun";
  return map[w] ?? 0;
}
