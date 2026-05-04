/**
 * Prompt templates for Claude AI analysis of restaurant operations.
 */
import type { WeeklyDataBundle } from "./ai-data-collector";

function formatPHP(n: number): string {
  return `₱${Math.round(n).toLocaleString()}`;
}

function formatPct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function bundleSummary(data: WeeklyDataBundle): string {
  const { period, daily_closes, pnl_summary, top_sellers, worst_sellers, waste, inventory_alerts, active_pos, staff_count, staff_monthly_loaded } = data;

  let text = `## Operating Data: ${period.start} to ${period.end}\n\n`;

  // Daily closes
  text += `### Daily Close Summary\n`;
  if (daily_closes.length === 0) {
    text += `No daily close entries this period.\n\n`;
  } else {
    for (const dc of daily_closes) {
      text += `- ${dc.date}: Revenue ${formatPHP(dc.revenue)}, ${dc.covers} covers`;
      if (dc.cash_variance !== 0) text += `, cash variance ${formatPHP(dc.cash_variance)}`;
      if (dc.notes) text += ` — "${dc.notes}"`;
      text += `\n`;
    }
    text += `\n`;
  }

  // P&L
  text += `### P&L Summary (7-day)\n`;
  text += `- Revenue: ${formatPHP(pnl_summary.revenue)}\n`;
  text += `- COGS: ${formatPHP(pnl_summary.cogs)} (${formatPct(pnl_summary.food_cost_pct)})\n`;
  text += `- Labor: ${formatPHP(pnl_summary.labor)} (${formatPct(pnl_summary.labor_cost_pct)})\n`;
  text += `- Prime Cost: ${formatPct(pnl_summary.prime_cost_pct)} (target ≤62%)\n`;
  text += `- Rent: ${formatPHP(pnl_summary.rent)}\n`;
  text += `- Utilities: ${formatPHP(pnl_summary.utilities)}\n`;
  text += `- Marketing: ${formatPHP(pnl_summary.marketing)}\n`;
  text += `- Other OpEx: ${formatPHP(pnl_summary.other)}\n\n`;

  // Sales
  if (top_sellers.length > 0) {
    text += `### Top Sellers\n`;
    for (const s of top_sellers) {
      text += `- ${s.name}: ${s.qty} sold, ${formatPHP(s.revenue)}\n`;
    }
    text += `\n`;
  }

  if (worst_sellers.length > 0) {
    text += `### Lowest Sellers\n`;
    for (const s of worst_sellers) {
      text += `- ${s.name}: ${s.qty} sold, ${formatPHP(s.revenue)}\n`;
    }
    text += `\n`;
  }

  // Waste
  if (waste.length > 0) {
    text += `### Waste Log\n`;
    for (const w of waste) {
      text += `- ${w.date}: ${w.item} ×${w.qty} (${w.reason})\n`;
    }
    text += `\n`;
  }

  // Inventory
  if (inventory_alerts.length > 0) {
    text += `### Low Inventory Alerts\n`;
    for (const i of inventory_alerts) {
      text += `- ${i.item}: ${i.qty_on_hand} ${i.unit} remaining\n`;
    }
    text += `\n`;
  }

  // POs
  if (active_pos.length > 0) {
    text += `### Active Purchase Orders\n`;
    for (const po of active_pos) {
      text += `- ${po.po_number} from ${po.supplier}: ${po.status}, ${formatPHP(po.total)}\n`;
    }
    text += `\n`;
  }

  // Staff
  text += `### Staffing\n`;
  text += `- Active headcount: ${staff_count}\n`;
  text += `- Monthly loaded payroll: ${formatPHP(staff_monthly_loaded)}\n`;

  return text;
}

const PH_CONTEXT = `**Local context (Philippines):**
- Currency: PHP (₱). Always use ₱ symbol, never $.
- Menu prices are quoted VAT-INCLUSIVE. The "revenue" figures in this data are
  NET of 12% VAT and the 10% service charge — i.e. the "net base revenue" the
  restaurant actually books as income. Do NOT add VAT or SC reasoning on top.
- Service charge is 10% added on top of the menu subtotal and distributed to
  staff per Republic Act 11360 (~85% to staff, ~15% to employer for breakage).
- Labor load includes SSS, PhilHealth, Pag-IBIG, 13th-month, holiday & SIL
  accruals. Regular F&B staff carry a ~27% load on top of base pay; probationary
  and contractual staff carry ~10%. The "loaded payroll" figures here already
  apply this.
- Service is dinner-only (no lunch). Late-night = 22:00 onward.
- Restaurant operates in Asia/Manila timezone (UTC+8, no DST).
`;

