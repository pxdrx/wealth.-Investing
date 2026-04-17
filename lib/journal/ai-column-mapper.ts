// lib/journal/ai-column-mapper.ts
//
// Last-resort column resolver: when the adaptive parser can't identify
// required fields, we hand the headers + a few sample rows to Claude Haiku
// and ask for a strict JSON mapping. Cheap (~$0.0005/call) and only fires
// once per never-before-seen fingerprint — the result is cached as an
// `import_profile` + vocabulary entries for future imports.

import Anthropic from "@anthropic-ai/sdk";

export interface AiMappingSuggestion {
  /** canonical field → raw header string picked from the CSV's header row. */
  mapping: Record<string, string>;
  confidence: "high" | "med" | "low";
  reasoning: string;
}

// Lazy-init mirrors app/api/ai/coach/route.ts — avoids build-time failure
// when ANTHROPIC_API_KEY isn't set (e.g., CI).
let _anthropic: Anthropic | null = null;
function getAnthropic(): Anthropic {
  if (!_anthropic) _anthropic = new Anthropic();
  return _anthropic;
}

const CANONICAL_SCHEMA = [
  "symbol",
  "pnl_usd",
  "opened_at",
  "closed_at",
  "direction",
  "volume",
  "entry_price",
  "exit_price",
  "fees_usd",
  "swap",
  "commission",
  "stop_loss",
  "take_profit",
  "external_id",
] as const;

function buildPrompt(headers: string[], sampleRows: string[][]): string {
  const headersList = headers.map((h, i) => `${i}: "${h}"`).join("\n");
  const sampleBlock = sampleRows
    .slice(0, 5)
    .map((row, i) => `Row ${i + 1}: [${row.map((c) => JSON.stringify(c ?? "")).join(", ")}]`)
    .join("\n");

  return `You are a deterministic data-mapping engine. Map broker CSV columns to a canonical trade schema.

Canonical fields (keys of the output "mapping" object — use these EXACT names):
${CANONICAL_SCHEMA.map((f) => `- ${f}`).join("\n")}

Field semantics:
- symbol: instrument identifier (e.g. "EURUSD", "MNQ", "AAPL").
- pnl_usd: net or gross profit/loss of the trade in account currency; may include commissions depending on broker. A SIGNED number column (positives and negatives).
- opened_at: timestamp when the position was opened. Can also be mapped from a "Bought Timestamp"/"Entry Time" style column.
- closed_at: timestamp when the position was closed. Can be mapped from "Sold Timestamp"/"Exit Time".
- direction: trade side — "Buy"/"Sell", "Long"/"Short", "B"/"S", etc.
- volume: contracts, lots, shares, or quantity — unsigned.
- entry_price / exit_price: price at open / close.
- fees_usd: total trade fees.
- swap: overnight / rollover financing charge.
- commission: broker commission, separate from swap.
- stop_loss / take_profit: price levels for SL/TP (often empty).
- external_id: unique per-trade id (ticket, deal id, position id, order number).

CSV headers (column index: raw header):
${headersList}

Sample data rows (first five):
${sampleBlock}

Rules:
1. Output ONLY strict JSON — no markdown, no explanations outside the JSON.
2. Each key in "mapping" must be a canonical field name from the list above.
3. Each value must be one of the RAW header strings listed (exact match, including casing/punctuation).
4. Omit canonical fields you cannot confidently map — do NOT invent headers.
5. Pick the BEST single column for each field; never reuse the same header for two canonical fields unless semantically correct.
6. Confidence: "high" if you're sure; "med" if some ambiguity; "low" if guessing.

Return shape:
{
  "mapping": { "<canonical_field>": "<raw header>", ... },
  "confidence": "high" | "med" | "low",
  "reasoning": "<1-3 sentences>"
}`;
}

/**
 * Asks Claude Haiku to propose a canonical↔header mapping. Returns `null`
 * on any failure — caller decides what to do (typically: fall back to the
 * parser's best-effort mapping and surface "missing" fields in preview).
 */
export async function suggestColumnMapping(input: {
  headers: string[];
  sampleRows: string[][];
}): Promise<AiMappingSuggestion | null> {
  if (!input?.headers || input.headers.length === 0) return null;

  try {
    const prompt = buildPrompt(input.headers, input.sampleRows ?? []);
    const response = await getAnthropic().messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      temperature: 0,
      messages: [{ role: "user", content: prompt }],
    });

    // Extract the first text block.
    const textBlock = response.content.find((b) => b.type === "text") as
      | { type: "text"; text: string }
      | undefined;
    if (!textBlock?.text) {
      console.warn("[ai-column-mapper] empty response");
      return null;
    }

    const parsed = safeParseJson(textBlock.text);
    if (!parsed || typeof parsed !== "object") {
      console.warn("[ai-column-mapper] non-JSON response:", textBlock.text.slice(0, 200));
      return null;
    }

    const raw = parsed as {
      mapping?: unknown;
      confidence?: unknown;
      reasoning?: unknown;
    };

    const mapping: Record<string, string> = {};
    if (raw.mapping && typeof raw.mapping === "object") {
      const headersSet = new Set(input.headers);
      for (const [k, v] of Object.entries(raw.mapping as Record<string, unknown>)) {
        if (typeof v !== "string") continue;
        if (!headersSet.has(v)) continue;
        if (!(CANONICAL_SCHEMA as readonly string[]).includes(k)) continue;
        mapping[k] = v;
      }
    }

    const confidence: AiMappingSuggestion["confidence"] =
      raw.confidence === "high" || raw.confidence === "med" || raw.confidence === "low"
        ? raw.confidence
        : "low";

    const reasoning =
      typeof raw.reasoning === "string" ? raw.reasoning.slice(0, 600) : "";

    return { mapping, confidence, reasoning };
  } catch (err) {
    const apiErr = err as { status?: number; message?: string };
    console.warn(
      "[ai-column-mapper] Anthropic call failed:",
      apiErr.status ?? "",
      apiErr.message ?? String(err)
    );
    return null;
  }
}

/** Tolerant JSON parser — also handles accidental ```json fenced blocks. */
function safeParseJson(text: string): unknown {
  const trimmed = text.trim();
  // Strip ```json ... ``` fencing if present.
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  const body = fenceMatch ? fenceMatch[1] : trimmed;
  try {
    return JSON.parse(body);
  } catch {
    // Try to extract the first {...} blob.
    const braceMatch = body.match(/\{[\s\S]*\}/);
    if (!braceMatch) return null;
    try {
      return JSON.parse(braceMatch[0]);
    } catch {
      return null;
    }
  }
}
