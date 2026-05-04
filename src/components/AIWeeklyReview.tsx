"use client";

import { useEffect, useRef, useState } from "react";

export default function AIWeeklyReview() {
  const [review, setReview] = useState<string | null>(null);
  const [period, setPeriod] = useState<{ start: string; end: string } | null>(null);
  const [cached, setCached] = useState(false);
  const [loading, setLoading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const startedAtRef = useRef<number>(0);

  // Tick the elapsed timer while loading
  useEffect(() => {
    if (!loading) return;
    const id = setInterval(() => {
      setElapsed(Math.round((Date.now() - startedAtRef.current) / 1000));
    }, 250);
    return () => clearInterval(id);
  }, [loading]);

  // Cancel any in-flight request when the component unmounts
  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  async function generate() {
    setLoading(true);
    setError(null);
    setElapsed(0);
    startedAtRef.current = Date.now();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const res = await fetch("/api/ai/weekly-review", {
        method: "POST",
        signal: ctrl.signal,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to generate review");
        return;
      }
      setReview(data.review);
      setPeriod(data.period);
      setCached(Boolean(data.cached));
    } catch (e: any) {
      if (e?.name === "AbortError") {
        setError("Cancelled.");
      } else {
        setError(e?.message || "Network error");
      }
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }

  function cancel() {
    abortRef.current?.abort();
  }

  return (
    <div className="rounded border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-stone-900">Weekly Review</h3>
        <div className="flex gap-2">
          {loading && (
            <button
              onClick={cancel}
              className="rounded border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-100 transition"
            >
              Cancel
            </button>
          )}
          <button
            onClick={generate}
            disabled={loading}
            className="rounded bg-japonesa-red px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-900 transition disabled:opacity-50"
          >
            {loading ? `Generating… ${elapsed}s` : review ? "Regenerate" : "Generate"}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 mb-3">
          {error}
        </div>
      )}

      {review ? (
        <div>
          <div className="flex items-center justify-between mb-2 text-xs text-stone-500">
            {period && <span>Period: {period.start} to {period.end}</span>}
            {cached && (
              <span className="px-1.5 py-0.5 rounded bg-stone-100 text-stone-600 text-[10px] uppercase font-semibold">
                Cached (15min TTL)
              </span>
            )}
          </div>
          <div className="prose prose-sm prose-stone max-w-none whitespace-pre-wrap text-sm text-stone-700 leading-relaxed">
            {review}
          </div>
        </div>
      ) : !loading ? (
        <div className="text-sm text-stone-400">
          Click &quot;Generate&quot; to create an AI-powered weekly operating review based on your data.
        </div>
      ) : (
        <div className="flex items-center gap-2 text-sm text-stone-500">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-stone-300 border-t-japonesa-red" />
          Analyzing your operations data… {elapsed}s elapsed
          {elapsed > 30 && (
            <span className="text-xs text-stone-400">(typical: 15–25s)</span>
          )}
        </div>
      )}
    </div>
  );
}