export function weeklyReviewPrompt(data: WeeklyDataBundle): string {
  return `You are an experienced restaurant operations consultant analyzing data for Japonesa, a 56-seat Japanese restaurant in Poblacion, Makati, Manila. The restaurant is part of a multi-concept group (Japonesa, Alamat, Tryst) run by the same owner.

Your audience is the owner — an experienced restaurateur who wants concise, actionable insight, not generic advice.

${PH_CONTEXT}

Targets:
- Food cost: 28–32% of net revenue
- Labor cost: 26–30% of net revenue
- Prime cost: 58–62% (watch <58% as under-investment, >62% as overspend)
- Cash variance: ≤₱1,000/day; weekly cumulative ≤₱2,500

Write a weekly operating review in narrative form. Cover:
1. Revenue performance and trend (vs prior week if data available)
2. Cost control — food cost %, labor cost %, prime cost % vs targets
3. Menu performance highlights (stars vs dogs)
4. Waste patterns and any concerns
5. Cash handling observations
6. 2-3 specific, actionable recommendations for next week

Keep it under 500 words. Use ₱ throughout. Be direct — flag problems clearly.

${bundleSummary(data)}`;
}

export function anomalyDetectionPrompt(data: WeeklyDataBundle): string {
  // Compute weekly cash variance for the prompt to evaluate
  const weeklyCashVariance = data.daily_closes.reduce(
    (a, c) => a + Math.abs(c.cash_variance),
    0
  );

  return `You are a restaurant operations anomaly detector for Japonesa, a 56-seat Japanese restaurant in Poblacion, Makati, Manila.

${PH_CONTEXT}

Analyze the following data and return a JSON array of anomalies. Each anomaly should have:
- "severity": "high" | "medium" | "low"
- "title": short headline (under 60 chars)
- "detail": 1-2 sentence explanation with specific numbers in ₱
- "category": "cost" | "revenue" | "cash" | "waste" | "inventory" | "labor" | "menu"

Rules for flagging (revenue figures are NET of VAT and SC):
- Food cost >34% of net revenue: high severity
- Food cost 32-34%: medium severity
- Labor cost >30% of net revenue: medium severity
- Labor cost <22% with revenue >0: low severity (likely under-staffed or under-loaded payroll)
- Prime cost >62%: high; 58-62%: medium (target band)
- Cash variance >₱1,000 on any single day: high severity
- Cash variance >₱500 on any single day: medium severity
- Weekly cumulative |cash variance| > ₱2,500 even if no single day breaches: high (systematic leak)
- Revenue dropping >15% WoW: high severity
- Waste of expensive items (otoro, hamachi, A5 wagyu, sake): medium severity
- Low inventory on critical items: low severity
- Any GM notes mentioning problems / 86'd / equipment / staff issues: medium severity

Weekly cumulative |cash variance| this period: ₱${weeklyCashVariance.toLocaleString()}.

Return ONLY valid JSON — no markdown, no explanation. Return an empty array if no anomalies.

${bundleSummary(data)}`;
}

export function mondayDigestPrompt(
  data: WeeklyDataBundle,
  anomalies: Array<{ severity: string; title: string; detail: string; category: string }>
): string {
  const anomalyText = anomalies.length > 0
    ? anomalies.map((a) => `- [${a.severity.toUpperCase()}] ${a.title}: ${a.detail}`).join("\n")
    : "No anomalies detected.";

  return `You are the AI operations assistant for Japonesa, a 56-seat Japanese restaurant in Poblacion, Makati. Write the Monday morning briefing for the owner.

${PH_CONTEXT}

Structure:
1. **Week in Review** — 3-4 sentence executive summary of last week
2. **By the Numbers** — key metrics in a compact list (revenue, covers, avg check, food cost %, labor cost %, prime cost %)
3. **Flags & Alerts** — summarize these detected anomalies:\n${anomalyText}
4. **This Week's Focus** — 3 concrete priorities for the upcoming week based on the data
5. **Menu Action Items** — any items to consider 86'ing, repricing, or promoting

Keep it under 400 words. Tone: professional but conversational — like a sharp GM briefing the owner over coffee. Use ₱ for all currency.

${bundleSummary(data)}`;
}
