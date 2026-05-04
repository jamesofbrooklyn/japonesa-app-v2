"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  parseCSV,
  autoDetectColumns,
  mapRow,
  dateFromFilename,
  type ColumnMapping,
  type ParsedSaleRow,
  type MenuItem,
} from "@/lib/csv-parser";

type Step = "upload" | "preview" | "mapping" | "confirm" | "done";

export default function CSVUploadForm() {
  const router = useRouter();

  // Step state
  const [step, setStep] = useState<Step>("upload");
  const [fileName, setFileName] = useState("");
  const [rawRows, setRawRows] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [colMapping, setColMapping] = useState<ColumnMapping | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [parsedRows, setParsedRows] = useState<ParsedSaleRow[]>([]);
  const [unmatchedItems, setUnmatchedItems] = useState<string[]>([]);
  const [skippedRows, setSkippedRows] = useState(0);
  const [fallbackStart, setFallbackStart] = useState<string>("");
  const [fallbackEnd, setFallbackEnd] = useState<string>("");

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ inserted: number } | null>(null);

  // Drag-and-drop
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    if (!file.name.endsWith(".csv")) {
      setError("Please upload a .csv file");
      return;
    }

    setFileName(file.name);
    const text = await file.text();
    const rows = parseCSV(text);

    if (rows.length < 2) {
      setError("CSV has no data rows");
      return;
    }

    setHeaders(rows[0]);
    setRawRows(rows.slice(1));

    const mapping = autoDetectColumns(rows[0]);
    setColMapping(mapping);

    // If no date column detected, try to derive a fallback range from the filename
    if (mapping && mapping.sold_at < 0) {
      const fromName = dateFromFilename(file.name);
      if (fromName) {
        setFallbackStart(fromName.start);
        setFallbackEnd(fromName.end);
      } else {
        const today = new Intl.DateTimeFormat("en-CA", {
          timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit",
        }).format(new Date());
        setFallbackStart(today);
        setFallbackEnd(today);
      }
    }

    // Fetch menu items for matching
    try {
      const res = await fetch("/api/menu-items");
      if (res.ok) {
        setMenuItems(await res.json());
      }
    } catch {}

    setStep("preview");
  }, []);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function proceedToMapping() {
    if (!colMapping) {
      setError("Could not auto-detect columns. Please map them manually.");
      return;
    }

    // Resolve fallback period for summary CSVs (no per-row date).
    // All rows get tagged at the period start. The end date is informational
    // (used for the period label) — we don't artificially split row totals.
    let fallback: Date | undefined;
    if (colMapping.sold_at < 0) {
      if (!fallbackStart) {
        setError("This CSV has no date column. Please pick the period start.");
        return;
      }
      if (fallbackEnd && fallbackEnd < fallbackStart) {
        setError("Period end must be on or after the start.");
        return;
      }
      fallback = new Date(`${fallbackStart}T20:00:00`);
      if (isNaN(fallback.getTime())) {
        setError("Invalid period dates.");
        return;
      }
    }

    setStep("mapping");

    // Parse all rows
    const matchCache = new Map<string, MenuItem | null>();
    const parsed: ParsedSaleRow[] = [];
    let skipped = 0;
    for (const row of rawRows) {
      const mapped = mapRow(row, colMapping, menuItems, matchCache, fallback);
      if (mapped) parsed.push(mapped);
      else skipped++;
    }
    setParsedRows(parsed);
    setSkippedRows(skipped);

    if (parsed.length === 0) {
      const dateLabel = colMapping.sold_at >= 0
        ? `date column: "${headers[colMapping.sold_at]}"`
        : `period: ${fallbackStart}${fallbackEnd && fallbackEnd !== fallbackStart ? ` → ${fallbackEnd}` : ""}`;
      setError(
        `Could not parse any rows. Check column mapping — ${dateLabel}.`
      );
      return;
    }

    // Find unmatched
    const unmatched = [...new Set(
      parsed.filter((r) => !r.menu_item_id).map((r) => r.pos_item_name)
    )];
    setUnmatchedItems(unmatched);

    if (unmatched.length === 0) {
      setStep("confirm");
    }
  }

  function skipUnmatched() {
    setStep("confirm");
  }

  async function handleUpload() {
    setUploading(true);
    setError(null);
    setProgress(0);

    const BATCH = 2000;
    const rows = parsedRows.map((r) => ({
      sold_at: r.sold_at,
      daypart: r.daypart,
      pos_item_id: r.pos_item_id,
      menu_item_id: r.menu_item_id || undefined,
      qty: r.qty,
      gross_php: r.gross_php,
      discount_php: r.discount_php,
      payment_method: r.payment_method,
      pos_order_id: r.pos_order_id || undefined,
    }));

    let totalInserted = 0;
    const batches = Math.ceil(rows.length / BATCH);

    for (let i = 0; i < batches; i++) {
      const batch = rows.slice(i * BATCH, (i + 1) * BATCH);
      const res = await fetch("/api/sales-ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: fileName, rows: batch }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(typeof data.error === "string" ? data.error : JSON.stringify(data.error));
        setUploading(false);
        return;
      }

      const data = await res.json();
      totalInserted += data.inserted;
      setProgress(Math.round(((i + 1) / batches) * 100));
    }

    setResult({ inserted: totalInserted });
    setUploading(false);
    setStep("done");
    router.refresh();
  }

  // Date range summary
  const dateRange = parsedRows.length > 0
    ? {
        min: parsedRows.reduce((a, b) => a.sold_at < b.sold_at ? a : b).sold_at.slice(0, 10),
        max: parsedRows.reduce((a, b) => a.sold_at > b.sold_at ? a : b).sold_at.slice(0, 10),
      }
    : null;

  const totalRevenue = parsedRows.reduce((a, b) => a + b.gross_php, 0);

  const inputCls =
    "w-full rounded border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-japonesa-red focus:border-transparent";

  return (
    <div className="space-y-6">
      {/* Step 1: Upload */}
      {step === "upload" && (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          className={`border-2 border-dashed rounded-lg p-10 text-center transition ${
            dragOver ? "border-japonesa-red bg-red-50" : "border-stone-300 bg-stone-50"
          }`}
        >
          <div className="text-3xl mb-3">📄</div>
          <div className="text-sm text-stone-700 mb-2">
            Drag and drop your POS CSV export here
          </div>
          <div className="text-xs text-stone-500 mb-4">or</div>
          <label className="inline-block rounded bg-japonesa-red px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-900 transition cursor-pointer">
            Choose file
            <input
              type="file"
              accept=".csv"
              onChange={handleFileInput}
              className="hidden"
            />
          </label>
        </div>
      )}

      {/* Step 2: Preview */}
      {step === "preview" && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-stone-700">
              Preview: {fileName} ({rawRows.length} rows)
            </h3>
            <button
              onClick={() => { setStep("upload"); setRawRows([]); }}
              className="text-xs text-stone-500 hover:text-stone-700"
            >
              Choose different file
            </button>
          </div>

          <div className="overflow-x-auto rounded border border-stone-200 mb-4">
            <table className="w-full text-xs">
              <thead className="bg-stone-100">
                <tr>
                  {headers.map((h, i) => (
                    <th key={i} className="px-2 py-1.5 text-left text-stone-600 font-medium whitespace-nowrap">
                      {h}
                      {colMapping && Object.entries(colMapping).find(([, v]) => v === i) && (
                        <span className="ml-1 text-emerald-600 text-[10px]">
                          ({Object.entries(colMapping).find(([, v]) => v === i)?.[0]})
                        </span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rawRows.slice(0, 5).map((row, i) => (
                  <tr key={i} className="border-t border-stone-100">
                    {row.map((cell, j) => (
                      <td key={j} className="px-2 py-1.5 whitespace-nowrap">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {colMapping ? (
            <div className="rounded border border-stone-200 bg-stone-50 px-3 py-3 text-sm mb-4 space-y-3">
              <div className="text-xs uppercase tracking-wider text-stone-500 font-semibold">
                Column mapping (override if auto-detect is wrong)
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <ColumnSelect
                  label="Date (optional for summary CSVs)"
                  value={colMapping.sold_at}
                  headers={headers}
                  allowNone
                  onChange={(v) => setColMapping({ ...colMapping, sold_at: v })}
                />
                <ColumnSelect
                  label="Item Name"
                  value={colMapping.item_name}
                  headers={headers}
                  onChange={(v) => setColMapping({ ...colMapping, item_name: v })}
                />
                <ColumnSelect
                  label="Qty"
                  value={colMapping.qty}
                  headers={headers}
                  onChange={(v) => setColMapping({ ...colMapping, qty: v })}
                />
                <ColumnSelect
                  label="Amount"
                  value={colMapping.gross}
                  headers={headers}
                  onChange={(v) => setColMapping({ ...colMapping, gross: v })}
                />
              </div>

              {colMapping.sold_at < 0 && (
                <div className="rounded border border-sky-200 bg-sky-50 px-3 py-2.5 text-sm text-sky-900">
                  <div className="font-semibold mb-1">Summary mode — period covered</div>
                  <div className="text-xs mb-2">
                    Pick the date range this CSV covers. Rows will be tagged at the period
                    start; the end date is the period label. Use the same start/end if it&apos;s a single day.
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <label className="flex items-center gap-1 text-xs">
                      <span className="text-stone-600">From</span>
                      <input
                        type="date"
                        value={fallbackStart}
                        onChange={(e) => setFallbackStart(e.target.value)}
                        className="rounded border border-sky-300 bg-white px-2 py-1 text-sm"
                      />
                    </label>
                    <label className="flex items-center gap-1 text-xs">
                      <span className="text-stone-600">to</span>
                      <input
                        type="date"
                        value={fallbackEnd}
                        onChange={(e) => setFallbackEnd(e.target.value)}
                        className="rounded border border-sky-300 bg-white px-2 py-1 text-sm"
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 mb-4">
              Could not auto-detect required columns (Item Name, Qty, Amount).
              Please check your CSV format.
            </div>
          )}

          <button
            onClick={proceedToMapping}
            disabled={!colMapping}
            className="rounded bg-japonesa-red px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-900 transition disabled:opacity-50"
          >
            Continue to matching
          </button>
        </div>
      )}

      {/* Step 3: Unmatched items */}
      {step === "mapping" && unmatchedItems.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-stone-700 mb-2">
            {unmatchedItems.length} POS items could not be matched to menu items
          </h3>
          <div className="text-xs text-stone-500 mb-3">
            These items will be imported with POS item name only (no menu_item link).
            You can match them later or skip for now.
          </div>
          <div className="max-h-60 overflow-y-auto rounded border border-stone-200 mb-4">
            {unmatchedItems.map((name) => (
              <div key={name} className="px-3 py-2 border-b border-stone-100 text-sm flex items-center gap-2">
                <span className="text-amber-600 text-xs">?</span>
                <span>{name}</span>
              </div>
            ))}
          </div>
          <button
            onClick={skipUnmatched}
            className="rounded bg-japonesa-red px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-900 transition"
          >
            Continue anyway ({parsedRows.length} rows ready)
          </button>
        </div>
      )}

      {/* Step 4: Confirm */}
      {step === "confirm" && (
        <div>
          <h3 className="text-sm font-semibold text-stone-700 mb-3">Ready to upload</h3>
          {skippedRows > 0 && (
            <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 mb-3">
              Skipped {skippedRows} row{skippedRows === 1 ? "" : "s"} that could not be parsed (invalid date, missing item, or non-numeric qty/amount).
            </div>
          )}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <div className="rounded border border-stone-200 bg-white p-3">
              <div className="text-[10px] uppercase text-stone-500">Rows</div>
              <div className="text-xl font-semibold">{parsedRows.length.toLocaleString()}</div>
            </div>
            <div className="rounded border border-stone-200 bg-white p-3">
              <div className="text-[10px] uppercase text-stone-500">Date Range</div>
              <div className="text-sm font-semibold">
                {dateRange ? `${dateRange.min} — ${dateRange.max}` : "—"}
              </div>
            </div>
            <div className="rounded border border-stone-200 bg-white p-3">
              <div className="text-[10px] uppercase text-stone-500">Total Revenue</div>
              <div className="text-xl font-semibold">₱{totalRevenue.toLocaleString()}</div>
            </div>
            <div className="rounded border border-stone-200 bg-white p-3">
              <div className="text-[10px] uppercase text-stone-500">Matched</div>
              <div className="text-xl font-semibold">
                {parsedRows.filter((r) => r.menu_item_id).length} / {parsedRows.length}
              </div>
            </div>
          </div>

          <button
            onClick={handleUpload}
            disabled={uploading}
            className="rounded bg-japonesa-red px-6 py-2.5 text-sm font-semibold text-white hover:bg-red-900 transition disabled:opacity-50"
          >
            {uploading ? `Uploading... ${progress}%` : "Upload Sales Data"}
          </button>

          {uploading && (
            <div className="mt-3 h-2 rounded-full bg-stone-200 overflow-hidden">
              <div
                className="h-full bg-japonesa-red transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* Step 5: Done */}
      {step === "done" && result && (
        <div className="rounded border border-emerald-300 bg-emerald-50 p-4">
          <div className="text-sm font-semibold text-emerald-800 mb-1">Upload complete</div>
          <div className="text-sm text-emerald-700">
            {result.inserted.toLocaleString()} sales rows imported from {fileName}.
            Menu Engineering and Pulse pages will now reflect this data.
          </div>
          <button
            onClick={() => {
              setStep("upload");
              setRawRows([]);
              setParsedRows([]);
              setResult(null);
            }}
            className="mt-3 rounded border border-emerald-400 px-3 py-1.5 text-sm text-emerald-800 hover:bg-emerald-100"
          >
            Upload another file
          </button>
        </div>
      )}

      {error && (
        <div className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}
    </div>
  );
}

function ColumnSelect({
  label,
  value,
  headers,
  onChange,
  allowNone,
}: {
  label: string;
  value: number;
  headers: string[];
  onChange: (v: number) => void;
  allowNone?: boolean;
}) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase tracking-wider text-stone-500 mb-1">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded border border-stone-300 px-2 py-1.5 text-xs bg-white"
      >
        {allowNone && <option value={-1}>— none / summary mode —</option>}
        {headers.map((h, i) => (
          <option key={i} value={i}>
            {h}
          </option>
        ))}
      </select>
    </label>
  );
}
