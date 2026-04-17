import { NextResponse } from "next/server";
import { createSupabaseClientForUser } from "@/lib/supabase/server";
import { parseMt5Xlsx } from "@/lib/mt5-parser";
import { parseMt5Html } from "@/lib/mt5-html-parser";
import { inferCategory } from "@/lib/trading/category";
import { checkAndDeactivateIfDdBreached } from "@/lib/dd-check";
import { validateAccountOwnership } from "@/lib/account-validation";
import { computeFingerprint } from "@/lib/csv-fingerprint";
import {
  getProfileByFingerprint,
  upsertProfile,
  markProfileValidated,
  recordProfileUsage,
  type ImportProfile,
} from "@/lib/journal/import-profiles";
import { getCachedVocabulary, recordAliases } from "@/lib/journal/alias-vocabulary";
import { suggestColumnMapping, type AiMappingSuggestion } from "@/lib/journal/ai-column-mapper";

export const runtime = "nodejs";
export const maxDuration = 300;

interface SkippedDetail {
  line: number;
  reason: string;
  data: string;
  code?: string;
  hint?: string;
  details?: string;
}

interface DuplicateDetail {
  symbol: string;
  direction: string;
  date: string;
}

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB

/** Splits a CSV line using the same quote-aware rules as the adaptive parser. */
function splitCsvLineLocal(line: string, delim: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cur += ch;
      }
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === delim) {
        out.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

/**
 * Extracts up to 5 data rows from the CSV buffer AFTER the header row, using
 * the already-detected separator. Used to feed Claude Haiku when the adaptive
 * parser couldn't resolve required fields. Best-effort — returns [] on failure.
 */
function extractSampleRowsFromBuffer(
  buffer: ArrayBuffer | Buffer,
  separator: string,
  headers: string[]
): string[][] {
  const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  const text = buf.toString("utf-8").replace(/^\ufeff/, "");
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (!separator || lines.length < 2 || headers.length === 0) return [];

  // Find header row: first line that splits into >= headers.length cells and
  // has a first cell matching headers[0].
  let headerIdx = -1;
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const cells = splitCsvLineLocal(lines[i], separator);
    if (cells.length >= headers.length && cells[0] === headers[0]) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx < 0) return [];

  const out: string[][] = [];
  for (let i = headerIdx + 1; i < lines.length && out.length < 5; i++) {
    const cells = splitCsvLineLocal(lines[i], separator);
    if (cells.filter((c) => c).length < Math.max(1, Math.floor(headers.length * 0.5))) continue;
    out.push(cells);
  }
  return out;
}

/** Flattens `{ canonical: { header, confidence } }` to `{ canonical: header }`. */
function toSimpleMapping(
  m: Record<string, { header: string; confidence: string }> | null
): Record<string, string> {
  if (!m) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(m)) {
    if (v?.header) out[k] = v.header;
  }
  return out;
}

/** Parses the optional `columnMapping` form field — accepts JSON string or null. */
function parseColumnMappingParam(raw: FormDataEntryValue | null): Record<string, string> | null {
  if (typeof raw !== "string" || raw.length === 0) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
        if (typeof v === "string") out[k] = v;
      }
      return Object.keys(out).length > 0 ? out : null;
    }
  } catch {
    return null;
  }
  return null;
}

