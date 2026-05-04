/**
 * CSV parsing and POS data mapping for OneClickTech exports.
 */

export interface ParsedSaleRow {
  sold_at: string;
  daypart: "lunch" | "dinner" | "late_night";
  pos_item_id: string;
  pos_item_name: string;
  menu_item_id?: string;
  qty: number;
  gross_php: number;
  discount_php: number;
  payment_method: string;
  pos_order_id: string;
}

export interface MenuItem {
  id: string;
  name: string;
  sku: string;
  pos_id: string | null;
  category: string;
  price_php: number;
}

/**
 * Parse CSV text into a 2D string array.
 * Handles quoted fields with commas and newlines.
 */
export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let current: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        current.push(field.trim());
        field = "";
      } else if (ch === "\n" || (ch === "\r" && next === "\n")) {
        current.push(field.trim());
        if (current.some((c) => c !== "")) rows.push(current);
        current = [];
        field = "";
        if (ch === "\r") i++;
      } else {
        field += ch;
      }
    }
  }

  // Last field
  current.push(field.trim());
  if (current.some((c) => c !== "")) rows.push(current);

  return rows;
}

/**
 * Auto-detect which column index maps to which field.
 * Returns a mapping or null if required fields are missing.
 */
export interface ColumnMapping {
  /** -1 means no per-row date column; caller supplies a fallback date */
  sold_at: number;
  item_name: number;
  qty: number;
  gross: number;
  discount: number | null;
  payment: number | null;
  order_id: number | null;
}

const FIELD_PATTERNS: Record<keyof ColumnMapping, RegExp[]> = {
  // Order matters within array; check ID-like patterns before date patterns
  order_id: [/order.*(id|num|#)/i, /receipt.*(id|num|#)/i, /transaction.*(id|num|#)/i, /invoice.*(id|num|#)/i, /^ref$/i, /^order$/i, /^receipt$/i, /^invoice$/i],
  sold_at: [/sold.*at/i, /sold.*on/i, /^date$/i, /date.*time/i, /timestamp/i, /^time$/i, /transaction.*date/i, /receipt.*date/i, /sale.*date/i, /closed.*at/i, /paid.*at/i],
  item_name: [/item.*name/i, /product.*name/i, /menu.*item/i, /^item$/i, /^product$/i, /^name$/i, /description/i],
  qty: [/items.*sold/i, /^qty$/i, /quantity/i, /units.*sold/i, /^units$/i, /^count$/i],
  // Prefer "Item Net Sales" or "Total Sales" over "Total Sales Returned"; reject "returned/refund/void"
  gross: [/item.*net.*sales/i, /net.*sales/i, /^total.*sales$/i, /gross.*sales/i, /sales.*total/i, /^gross$/i, /total.*amount/i, /^total$/i, /^amount$/i, /^revenue$/i, /^price$/i, /subtotal/i],
  discount: [/^total.*discount$/i, /^discount$/i, /^disc$/i],
  payment: [/payment.*(method|type)/i, /tender/i, /^method$/i, /^type$/i],
};

const REJECT_PATTERNS: Partial<Record<keyof ColumnMapping, RegExp[]>> = {
  gross: [/return/i, /refund/i, /void/i, /tax/i],
  qty: [/return/i, /refund/i, /void/i],
};

// Fields are detected in this order so ID-like columns claim "transaction id" before
// the date detector can mistake it for "transaction date".
const DETECT_ORDER: (keyof ColumnMapping)[] = [
  "order_id",
  "sold_at",
  "item_name",
  "qty",
  "gross",
  "discount",
  "payment",
];

export function autoDetectColumns(headers: string[]): ColumnMapping | null {
  const mapping: Partial<ColumnMapping> = {};
  const claimed = new Set<number>();

  for (const field of DETECT_ORDER) {
    const patterns = FIELD_PATTERNS[field];
    const rejects = REJECT_PATTERNS[field] ?? [];
    // Try each pattern in order; first matching unclaimed column that doesn't hit a reject wins
    outer: for (const p of patterns) {
      for (let i = 0; i < headers.length; i++) {
        if (claimed.has(i)) continue;
        if (rejects.some((r) => r.test(headers[i]))) continue;
        if (p.test(headers[i])) {
          (mapping as any)[field] = i;
          claimed.add(i);
          break outer;
        }
      }
    }
  }

  // sold_at is optional now (summary CSVs use a fallback date); item_name/qty/gross are required
  if (mapping.item_name == null || mapping.qty == null || mapping.gross == null) {
    return null;
  }

  return {
    sold_at: mapping.sold_at ?? -1,
    item_name: mapping.item_name,
    qty: mapping.qty,
    gross: mapping.gross,
    discount: mapping.discount ?? null,
    payment: mapping.payment ?? null,
    order_id: mapping.order_id ?? null,
  };
}

/**
 * Try to extract a date range from a filename like
 * "Sales by Product_2026-02-01-2026-02-28 (1).csv".
 */
export function dateFromFilename(filename: string): {
  start: string;
  end: string;
} | null {
  // Look for two ISO dates joined by separator
  const m = filename.match(
    /(\d{4}-\d{2}-\d{2})[_\- ]+(\d{4}-\d{2}-\d{2})/
  );
  if (m) {
    return { start: m[1], end: m[2] };
  }
  // Single ISO date
  const single = filename.match(/(\d{4}-\d{2}-\d{2})/);
  if (single) {
    return { start: single[1], end: single[1] };
  }
  return null;
}


/**
 * Parse a date string from common POS export formats. Returns null if unparseable.
 * Tries: ISO, MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD HH:mm, with optional time component.
 */
export function parseSafeDate(input: string): Date | null {
  if (!input) return null;
  const s = input.trim();

  // Try native parser first (handles ISO and most US-style)
  const native = new Date(s);
  if (!isNaN(native.getTime())) return native;

  // Try DD/MM/YYYY or DD-MM-YYYY (with optional time)
  const m = s.match(
    /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/
  );
  if (m) {
    const [, a, b, y, hh, mm, ss] = m;
    const year = y.length === 2 ? 2000 + Number(y) : Number(y);
    // Heuristic: if first part > 12, must be DD/MM; else assume DD/MM (PH convention)
    const day = Number(a);
    const month = Number(b);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const d = new Date(
        year,
        month - 1,
        day,
        Number(hh ?? 0),
        Number(mm ?? 0),
        Number(ss ?? 0)
      );
      if (!isNaN(d.getTime())) return d;
    }
  }

  return null;
}

/**
 * Infer daypart from a datetime string.
 */
export function inferDaypart(soldAt: string): "lunch" | "dinner" | "late_night" {
  const d = parseSafeDate(soldAt) ?? new Date();
  // Server runs UTC on Vercel; restaurant operates in Manila. Use Manila local hour.
  const hourPart = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    hour: "2-digit",
    hour12: false,
  })
    .formatToParts(d)
    .find((p) => p.type === "hour");
  const hour = hourPart ? parseInt(hourPart.value, 10) : 0;
  // Japonesa is dinner-only; service starts ~17:00. Sales recorded earlier than
  // that are typically staff meals, prep tastings, or POS adjustments — count
  // them as dinner so they don't pollute a separate "lunch" daypart that
  // doesn't exist as a service. Late night kicks in after 22:00.
  if (hour >= 22 || hour < 5) return "late_night";
  return "dinner";
}

