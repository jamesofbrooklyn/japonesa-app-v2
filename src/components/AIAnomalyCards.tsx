"use client";

import { useEffect, useRef, useState } from "react";

interface Anomaly {
  severity: "high" | "medium" | "low";
  title: string;
  detail: string;
  category: string;
}

const SEVERITY_STYLES: Record<string, string> = {
  high: "border-red-300 bg-red-50",
  medium: "border-amber-300 bg-amber-50",
  low: "border-sky-300 bg-sky-50",
};

const CATEGORY_BADGES: Record<string, string> = {
  cost: "bg-red-100 text-red-700",
  revenue: "bg-emerald-100 text-emerald-700",
  cash: "bg-amber-100 text-amber-700",
  waste: "bg-orange-100 text-orange-700",
  inventory: "bg-sky-100 text-sky-700",
  labor: "bg-violet-100 text-violet-700",
  menu: "bg-pink-100 text-pink-700",
};

export default function AIAnomalyCards() {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [cached, setCached] = useState(false);
  const [loading, setLoading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [generated, setGenerated] = useState(false);
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

  async function detect() {
    setLoading(true);
    setError(null);
    setElapsed(0);
    startedAtRef.current = Date.now();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const res = await fetch("/api/ai/anomalies", {
        method: "POST",
        signal: ctrl.signal,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to detect anomalies");
        return;
      }
      setAnomalies(data.anomalies);
      setCached(Boolean(data.cached));
      setGenerated(true);
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
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-stone-900">AI Anomaly Detection</h2>
        <div className="flex gap-2 items-center">
          {cached && generated && (
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
            onClick={detect}
            disabled={loading}
            className="rounded bg-japonesa-red px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-900 transition disabled:opacity-50"
          >
            {loading ? `Scanning… ${elapsed}s` : generated ? "Rescan" : "Scan for Anomalies"}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 mb-3">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-2 text-sm text-stone-500 py-4">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-stone-300 border-t-japonesa-red" />
          Running anomaly detection across your data… {elapsed}s elapsed
        </div>
      )}

      {generated && !loading && anomalies.length === 0 && (
        <div className="rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          All clear — no anomalies detected this week.
        </div>
      )}

      {anomalies.length > 0 && (
        <div className="space-y-2">
          {anomalies.map((a, i) => (
            <div
              key={i}
              className={`rounded border p-3 shadow-sm ${SEVERITY_STYLES[a.severity] || "border-stone-200 bg-white"}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="text-sm font-semibold text-stone-900">{a.title}</div>
                <div className="flex gap-1 shrink-0">
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-semibold ${
                      CATEGORY_BADGES[a.category] || "bg-stone-100 text-stone-600"
                    }`}
                  >
                    {a.category}
                  </span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-semibold ${
                      a.severity === "high"
                        ? "bg-red-200 text-red-800"
                        : a.severity === "medium"
                        ? "bg-amber-200 text-amber-800"
                        : "bg-sky-200 text-sky-800"
                    }`}
                  >
                    {a.severity}
                  </span>
                </div>
              </div>
              <div className="text-xs text-stone-600 mt-1">{a.detail}</div>
            </div>
          ))}
        </div>
      )}

      {!generated && !loading && (
        <div className="text-sm text-stone-400">
          Click &quot;Scan for Anomalies&quot; to have AI analyze your operations data for red flags.
        </div>
      )}
    </div>
  );
}
