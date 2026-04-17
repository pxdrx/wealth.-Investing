"use client";

/**
 * AdaptiveImportModal
 *
 * CSV-specific import flow with preview + column mapping.
 *
 * State machine:
 *   idle -> uploading_preview -> preview_ready -> confirming -> done
 *
 * Auto-skip to confirming when a previously validated import profile matches the
 * file fingerprint and no canonical field is missing from the mapping.
 *
 * Contract (API /api/journal/import-mt5):
 *   POST FormData { file, accountId, preview: "true" | "false", columnMapping?, profileId? }
 *   Preview response: { ok, preview, fingerprint, matchedProfile, parsed, aiSuggested, claudeSuggestion }
 *   Import response:  { ok, imported, duplicates, failed, skipped_details, duplicate_details, profile_id, ... }
 */

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Wand2,
  XCircle,
} from "lucide-react";

const easeApple: [number, number, number, number] = [0.16, 1, 0.3, 1];

const CANONICAL_FIELDS: Array<{ key: string; label: string; required: boolean }> = [
  { key: "symbol", label: "Símbolo", required: true },
  { key: "pnl_usd", label: "Lucro/Prejuízo (USD)", required: true },
  { key: "opened_at", label: "Abertura", required: true },
  { key: "closed_at", label: "Fechamento", required: true },
  { key: "direction", label: "Direção", required: true },
  { key: "volume", label: "Volume / Lotes", required: false },
  { key: "entry_price", label: "Preço de entrada", required: false },
  { key: "exit_price", label: "Preço de saída", required: false },
  { key: "fees_usd", label: "Taxas (USD)", required: false },
];

interface MappingEntry {
  header: string;
  confidence: string;
}

interface SampleRow {
  symbol?: string;
  direction?: string;
  pnl_usd?: number | string;
  opened_at?: string;
  closed_at?: string;
  [k: string]: unknown;
}

interface MatchedProfile {
  id: string;
  validated_by_user?: boolean;
  suggested_by?: string | null;
}

interface PreviewResponse {
  ok: boolean;
  preview: true;
  /**
   * Whether this preview requires the user to confirm a column mapping.
   * Only true for adaptive-CSV parses where columns were guessed. Rigid
   * parsers (cTrader/XLSX/HTML) ship a canonical schema and set this false.
   * Older server versions omit the field — treat missing as false so the
   * Importar button is enabled as soon as trades are parsed.
   */
  needsMapping?: boolean;
  fingerprint: string;
  matchedProfile: MatchedProfile | null;
  parsed: {
    headers: string[];
    mapping: Record<string, MappingEntry>;
    missing: string[];
    warnings: string[];
    sampleRows: SampleRow[];
    totalRows: number;
  };
  aiSuggested: boolean;
  claudeSuggestion: {
    mapping: Record<string, string>;
    reasoning: string;
  } | null;
}

interface SkippedDetail {
  line: number;
  reason: string;
  code?: string;
  hint?: string;
  details?: string;
  data?: string;
}

interface DuplicateDetail {
  symbol: string;
  direction: string;
  date: string;
}

interface ImportResponse {
  ok: boolean;
  imported?: number;
  trades_imported?: number;
  duplicates?: number;
  trades_duplicates_ignored?: number;
  failed?: number;
  trades_failed?: number;
  skipped_details?: SkippedDetail[];
  duplicate_details?: Array<{ symbol?: string; direction?: string; date?: string; opened_at?: string }>;
  profile_id?: string;
  suggested_by?: string;
  ai_suggested?: boolean;
  mapping?: Record<string, MappingEntry>;
  error?: string;
}

type Phase = "idle" | "uploading_preview" | "preview_ready" | "confirming" | "done" | "error";

interface AdaptiveImportModalProps {
  file: File;
  accountId: string;
  accessToken: string;
  onCancel: () => void;
  onDone: (result: {
    imported: number;
    duplicates: number;
    failed: number;
    skippedDetails: SkippedDetail[];
    duplicateDetails: DuplicateDetail[];
    profileId?: string;
    durationMs: number;
  }) => void;
}

type NormalizedMapping = Record<string, string>;

function normalizeMapping(m: Record<string, MappingEntry>): NormalizedMapping {
  const out: NormalizedMapping = {};
  for (const [k, v] of Object.entries(m || {})) {
    if (v && typeof v.header === "string") out[k] = v.header;
  }
  return out;
}