/**
 * Match a POS item name to a menu item using fuzzy matching.
 */
export function matchMenuItem(
  posName: string,
  menuItems: MenuItem[]
): MenuItem | null {
  const normalized = posName.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();

  // Exact match on pos_id
  const byPosId = menuItems.find(
    (mi) => mi.pos_id && mi.pos_id.toLowerCase() === normalized
  );
  if (byPosId) return byPosId;

  // Exact match on name
  const byName = menuItems.find(
    (mi) => mi.name.toLowerCase() === normalized
  );
  if (byName) return byName;

  // Contains match
  const byContains = menuItems.find(
    (mi) => normalized.includes(mi.name.toLowerCase()) ||
            mi.name.toLowerCase().includes(normalized)
  );
  if (byContains) return byContains;

  // Word overlap scoring
  const posWords = new Set(normalized.split(/\s+/).filter((w) => w.length > 2));
  let bestScore = 0;
  let bestMatch: MenuItem | null = null;

  for (const mi of menuItems) {
    const miWords = new Set(
      mi.name.toLowerCase().replace(/[^a-z0-9 ]/g, "").split(/\s+/).filter((w) => w.length > 2)
    );
    let overlap = 0;
    for (const w of posWords) {
      if (miWords.has(w)) overlap++;
    }
    const score = overlap / Math.max(posWords.size, miWords.size);
    if (score > bestScore && score >= 0.5) {
      bestScore = score;
      bestMatch = mi;
    }
  }

  return bestMatch;
}

/**
 * Map a CSV row to a ParsedSaleRow using column mapping.
 */
export function mapRow(
  row: string[],
  mapping: ColumnMapping,
  menuItems: MenuItem[],
  matchCache: Map<string, MenuItem | null>,
  fallbackDate?: Date
): ParsedSaleRow | null {
  const itemName = row[mapping.item_name];
  // Strip thousands separators before parsing
  const qtyRaw = (row[mapping.qty] || "").replace(/,/g, "");
  const grossRaw = (row[mapping.gross] || "").replace(/,/g, "");
  const qty = Math.round(parseFloat(qtyRaw));
  const gross = parseFloat(grossRaw);

  if (!itemName || isNaN(qty) || qty <= 0 || isNaN(gross)) return null;

  // Resolve date — either per-row or fallback
  let soldAtDate: Date | null = null;
  if (mapping.sold_at >= 0) {
    const soldAtRaw = row[mapping.sold_at];
    if (!soldAtRaw) return null;
    soldAtDate = parseSafeDate(soldAtRaw);
  } else if (fallbackDate) {
    soldAtDate = fallbackDate;
  }
  if (!soldAtDate) return null;

  // Cache menu item matches
  if (!matchCache.has(itemName)) {
    matchCache.set(itemName, matchMenuItem(itemName, menuItems));
  }
  const matched = matchCache.get(itemName);

  const discount = mapping.discount != null
    ? parseFloat((row[mapping.discount] || "").replace(/,/g, "")) || 0
    : 0;
  const payment = mapping.payment != null
    ? (row[mapping.payment] || "").toLowerCase()
    : "";
  const orderId = mapping.order_id != null
    ? row[mapping.order_id] || ""
    : "";

  // Normalize payment method
  let paymentMethod = "cash";
  if (/card|credit|debit|visa|master/i.test(payment)) paymentMethod = "card";
  else if (/gcash/i.test(payment)) paymentMethod = "gcash";
  else if (/maya|paymaya/i.test(payment)) paymentMethod = "maya";
  else if (/bank|transfer/i.test(payment)) paymentMethod = "bank_transfer";

  return {
    sold_at: soldAtDate.toISOString(),
    daypart: inferDaypart(soldAtDate.toISOString()),
    pos_item_id: itemName,
    pos_item_name: itemName,
    menu_item_id: matched?.id,
    qty: Math.abs(qty),
    gross_php: Math.abs(gross),
    discount_php: Math.abs(discount),
    payment_method: paymentMethod,
    pos_order_id: orderId,
  };
}