export async function POST(request: Request) {
  const start = Date.now();
  const url = new URL(request.url);

  // H2: Reject oversized uploads before processing
  const contentLength = request.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { ok: false, error: "File too large. Maximum size is 10MB." },
      { status: 413 }
    );
  }

  const auth = request.headers.get("Authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let userId: string;
  let accountId: string;
  let isPropAccount: boolean;
  let personalAccountId: string | null = null;
  let firmName = "";

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const accountIdParam = formData.get("accountId") as string | null;
    const previewFlag = formData.get("preview");
    const isPreview =
      url.searchParams.get("preview") === "true" ||
      previewFlag === "true" ||
      previewFlag === "1";
    const columnMappingParam = formData.get("columnMapping");
    const profileIdParam = formData.get("profileId");
    const columnMappingOverride = parseColumnMappingParam(columnMappingParam);
    const profileIdOverride =
      typeof profileIdParam === "string" && profileIdParam.length > 0 ? profileIdParam : null;

    if (!file) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }
    if (!accountIdParam) {
      return NextResponse.json({ error: "Missing accountId" }, { status: 400 });
    }
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(accountIdParam)) {
      return NextResponse.json({ error: "Invalid accountId format" }, { status: 400 });
    }
    accountId = accountIdParam;

    const supabase = createSupabaseClientForUser(token);
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user?.id) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    userId = user.id;

    // Early ownership check — validate before expensive file parsing
    const ownedAccount = await validateAccountOwnership(supabase, accountId, userId);
    if (!ownedAccount) {
      return NextResponse.json({ error: "Account not found" }, { status: 403 });
    }

    // Detect format from file extension
    const fileName = (file.name ?? "").toLowerCase();
    const isCsv = /\.csv$/i.test(fileName);
    const isHtml = /\.html?$/i.test(fileName) || (file.type && file.type.toLowerCase().includes("html"));
    const isXlsx = /\.xlsx?$/i.test(fileName);

    if (!isCsv && !isHtml && !isXlsx) {
      return NextResponse.json({ ok: false, error: "Formato não suportado" }, { status: 400 });
    }

    let parserChosen: string;
    if (isCsv) {
      parserChosen = "ctrader_csv";
    } else if (isHtml) {
      parserChosen = "html";
    } else {
      parserChosen = "xlsx";
    }

    // Parse file
    const buffer = await file.arrayBuffer();

    let trades: Array<{
      external_id: string;
      external_source?: string;
      symbol: string;
      direction: string;
      opened_at: string;
      closed_at: string;
      pnl_usd: number;
      fees_usd?: number;
      lots?: number;
      category?: string;
      commission?: number;
      swap?: number;
      entry_price?: number | null;
      exit_price?: number | null;
      stop_loss?: number | null;
      take_profit?: number | null;
      volume?: number | null;
      risk_usd?: number | null;
      rr_realized?: number | null;
    }> = [];
    let balanceOps: Array<{ type: string; amount_usd: number; at?: string | null; external_id?: string | null }> = [];

    // CSV-specific metadata surfaced when adaptive parser runs (optional)
    let csvSource: string = isCsv ? "ctrader" : "mt5";
    let adaptiveMapping: Record<string, { header: string; confidence: string }> | null = null;
    let adaptiveWarnings: string[] = [];
    let adaptiveSkippedOpen = 0;

    // Fingerprint/profile state (populated only for CSV flow)
    let fingerprint: string | null = null;
    let matchedProfile: ImportProfile | null = null;
    let rawHeaders: string[] = [];
    let rawSeparator = "";
    let rawEncoding = "";
    let adaptiveMissing: string[] = [];
    let adaptiveSampleRows: string[][] = [];
    let claudeSuggestion: AiMappingSuggestion | null = null;
    let aiSuggested = false;
    let suggestedBy: "parser" | "claude_haiku" | "user" = "parser";
    let profileRecord: ImportProfile | null = null;

    try {
      if (isCsv) {
        // Try cTrader fast-path; on failure fall back to adaptive parser.
        let ctraderOk = false;
        try {
          const { parseCtraderCsv } = await import("@/lib/ctrader-parser");
          const result = parseCtraderCsv(Buffer.from(buffer));
          trades = result.trades.map((t) => ({
            ...t,
            fees_usd: (t.commission ?? 0) + (t.swap ?? 0),
          }));
          balanceOps = result.payouts.map((p) => ({
            type: "WITHDRAWAL",
            amount_usd: p.amount_usd,
            at: p.paid_at,
            external_id: null,
          }));
          parserChosen = "ctrader_csv";
          csvSource = "ctrader";
          ctraderOk = true;
        } catch (ctraderErr) {
          const msg = ctraderErr instanceof Error ? ctraderErr.message : String(ctraderErr);
          if (msg.includes("Cannot find module") || msg.includes("Module not found")) {
            return NextResponse.json({ ok: false, error: "Parser cTrader CSV não disponível ainda" }, { status: 400 });
          }
          // not a cTrader file — try adaptive
        }

        if (ctraderOk) {
          // Rigid cTrader schema: populate headers + identity mapping so the
          // preview UI can skip the column-mapping step. Re-parse the buffer
          // just for the header row (cheap — splits at most 10 lines).
          try {
            const text = Buffer.from(buffer).toString("utf-8").replace(/^\ufeff/, "");
            const lines = text.split(/\r?\n/).filter((l) => l.trim()).slice(0, 10);
            const firstDataLine = lines[1] ?? "";
            const delim = firstDataLine.split(";").length > firstDataLine.split(",").length ? ";" : ",";
            let hdrLine = "";
            for (const l of lines) {
              const cols = l.split(delim).map((c) => c.trim().toLowerCase());
              if (cols.some((c) => c.includes("position") || c === "symbol")) {
                hdrLine = l;
                break;
              }
            }
            rawHeaders = hdrLine
              ? splitCsvLineLocal(hdrLine, delim).filter((h) => h.length > 0)
              : [];
            rawSeparator = delim;
            rawEncoding = "utf-8";

            // Identity mapping — cTrader headers are the canonical source.
            const findHeader = (match: (n: string) => boolean): string | undefined =>
              rawHeaders.find((h) => match(h.toLowerCase()));
            const ctMap: Record<string, { header: string; confidence: string }> = {};
            const symHdr = findHeader((h) => h === "symbol");
            if (symHdr) ctMap.symbol = { header: symHdr, confidence: "alias" };
            const dirHdr = findHeader((h) => h === "type" || h === "direction" || h === "side");
            if (dirHdr) ctMap.direction = { header: dirHdr, confidence: "alias" };
            const pnlHdr = findHeader((h) => h === "profit" || h === "p/l" || h === "pnl");
            if (pnlHdr) ctMap.pnl_usd = { header: pnlHdr, confidence: "alias" };
            const openHdr = findHeader((h) => h.includes("open") && h.includes("time"));
            if (openHdr) ctMap.opened_at = { header: openHdr, confidence: "alias" };
            const closeHdr = findHeader((h) => h.includes("close") && h.includes("time"));
            if (closeHdr) ctMap.closed_at = { header: closeHdr, confidence: "alias" };
            const volHdr = findHeader((h) => h === "volume" || h === "quantity");
            if (volHdr) ctMap.volume = { header: volHdr, confidence: "alias" };
            const commHdr = findHeader((h) => h === "commission" || h === "comm");
            if (commHdr) ctMap.commission = { header: commHdr, confidence: "alias" };
            const swapHdr = findHeader((h) => h === "swap");
            if (swapHdr) ctMap.swap = { header: swapHdr, confidence: "alias" };
            adaptiveMapping = ctMap;

            // Fingerprint for profile caching (best-effort).
            try {
              fingerprint = computeFingerprint({
                separator: rawSeparator,
                encoding: rawEncoding,
                headers: rawHeaders,
              });
              matchedProfile = await getProfileByFingerprint(supabase, userId, fingerprint);
            } catch {
              /* non-blocking */
            }
          } catch (hdrErr) {
            console.warn("[import-mt5] cTrader header extraction failed (non-blocking):", hdrErr);
          }
        } else {
          const { parseCsvAdaptive } = await import("@/lib/csv-adaptive-parser");

          // Load DB-backed alias vocabulary so broker-specific learned headers
          // are merged on top of the static dictionary before parsing.
          const extraAliases = await getCachedVocabulary(supabase);

          const adapt = parseCsvAdaptive(buffer, { extraAliases });
          trades = adapt.trades.map((t) => ({
            external_id: t.external_id,
            external_source: t.external_source,
            symbol: t.symbol,
            direction: t.direction,
            opened_at: t.opened_at,
            closed_at: t.closed_at,
            pnl_usd: t.pnl_usd,
            fees_usd: t.fees_usd,
            lots: t.lots,
          }));
          balanceOps = [];
          parserChosen = `csv_adaptive${adapt.broker_hint !== "generic" ? `_${adapt.broker_hint}` : ""}`;
          csvSource = adapt.external_source;
          adaptiveMapping = Object.fromEntries(
            Object.entries(adapt.mapping).map(([k, v]) => [
              k,
              { header: v!.header, confidence: v!.confidence },
            ])
          );
          adaptiveWarnings = adapt.warnings;
          adaptiveSkippedOpen = adapt.rows_skipped_open_position;
          rawHeaders = adapt.headers ?? [];
          rawSeparator = adapt.separator ?? "";
          rawEncoding = adapt.encoding ?? "utf-8";

          // Required canonical fields that the parser could not resolve.
          const REQUIRED: Array<keyof typeof adapt.mapping> = [
            "symbol",
            "pnl_usd",
            "opened_at",
            "closed_at",
          ] as Array<keyof typeof adapt.mapping>;
          adaptiveMissing = REQUIRED.filter((k) => !adapt.mapping[k]).map(String);

          // Fingerprint + profile lookup (best-effort — failures don't block import).
          try {
            fingerprint = computeFingerprint({
              separator: rawSeparator,
              encoding: rawEncoding,
              headers: rawHeaders,
            });
            matchedProfile = await getProfileByFingerprint(supabase, userId, fingerprint);
          } catch (fpErr) {
            console.warn("[import-mt5] fingerprint lookup failed:", fpErr);
          }

          // Capture a handful of sample data rows (post-header) to feed Claude if we need it.
          // We reuse the raw split produced by the parser isn't exposed — reparse cheaply here.
          if (adaptiveMissing.length > 0 && rawHeaders.length > 0 && !matchedProfile?.validated_by_user) {
            try {
              adaptiveSampleRows = extractSampleRowsFromBuffer(buffer, rawSeparator, rawHeaders);
            } catch (sErr) {
              console.warn("[import-mt5] sample row extract failed:", sErr);
            }

            // AI fallback only when parser left required fields unresolved AND
            // we don't already have a validated profile for this fingerprint.
            const suggestion = await suggestColumnMapping({
              headers: rawHeaders,
              sampleRows: adaptiveSampleRows,
            });
            if (suggestion) {
              claudeSuggestion = suggestion;
              aiSuggested = true;
              suggestedBy = "claude_haiku";
              // Merge Claude's suggestions into adaptiveMapping for UI display
              // (only for fields the parser didn't already resolve).
              const merged = { ...(adaptiveMapping ?? {}) };
              for (const [canonical, header] of Object.entries(suggestion.mapping)) {
                if (!merged[canonical]) {
                  merged[canonical] = { header, confidence: "ai" };
                }
              }
              adaptiveMapping = merged;
            }
          }
        }
      } else {
        const result = isHtml ? parseMt5Html(buffer) : parseMt5Xlsx(buffer);
        trades = result.trades;
        balanceOps = result.balanceOps;
      }
    } catch (parseErr) {
      const msg = parseErr instanceof Error ? parseErr.message : String(parseErr);
      if (msg.startsWith("MT5 HTML parse failed") || msg.startsWith("CSV adaptativo:")) {
        return NextResponse.json({ error: msg }, { status: 400 });
      }
      throw parseErr;
    }

    // ── PREVIEW MODE ──
    if (isPreview) {
      // Return up to 10 already-parsed trade objects.
      const sampleRows = trades.slice(0, 10).map((t) => ({
        symbol: t.symbol,
        direction: t.direction,
        opened_at: t.opened_at,
        closed_at: t.closed_at,
        pnl_usd: t.pnl_usd,
        fees_usd: t.fees_usd ?? 0,
        lots: (t as { lots?: number }).lots ?? 0,
        external_id: t.external_id,
      }));

      // needsMapping: only the adaptive parser produces ambiguous mappings that
      // the user may need to confirm. Rigid parsers (cTrader/XLSX/HTML) ship a
      // canonical schema and must not block the Importar button behind empty
      // dropdowns. Keep as boolean so the client can conditionally render.
      const needsMapping =
        parserChosen === "csv_adaptive" || parserChosen.startsWith("csv_adaptive_");

      return NextResponse.json({
        ok: true,
        preview: true,
        parser_used: parserChosen,
        needsMapping,
        trades_found: trades.length,
        payouts: balanceOps.filter((op) => op.type === "WITHDRAWAL").length,
        // New adaptive-learning surface
        fingerprint,
        matchedProfile: matchedProfile
          ? {
              id: matchedProfile.id,
              validated_by_user: matchedProfile.validated_by_user,
              suggested_by: matchedProfile.suggested_by ?? null,
            }
          : null,
        parsed: {
          headers: rawHeaders,
          mapping: adaptiveMapping ?? {},
          missing: adaptiveMissing,
          warnings: adaptiveWarnings,
          sampleRows,
          totalRows: trades.length,
        },
        aiSuggested,
        claudeSuggestion,
        // Back-compat fields consumed by existing UI
        sample: trades.slice(0, 5).map((t) => ({
          symbol: t.symbol,
          direction: t.direction,
          lots: (t as { lots?: number }).lots ?? 0,
          pnl: t.pnl_usd,
          date: new Date(t.closed_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        })),
        mapping: adaptiveMapping,
        warnings: adaptiveWarnings,
        rows_skipped_open_position: adaptiveSkippedOpen,
      });
    }

    // ── NON-PREVIEW FLOW: upsert profile before inserting rows ──
    if (isCsv && fingerprint && rawHeaders.length > 0) {
      try {
        const profilePayload = {
          user_id: userId,
          format_fingerprint: fingerprint,
          broker_guess: parserChosen,
          separator: rawSeparator,
          encoding: rawEncoding,
          headers: rawHeaders,
          column_mapping: (columnMappingOverride ??
            adaptiveMapping ??
            {}) as Record<string, unknown>,
          suggested_by: profileIdOverride ? "user" : suggestedBy,
          validated_by_user: Boolean(profileIdOverride) || Boolean(columnMappingOverride),
        };
        profileRecord = await upsertProfile(supabase, profilePayload);
        if (profileIdOverride || columnMappingOverride) {
          await markProfileValidated(supabase, profileRecord.id);
        }
      } catch (pErr) {
        console.warn("[import-mt5] profile upsert failed (non-blocking):", pErr);
      }
    }

    // Account already validated in early ownership check above
    const accountName: string = ownedAccount.name ?? "";
    isPropAccount = ownedAccount.kind === "prop";

    const { data: personalRow } = await supabase
      .from("accounts")
      .select("id")
      .eq("user_id", userId)
      .eq("kind", "personal")
      .limit(1)
      .maybeSingle();
    personalAccountId = (personalRow as { id: string } | null)?.id ?? null;

    // Prop payouts use prop_accounts.id (prop_account_id), not accounts.id.
    // Auto-heals missing prop_accounts rows using data from the parsed report.
    let propAccountRowId: string | null = null;
    if (isPropAccount) {
      const { data: propRow, error: propError } = await supabase
        .from("prop_accounts")
        .select("id, firm_name")
        .eq("account_id", accountId)
        .maybeSingle();
      if (propError) {
        console.error("[import-mt5] prop_accounts error:", propError.code, propError.message);
        return NextResponse.json(
          { error: "Failed to process account metadata" },
          { status: 500 }
        );
      }

      if (propRow && propRow.id) {
        firmName = propRow.firm_name ?? "";
        propAccountRowId = propRow.id;
      } else {
        // Auto-heal: create missing prop_accounts row from report + account name
        // Non-blocking — if auto-heal fails, trades are still imported (payouts won't link)
        const initialDeposit = balanceOps.find((op) => op.type === "INITIAL_DEPOSIT");
        const startingBalance = initialDeposit?.amount_usd ?? 0;
        const inferredFirm = accountName.split(" ")[0] || "Unknown";

        const propPayload = {
          user_id: userId,
          account_id: accountId,
          firm_name: inferredFirm,
          phase: "phase_1" as const,
          starting_balance_usd: startingBalance,
          profit_target_percent: 10,
          max_daily_loss_percent: 5,
          max_overall_loss_percent: 10,
          reset_timezone: "America/New_York",
          reset_rule: "forex_close",
        };

        // Try upsert first (handles race condition where row was created between select and insert)
        const { data: newPropRow, error: createErr } = await supabase
          .from("prop_accounts")
          .upsert(propPayload, { onConflict: "account_id" })
          .select("id, firm_name")
          .maybeSingle();

        if (createErr || !newPropRow) {
          // Non-blocking: log the error but continue importing trades
          console.error("[import-mt5] auto-heal prop_accounts failed (non-blocking):", createErr?.code, createErr?.message, createErr?.details, JSON.stringify(createErr?.hint ?? ""));
          console.warn("[import-mt5] continuing import without prop_accounts metadata — payouts will not be linked");
          firmName = inferredFirm;
          // propAccountRowId stays null — payout linking will be skipped
        } else {
          firmName = newPropRow.firm_name ?? inferredFirm;
          propAccountRowId = newPropRow.id;
        }
      }
    }

    const sourceLabel = isCsv ? parserChosen : isHtml ? "mt5_html" : "mt5_xlsx";

    let imported = 0;
    let duplicates = 0;
    let failed = 0;
    let skippedOld = 0;
    let payoutsDetected = 0;
    let payoutsWithoutWalletDeposit = 0;
    const skippedDetails: SkippedDetail[] = [];
    const duplicateDetails: DuplicateDetail[] = [];

    // Optimization: find the latest imported trade for this account to skip old trades
    const { data: latestTrade } = await supabase
      .from("journal_trades")
      .select("closed_at")
      .eq("user_id", userId)
      .eq("account_id", accountId)
      .eq("external_source", isCsv ? csvSource : "mt5")
      .order("closed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const cutoffDate = latestTrade?.closed_at ? new Date(latestTrade.closed_at) : null;

    // Filter trades: skip those closed before the cutoff (already imported)
    const newTrades = cutoffDate
      ? trades.filter((t) => new Date(t.closed_at) >= cutoffDate)
      : trades;
    skippedOld = trades.length - newTrades.length;

    // Idempotent import for new trades only.
    // net_pnl_usd is produced by the database (stored-generated column or
    // trigger, set up outside this repo's migrations). The UI also has a
    // client-side fallback (getNetPnl in components/journal/types.ts) that
    // computes pnl_usd + fees_usd should any row come back NULL, so omitting
    // it here is safe either way.
    // Step 1: Check for duplicates in bulk by fetching existing external_ids
    const defaultSource = isCsv ? csvSource : "mt5";
    const externalIds = newTrades.map((t) => t.external_id);
    const existingIdSet = new Set<string>();

    // Fetch existing external_ids in batches of 200 (Supabase .in() limit)
    const ID_CHECK_BATCH = 200;
    for (let i = 0; i < externalIds.length; i += ID_CHECK_BATCH) {
      const batch = externalIds.slice(i, i + ID_CHECK_BATCH);
      const { data: existingRows } = await supabase
        .from("journal_trades")
        .select("external_id")
        .eq("user_id", userId)
        .eq("account_id", accountId)
        .eq("external_source", defaultSource)
        .in("external_id", batch);
      if (existingRows) {
        for (const row of existingRows) {
          existingIdSet.add((row as { external_id: string }).external_id);
        }
      }
    }

    // Step 2: Separate duplicates from new inserts
    const toInsert: Array<{
      user_id: string;
      account_id: string;
      symbol: string;
      category: string;
      direction: string;
      opened_at: string;
      closed_at: string;
      pnl_usd: number;
      fees_usd: number;
      external_source: string;
      external_id: string;
      entry_price: number | null;
      exit_price: number | null;
      stop_loss: number | null;
      take_profit: number | null;
      volume: number | null;
      risk_usd: number | null;
      rr_realized: number | null;
    }> = [];

    const batchIds = new Set<string>();

    for (let i = 0; i < newTrades.length; i++) {
      const t = newTrades[i];
      const tradeSource = t.external_source ?? defaultSource;

      if (existingIdSet.has(t.external_id) || batchIds.has(t.external_id)) {
        duplicates += 1;
        duplicateDetails.push({
          symbol: t.symbol,
          direction: t.direction,
          date: new Date(t.closed_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        });
        continue;
      }
      batchIds.add(t.external_id);

      const category = t.category ?? inferCategory(t.symbol);
      toInsert.push({
        user_id: userId,
        account_id: accountId,
        symbol: t.symbol,
        category,
        direction: t.direction,
        opened_at: t.opened_at,
        closed_at: t.closed_at,
        pnl_usd: t.pnl_usd,
        fees_usd: t.fees_usd ?? 0,
        external_source: tradeSource,
        external_id: t.external_id,
        entry_price: t.entry_price ?? null,
        exit_price: t.exit_price ?? null,
        stop_loss: t.stop_loss ?? null,
        take_profit: t.take_profit ?? null,
        volume: t.volume ?? null,
        risk_usd: t.risk_usd ?? null,
        rr_realized: t.rr_realized ?? null,
      });
    }

    // Step 3: Batch insert 50 trades at a time
    const INSERT_BATCH = 50;
    for (let i = 0; i < toInsert.length; i += INSERT_BATCH) {
      const batch = toInsert.slice(i, i + INSERT_BATCH);
      const { error, data: insertedRows } = await supabase
        .from("journal_trades")
        .insert(batch)
        .select("id");

      if (error) {
        // Surface the real PG error once for the whole batch — helps diagnose
        // constraint/RLS issues in Vercel logs.
        console.warn(
          "[import-mt5] batch insert error:",
          error.code ?? "(no code)",
          "—",
          error.message ?? "",
          error.details ? `| details=${error.details}` : "",
          error.hint ? `| hint=${error.hint}` : ""
        );

        // Fall back to per-row inserts regardless of error code so each row
        // records its own real PG error (replaces previous "Batch insert error").
        for (let j = 0; j < batch.length; j++) {
          const row = batch[j];
          const { error: singleErr } = await supabase
            .from("journal_trades")
            .insert(row);
          if (singleErr) {
            if (singleErr.code === "23505") {
              duplicates += 1;
              duplicateDetails.push({
                symbol: row.symbol,
                direction: row.direction,
                date: new Date(row.closed_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
              });
            } else {
              failed += 1;
              const lineNum = i + j + 1;
              skippedDetails.push({
                line: lineNum,
                reason: singleErr.message ?? "Insert error",
                code: singleErr.code,
                hint: singleErr.hint ?? undefined,
                details: singleErr.details ?? undefined,
                data: row.symbol,
              });
              console.warn(
                "[import-mt5] trade insert error:",
                singleErr.code ?? "(no code)",
                singleErr.message,
                singleErr.details ? `| details=${singleErr.details}` : "",
                singleErr.hint ? `| hint=${singleErr.hint}` : ""
              );
            }
          } else {
            imported += 1;
          }
        }
      } else {
        imported += (insertedRows?.length ?? batch.length);
      }
    }

    // INITIAL_DEPOSIT from MT5 report is not sent to personal wallet — it's the prop firm's capital.
    for (const op of balanceOps) {
      if (op.type === "INITIAL_DEPOSIT" && isPropAccount) {
        continue;
      }
      // WITHDRAWAL on prop = payout; each payout resets the prop cycle (profit = net_pnl_usd after last paid_at).
      if (op.type === "WITHDRAWAL" && isPropAccount && propAccountRowId) {
        payoutsDetected += 1;
        const paidAt = op.at ? new Date(op.at).toISOString() : new Date().toISOString();
        const externalId = op.external_id ?? `payout-${paidAt}-${op.amount_usd}`;

        let existing = null;
        if (op.external_id) {
          const { data } = await supabase
            .from("prop_payouts")
            .select("id")
            .eq("prop_account_id", propAccountRowId)
            .eq("external_source", isCsv ? csvSource : "mt5")
            .eq("external_id", op.external_id)
            .maybeSingle();
          existing = data;
        }
        if (!existing) {
          const { data: byDateAmount } = await supabase
            .from("prop_payouts")
            .select("id")
            .eq("prop_account_id", propAccountRowId)
            .eq("paid_at", paidAt)
            .eq("amount_usd", op.amount_usd)
            .maybeSingle();
          existing = byDateAmount;
        }
        if (existing) continue;

        await supabase.from("prop_payouts").insert({
          user_id: userId,
          prop_account_id: propAccountRowId,
          paid_at: paidAt,
          amount_usd: op.amount_usd,
          external_source: isCsv ? csvSource : "mt5",
          external_id: externalId,
        });

        if (personalAccountId) {
          await supabase.from("wallet_transactions").insert({
            user_id: userId,
            account_id: personalAccountId,
            tx_type: "deposit",
            amount_usd: op.amount_usd,
            notes: `Payout ${firmName || "Prop"}`,
          });
        } else {
          payoutsWithoutWalletDeposit += 1;
        }
      }
    }

    const durationMs = Date.now() - start;
    const meta: Record<string, unknown> = {
      account_id: accountId,
      imported,
      duplicates,
      failed,
      payouts_detected: payoutsDetected,
      profile_id: profileRecord?.id ?? null,
      suggested_by: profileRecord?.suggested_by ?? (isCsv ? suggestedBy : null),
      fingerprint,
      ai_suggested: aiSuggested,
    };
    if (payoutsWithoutWalletDeposit > 0) {
      meta.no_personal_account_for_wallet_deposit = payoutsWithoutWalletDeposit;
    }

    await supabase.from("ingestion_logs").insert({
      user_id: userId,
      status: "ok",
      source: sourceLabel,
      items_count: imported + duplicates + failed,
      duration_ms: durationMs,
      message: `Imported ${imported} trades, ${duplicates} duplicates, ${failed} failed, ${payoutsDetected} payouts`,
      meta,
    });

    // Record vocabulary + profile usage on successful import (best-effort).
    if (isCsv && imported > 0) {
      try {
        if (profileRecord?.id) {
          await recordProfileUsage(supabase, profileRecord.id);
        }
        const mappingForVocab = columnMappingOverride ?? toSimpleMapping(adaptiveMapping);
        if (mappingForVocab && Object.keys(mappingForVocab).length > 0) {
          const source = profileIdOverride || columnMappingOverride ? "user_confirmed" : suggestedBy;
          await recordAliases(
            supabase,
            Object.entries(mappingForVocab).map(([canonical, header]) => ({
              canonical_field: canonical,
              alias: header,
              source,
            }))
          );
        }
      } catch (vErr) {
        console.warn("[import-mt5] vocabulary/profile-usage update failed:", vErr);
      }
    }

    // Check daily drawdown breach after import (prop accounts only)
    let ddBreach: { breached: boolean; accountName: string; ddPercent: number; ddLimit: number; date: string } | null = null;
    if (isPropAccount && imported > 0) {
      try {
        ddBreach = await checkAndDeactivateIfDdBreached(supabase, accountId, userId);
      } catch (err) {
        console.warn("[import-mt5] DD check failed:", err);
      }
    }

    return NextResponse.json({
      ok: true,
      parser_used: parserChosen,
      trades_found: trades.length,
      trades_skipped_old: skippedOld,
      balance_ops_found: balanceOps.length,
      trades_imported: imported,
      trades_duplicates_ignored: duplicates,
      trades_failed: failed,
      imported,
      duplicates,
      failed,
      payouts_detected: payoutsDetected,
      dd_breach: ddBreach,
      duration_ms: durationMs,
      skipped_details: skippedDetails,
      duplicate_details: duplicateDetails,
      mapping: adaptiveMapping,
      warnings: adaptiveWarnings,
      rows_skipped_open_position: adaptiveSkippedOpen,
      // Adaptive-learning surface (null for non-CSV paths)
      profile_id: profileRecord?.id ?? null,
      suggested_by: profileRecord?.suggested_by ?? (isCsv ? suggestedBy : null),
      ai_suggested: aiSuggested,
      fingerprint,
    });
  } catch (err) {
    const durationMs = Date.now() - start;
    console.error("[import-mt5] error:", err);
    if (token) {
      try {
        const supabase = createSupabaseClientForUser(token);
        const { data: { user } } = await supabase.auth.getUser(token);
        if (user?.id) {
          await supabase.from("ingestion_logs").insert({
            user_id: user.id,
            status: "error",
            source: "mt5_import",
            items_count: 0,
            duration_ms: durationMs,
            message: err instanceof Error ? err.message : String(err),
            meta: { error: String(err) },
          });
        }
      } catch (_) {}
    }
    const isParseError = err instanceof Error && err.message.startsWith("MT5 HTML parse failed");
    const status = isParseError ? 400 : 500;
    const errMsg = isParseError ? "Invalid MT5 report format" : "Import failed";
    return NextResponse.json({ error: errMsg }, { status });
  }
}