function buildMappingPayload(
  headers: string[],
  chosen: NormalizedMapping,
  confidences: Record<string, string>,
): Record<string, MappingEntry> {
  const out: Record<string, MappingEntry> = {};
  for (const [field, header] of Object.entries(chosen)) {
    if (!header) continue;
    if (!headers.includes(header)) continue;
    out[field] = { header, confidence: confidences[field] ?? "manual" };
  }
  return out;
}

export function AdaptiveImportModal({
  file,
  accountId,
  accessToken,
  onCancel,
  onDone,
}: AdaptiveImportModalProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [mapping, setMapping] = useState<NormalizedMapping>({});
  const [saveProfile, setSaveProfile] = useState(true);

  const startTimeRef = useMemo(() => ({ current: 0 }), []);

  /* ---------------------------- Step 1: preview ----------------------------- */
  const runPreview = useCallback(async () => {
    setPhase("uploading_preview");
    setError(null);
    try {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("accountId", accountId);
      fd.set("preview", "true");
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 45_000);
      const res = await fetch("/api/journal/import-mt5", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: fd,
        signal: ctrl.signal,
      });
      clearTimeout(t);
      const data = (await res.json().catch(() => ({}))) as PreviewResponse & { error?: string };
      if (!res.ok || !data.ok) {
        throw new Error(data.error || `Erro ${res.status}`);
      }
      setPreview(data);
      setMapping(normalizeMapping(data.parsed?.mapping ?? {}));
      setPhase("preview_ready");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Falha ao gerar preview.";
      setError(msg);
      setPhase("error");
    }
  }, [file, accountId, accessToken]);

  useEffect(() => {
    runPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ------------------ Step 2: auto-confirm when trusted profile ------------- */
  const missingRequired = useMemo(() => {
    if (!preview) return [] as string[];
    return CANONICAL_FIELDS.filter((f) => f.required && !mapping[f.key]).map((f) => f.key);
  }, [preview, mapping]);

  useEffect(() => {
    if (phase !== "preview_ready" || !preview) return;
    if (preview.matchedProfile?.validated_by_user && missingRequired.length === 0) {
      // Validated profile + complete mapping -> skip UI and auto-submit.
      runFinalImport();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, preview]);

  /* ----------------------- Step 3: confirm / final import ------------------- */
  async function runFinalImport() {
    if (!preview) return;
    setPhase("confirming");
    setError(null);
    startTimeRef.current = Date.now();
    try {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("accountId", accountId);
      fd.set("preview", "false");
      const confidences = Object.fromEntries(
        Object.entries(preview.parsed.mapping ?? {}).map(([k, v]) => [k, v.confidence]),
      );
      const mappingPayload = buildMappingPayload(
        preview.parsed.headers,
        mapping,
        confidences,
      );
      fd.set("columnMapping", JSON.stringify(mappingPayload));
      if (preview.matchedProfile?.id) fd.set("profileId", preview.matchedProfile.id);

      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 180_000);
      const res = await fetch("/api/journal/import-mt5", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: fd,
        signal: ctrl.signal,
      });
      clearTimeout(t);
      const data = (await res.json().catch(() => ({}))) as ImportResponse;
      if (!res.ok || !data.ok) {
        throw new Error(data.error || `Erro ${res.status}`);
      }

      const durationMs = Date.now() - startTimeRef.current;
      const imported = data.imported ?? data.trades_imported ?? 0;
      const duplicates = data.duplicates ?? data.trades_duplicates_ignored ?? 0;
      const failed = data.failed ?? data.trades_failed ?? 0;

      const duplicateDetails: DuplicateDetail[] = (data.duplicate_details ?? []).map((d) => ({
        symbol: String(d.symbol ?? ""),
        direction: String(d.direction ?? ""),
        date: (() => {
          const raw = d.opened_at ?? d.date;
          if (!raw) return "";
          try {
            return new Date(String(raw)).toLocaleDateString("pt-BR");
          } catch {
            return String(raw).slice(0, 10);
          }
        })(),
      }));

      const skippedDetails: SkippedDetail[] = (data.skipped_details ?? []).map((s) => ({
        line:
          typeof s.line === "number"
            ? s.line
            : parseInt(String(s.line ?? "0"), 10) || 0,
        reason: String(s.reason ?? ""),
        code: s.code,
        hint: s.hint,
        details: s.details,
        data: s.data,
      }));

      // Optionally persist "validated by user" on the profile so future imports skip preview.
      if (saveProfile && data.profile_id) {
        try {
          await fetch(`/api/journal/import-profiles/${data.profile_id}`, {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ validated_by_user: true }),
          }).catch(() => {
            // TODO: backend agent may ship this PATCH endpoint later; ignore silently.
          });
        } catch {
          /* no-op */
        }
      }

      onDone({
        imported,
        duplicates,
        failed,
        skippedDetails,
        duplicateDetails,
        profileId: data.profile_id,
        durationMs,
      });
      setPhase("done");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Falha ao importar.";
      setError(msg);
      setPhase("error");
    }
  }

  /* ------------------------------- Rendering -------------------------------- */
  if (phase === "uploading_preview") {
    return (
      <Shell>
        <div className="flex items-center gap-3 py-6">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">
            Analisando estrutura do CSV...
          </p>
        </div>
      </Shell>
    );
  }

  if (phase === "confirming") {
    return (
      <Shell>
        <div className="space-y-3 py-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            Importando trades...
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted/30">
            <div
              className="h-full rounded-full bg-primary animate-pulse"
              style={{ width: "70%" }}
            />
          </div>
        </div>
      </Shell>
    );
  }

  if (phase === "error") {
    return (
      <Shell>
        <div className="space-y-4 py-4 text-center">
          <XCircle className="mx-auto h-8 w-8 text-destructive" />
          <p className="text-sm text-destructive">{error}</p>
          <div className="flex justify-center gap-2">
            <button
              onClick={onCancel}
              className="rounded-lg border px-4 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted"
            >
              Fechar
            </button>
            <button
              onClick={runPreview}
              className="rounded-lg bg-primary px-4 py-1.5 text-sm text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      </Shell>
    );
  }

  if (phase !== "preview_ready" || !preview) {
    return null;
  }

  /* ------------------------------ preview_ready ----------------------------- */
  const { parsed, matchedProfile, aiSuggested } = preview;
  const needsMapping = Boolean(preview.needsMapping);
  // Rigid parsers (cTrader/XLSX/HTML) do not require user-confirmed mapping:
  // the schema is canonical and trades[] is proof the parse succeeded. Only
  // gate the button on mapping completion when the adaptive parser guessed
  // columns (`needsMapping === true`).
  const canImport =
    parsed.totalRows > 0 && (!needsMapping || missingRequired.length === 0);

  const badge = matchedProfile?.validated_by_user
    ? {
        tone: "green" as const,
        icon: <CheckCircle2 className="h-3.5 w-3.5" />,
        label: "Formato reconhecido",
      }
    : aiSuggested
      ? {
          tone: "purple" as const,
          icon: <Sparkles className="h-3.5 w-3.5" />,
          label: "Mapeamento sugerido por IA",
        }
      : !needsMapping
        ? {
            tone: "green" as const,
            icon: <CheckCircle2 className="h-3.5 w-3.5" />,
            label: "Formato reconhecido",
          }
        : {
            tone: "blue" as const,
            icon: <Wand2 className="h-3.5 w-3.5" />,
            label: "Mapeamento automático",
          };

  return (
    <Shell>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.25, ease: easeApple }}
          className="space-y-4"
        >
          {/* Badge bar */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span
                className={
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium " +
                  (badge.tone === "green"
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : badge.tone === "purple"
                      ? "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                      : "bg-blue-500/10 text-blue-600 dark:text-blue-400")
                }
              >
                {badge.icon}
                {badge.label}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {parsed.totalRows} linha{parsed.totalRows === 1 ? "" : "s"} detectada
                {parsed.totalRows === 1 ? "" : "s"}
              </span>
            </div>
            <span className="font-mono text-[10px] text-muted-foreground/70">
              {preview.fingerprint?.slice(0, 12)}
            </span>
          </div>

          {/* AI reasoning, if present */}
          {preview.claudeSuggestion?.reasoning && (
            <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 p-3 text-[11px] text-muted-foreground">
              <p className="mb-1 font-medium text-purple-600 dark:text-purple-400">
                Raciocínio do mapeamento
              </p>
              <p>{preview.claudeSuggestion.reasoning}</p>
            </div>
          )}

          {/* Mapping table — only render when the parser needed to guess columns.
              Rigid parsers ship a canonical schema so showing the dropdowns
              would be noise (and, worse, block the Importar button). */}
          {needsMapping && (
          <div className="rounded-[22px] border border-border/60 overflow-hidden">
            <div className="grid grid-cols-[1fr_1.4fr_auto] gap-0 text-[11px] font-medium text-muted-foreground uppercase tracking-wider bg-muted/30 px-3 py-2">
              <span>Campo</span>
              <span>Coluna do CSV</span>
              <span className="text-right">Confiança</span>
            </div>
            <div className="divide-y divide-border/40">
              {CANONICAL_FIELDS.map((field) => {
                const current = mapping[field.key] ?? "";
                const conf = parsed.mapping[field.key]?.confidence;
                const isMissing = field.required && !current;
                return (
                  <Fragment key={field.key}>
                    <div className="grid grid-cols-[1fr_1.4fr_auto] items-center gap-2 px-3 py-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">
                          {field.label}
                        </span>
                        {field.required && (
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            obrigatório
                          </span>
                        )}
                      </div>
                      <select
                        value={current}
                        onChange={(e) =>
                          setMapping((m) => ({ ...m, [field.key]: e.target.value }))
                        }
                        className={
                          "w-full rounded-lg border px-2 py-1 text-xs bg-background " +
                          (isMissing
                            ? "border-destructive/60 focus:border-destructive"
                            : "border-border/60 focus:border-primary") +
                          " focus:outline-none"
                        }
                      >
                        <option value="">— não mapeado —</option>
                        {parsed.headers.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                      <span className="text-right text-[10px] uppercase tracking-wider text-muted-foreground">
                        {current ? conf ?? "manual" : isMissing ? "—" : "opcional"}
                      </span>
                    </div>
                  </Fragment>
                );
              })}
            </div>
          </div>
          )}

          {/* Warnings */}
          {parsed.warnings && parsed.warnings.length > 0 && (
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
              <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-3.5 w-3.5" /> Avisos
              </div>
              <ul className="list-inside list-disc space-y-0.5 text-[11px] text-muted-foreground">
                {parsed.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Sample rows */}
          {parsed.sampleRows && parsed.sampleRows.length > 0 && (
            <div>
              <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Prévia (primeiras 5 linhas)
              </p>
              <div className="overflow-hidden rounded-lg border border-border/60">
                <table className="w-full text-xs">
                  <thead className="bg-muted/30 text-[10px] uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left">Símbolo</th>
                      <th className="px-3 py-2 text-left">Direção</th>
                      <th className="px-3 py-2 text-right">P&L</th>
                      <th className="px-3 py-2 text-left">Abertura</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {parsed.sampleRows.slice(0, 5).map((row, i) => {
                      const pnlNum =
                        typeof row.pnl_usd === "number"
                          ? row.pnl_usd
                          : parseFloat(String(row.pnl_usd ?? "0")) || 0;
                      return (
                        <tr key={i}>
                          <td className="px-3 py-1.5 font-medium">{row.symbol ?? ""}</td>
                          <td className="px-3 py-1.5 uppercase text-muted-foreground">
                            {String(row.direction ?? "")}
                          </td>
                          <td
                            className={
                              "px-3 py-1.5 text-right tabular-nums " +
                              (pnlNum >= 0
                                ? "text-[hsl(var(--pnl-positive))]"
                                : "text-[hsl(var(--pnl-negative))]")
                            }
                          >
                            {pnlNum.toFixed(2)}
                          </td>
                          <td className="px-3 py-1.5 text-muted-foreground">
                            {row.opened_at
                              ? (() => {
                                  try {
                                    return new Date(
                                      String(row.opened_at),
                                    ).toLocaleDateString("pt-BR");
                                  } catch {
                                    return String(row.opened_at).slice(0, 10);
                                  }
                                })()
                              : ""}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Remember checkbox */}
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={saveProfile}
              onChange={(e) => setSaveProfile(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-border"
            />
            Reaproveitar este mapeamento em imports futuros
          </label>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <button
              onClick={onCancel}
              className="rounded-lg border px-4 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted"
            >
              Cancelar
            </button>
            <button
              onClick={runFinalImport}
              disabled={!canImport}
              className="rounded-lg bg-primary px-4 py-1.5 text-sm text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              Importar {parsed.totalRows} trade{parsed.totalRows === 1 ? "" : "s"}
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-[22px] border border-border/60 p-5 shadow-soft dark:shadow-soft-dark"
      style={{ backgroundColor: "hsl(var(--card))" }}
    >
      {children}
    </div>
  );
}
