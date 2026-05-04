"use client";

import { useEffect, useRef, useState } from "react";

interface Anomaly {
  severity: string;
  title: string;
  detail: string;
  category: string;
}

export default function AIMondayDigest() {
  const [digest, setDigest] = useState<string | null>(null);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [period, setPeriod] = useState<{ start: string; end: string } | null>(null);
  const [cached, setCached] = useState(false);
  const [loading, setLoading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const startedAtRef = useRef<number>(0);

  useEffect(() => {
    if (!loading) return;
    const id = setInterval(() => {
      setElapsed(Math.round((Date.now() - startedAtRef.current) / 1000));
    }, 250);
    return () => clearInterval(id);
  }, [loading]);

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
      const res = await fetch("/api/ai/monday-digest", {
        method: "POST",
        signal: ctrl.signal,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to generate digest");
        return;
      }
      setDigest(data.digest);
      setAnomalies(data.anomalies || []);
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
        <div>
          <h3 className="text-lg font-semibold text-stone-900">Monday Digest</h3>
          <p className="text-xs text-stone-500">
            Full weekly briefing — review + anomalies + action items
          </p>
        </div>
        <div className="flex gap-2 items-center">
          {cached && digest && (
            <span className="px-1.5 py-0.5 rounded bg-stone-100 text-stone-600 text-[10px] uppercase font-semibold">
              Cached
            </span>
          )}
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
            {loading ? `Generating… ${elapsed}s` : digest ? "Regenerate" : "Generate Digest"}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 mb-3">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-2 text-sm text-stone-500 py-8">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-stone-300 border-t-japonesa-red" />
          Generating your Monday briefing… {elapsed}s elapsed
          {elapsed > 45 && (
            <span className="text-xs text-stone-400">(typical: 30–40s for full digest)</span>
          )}
        </div>
      )}

      {digest ? (
        <div>
          {period && (
            <div className="text-xs text-stone-500 mb-3">
              Period: {period.start} to {period.end}
            </div>
          )}

          <div className="prose prose-sm prose-stone max-w-none whitespace-pre-wrap text-sm text-stone-700 leading-relaxed mb-4">
            {digest}
          </div>

          {anomalies.length > 0 && (
            <div className="border-t border-stone-200 pt-3 mt-3">
              <div className="text-xs font-semibold text-stone-500 uppercase mb-2">
                Detected Anomalies ({anomalies.length})
              </div>
              <div className="space-y-1.5">
                {anomalies.map((a, i) => (
                  <div
                    key={i}
                    className={`text-xs px-2 py-1.5 rounded ${
                      a.severity === "high"
                        ? "bg-red-50 text-red-800"
                        : a.severity === "medium"
                        ? "bg-amber-50 text-amber-800"
                        : "bg-sky-50 text-sky-800"
                    }`}
                  >
                    <span className="font-semibold">{a.title}</span>
                    <span className="text-stone-500"> — {a.detail}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : !loading ? (
        <div className="text-sm text-stone-400 py-4">
          Click &quot;Generate Digest&quot; to create your Monday morning briefing. This combines
          a weekly review, anomaly detection, and actionable recommendations.
        </div>
      ) : null}
    </div>
  );
}
