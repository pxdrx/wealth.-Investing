# Phase 2 Remaining Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add drag & drop import with preview/discrepancy, connect onboarding step 4, add dashboard consolidated accounts view (Pro+), and implement cTrader CSV parser.

**Architecture:** Shared `ImportDropZone` component used by Journal and Onboarding. API route extended with preview mode and detailed error reporting. Dashboard gets `AccountsOverview` gated by PaywallGate. cTrader parser follows same interface as MT5 parsers.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS, shadcn/ui (Dialog), Supabase, Framer Motion

**Spec:** `docs/superpowers/specs/2026-03-17-phase2-remaining-design.md`

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `components/journal/ImportDropZone.tsx` | Drag & drop zone with highlight, format badges, file picker fallback |
| `components/journal/ImportPreview.tsx` | Preview table showing first 5 trades, file info, confirm/cancel |
| `components/journal/ImportResult.tsx` | Result KPIs (imported/duplicates/failed) + action buttons |
| `components/journal/DiscrepancyModal.tsx` | Modal with detailed import report (successes, dupes, errors with reasons) |
| `components/dashboard/AccountsOverview.tsx` | Header KPIs + accounts table with drawdown, sorted by risk |
| `lib/ctrader-parser.ts` | cTrader CSV parser → ParsedTrades output |

### Modified Files
| File | Changes |
|------|---------|
| `app/api/journal/import-mt5/route.ts` | Add `?preview=true` mode, add `skipped_details` to response, auto-detect CSV format |
| `app/app/journal/page.tsx` | Replace file input with ImportDropZone flow (4 states) |
| `app/onboarding/page.tsx` | Step 4: replace placeholder with ImportDropZone compact mode |
| `app/app/page.tsx` | Add AccountsOverview between calendar and performance sections |

---

## Chunk 1: Import Drop Zone & Preview

### Task 1: Create ImportDropZone component

**Files:**
- Create: `components/journal/ImportDropZone.tsx`

- [ ] **Step 1: Create the drop zone component**

```tsx
// components/journal/ImportDropZone.tsx
"use client";

import { useState, useRef, useCallback } from "react";
import { FileSpreadsheet, Upload } from "lucide-react";
import { motion } from "framer-motion";

interface ImportDropZoneProps {
  onFileSelected: (file: File) => void;
  compact?: boolean;
  disabled?: boolean;
}

export function ImportDropZone({ onFileSelected, compact = false, disabled = false }: ImportDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const ACCEPTED = ".xlsx,.html,.htm,.csv";
  const FORMATS = [
    { label: "MT5 XLSX", enabled: true },
    { label: "MT5 HTML", enabled: true },
    { label: "cTrader CSV", enabled: true },
  ];

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items?.length > 0) setIsDragging(true);
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onFileSelected(file);
  }, [onFileSelected]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileSelected(file);
    if (inputRef.current) inputRef.current.value = "";
  }, [onFileSelected]);

  const py = compact ? "py-8" : "py-12";

  return (
    <div>
      <motion.div
        onDragEnter={handleDragIn}
        onDragLeave={handleDragOut}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        animate={{ borderColor: isDragging ? "hsl(var(--pnl-positive))" : "hsl(var(--border))" }}
        className={`border-2 border-dashed rounded-2xl ${py} px-6 text-center transition-colors cursor-pointer ${
          isDragging ? "bg-[hsl(var(--pnl-positive)/0.05)]" : "bg-transparent"
        } ${disabled ? "opacity-50 pointer-events-none" : ""}`}
        onClick={() => inputRef.current?.click()}
      >
        <FileSpreadsheet className="mx-auto mb-3 text-muted-foreground" size={compact ? 32 : 40} />
        <p className="text-sm text-muted-foreground mb-1">
          Arraste seu relatório aqui
        </p>
        <p className="text-xs text-muted-foreground/60 mb-3">
          Formatos aceitos: .xlsx, .html, .htm, .csv
        </p>
        <button
          type="button"
          className="text-xs px-4 py-1.5 rounded-lg border border-primary/30 text-primary bg-primary/10 hover:bg-primary/20 transition-colors"
          onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
        >
          Ou selecione um arquivo
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          className="hidden"
          onChange={handleFileInput}
        />
      </motion.div>
      {!compact && (
        <div className="flex gap-2 mt-3 justify-center">
          {FORMATS.map((f) => (
            <span
              key={f.label}
              className={`text-[11px] px-3 py-1 rounded-full ${
                f.enabled
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground/50"
              }`}
            >
              {f.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit components/journal/ImportDropZone.tsx` or check dev server for errors.

- [ ] **Step 3: Commit**

```bash
git add components/journal/ImportDropZone.tsx
git commit -m "feat: ImportDropZone component with drag & drop support"
```

### Task 2: Create ImportPreview component

**Files:**
- Create: `components/journal/ImportPreview.tsx`

- [ ] **Step 1: Create preview component**

```tsx
// components/journal/ImportPreview.tsx
"use client";

import { FileCheck } from "lucide-react";

interface PreviewTrade {
  symbol: string;
  direction: "buy" | "sell";
  lots: number;
  pnl: number;
  date: string;
}

interface ImportPreviewProps {
  fileName: string;
  totalTrades: number;
  payouts: number;
  trades: PreviewTrade[];
  compact?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export function ImportPreview({
  fileName, totalTrades, payouts, trades, compact = false, onConfirm, onCancel, loading = false,
}: ImportPreviewProps) {
  const displayCount = compact ? 3 : 5;
  const displayed = trades.slice(0, displayCount);

  return (
    <div className="rounded-2xl border p-4" style={{ backgroundColor: "hsl(var(--card))" }}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm font-semibold">{fileName}</p>
          <p className="text-xs text-muted-foreground">
            {totalTrades} trades encontrados{payouts > 0 ? ` · ${payouts} payouts` : ""}
          </p>
        </div>
        <span className="text-[11px] px-2 py-0.5 rounded-md bg-[hsl(var(--pnl-positive)/0.15)] text-[hsl(var(--pnl-positive))]">
          <FileCheck size={12} className="inline mr-1" />Parseado OK
        </span>
      </div>

      <div className="rounded-lg overflow-hidden border">
        <div className="grid grid-cols-[1fr_60px_50px_70px_70px] px-3 py-1.5 bg-muted/50 text-[11px] text-muted-foreground uppercase tracking-wider">
          <span>Símbolo</span><span>Dir.</span><span>Lotes</span><span className="text-right">P&L</span><span className="text-right">Data</span>
        </div>
        {displayed.map((t, i) => (
          <div key={i} className="grid grid-cols-[1fr_60px_50px_70px_70px] px-3 py-1.5 text-xs border-t">
            <span>{t.symbol}</span>
            <span className={t.direction === "buy" ? "text-[hsl(var(--pnl-positive))]" : "text-[hsl(var(--pnl-negative))]"}>
              {t.direction === "buy" ? "Buy" : "Sell"}
            </span>
            <span>{t.lots}</span>
            <span className={`text-right tabular-nums ${t.pnl >= 0 ? "text-[hsl(var(--pnl-positive))]" : "text-[hsl(var(--pnl-negative))]"}`}>
              {t.pnl >= 0 ? "+" : ""}${Math.abs(t.pnl).toLocaleString("en", { maximumFractionDigits: 0 })}
            </span>
            <span className="text-right text-muted-foreground">{t.date}</span>
          </div>
        ))}
      </div>
      {totalTrades > displayCount && (
        <p className="text-[11px] text-muted-foreground text-center mt-1.5">
          Mostrando {displayCount} de {totalTrades} trades
        </p>
      )}

      <div className="flex gap-3 justify-end mt-4">
        <button onClick={onCancel} className="text-sm px-4 py-1.5 rounded-lg border text-muted-foreground hover:bg-muted transition-colors">
          Cancelar
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className="text-sm px-4 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {loading ? "Importando..." : `Importar ${totalTrades} trades`}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/journal/ImportPreview.tsx
git commit -m "feat: ImportPreview component with trade table"
```

### Task 3: Create ImportResult and DiscrepancyModal

**Files:**
- Create: `components/journal/ImportResult.tsx`
- Create: `components/journal/DiscrepancyModal.tsx`

- [ ] **Step 1: Create DiscrepancyModal**

```tsx
// components/journal/DiscrepancyModal.tsx
"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface SkippedDetail {
  line: number;
  reason: string;
  data?: string;
}

interface DuplicateDetail {
  symbol: string;
  direction: string;
  date: string;
}

interface DiscrepancyModalProps {
  open: boolean;
  onClose: () => void;
  fileName: string;
  importedAt: string;
  duration: string;
  imported: number;
  duplicates: number;
  duplicateDetails?: DuplicateDetail[];
  failed: number;
  skippedDetails?: SkippedDetail[];
}

export function DiscrepancyModal({
  open, onClose, fileName, importedAt, duration,
  imported, duplicates, duplicateDetails = [], failed, skippedDetails = [],
}: DiscrepancyModalProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Detalhes do Import</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium">{fileName}</p>
            <p className="text-xs text-muted-foreground">
              Importado em {importedAt} · Duração: {duration}
            </p>
          </div>

          <p className="text-sm text-[hsl(var(--pnl-positive))]">
            ✅ {imported} trades importados com sucesso
          </p>

          {duplicates > 0 && (
            <div>
              <p className="text-sm text-yellow-500 mb-2">⚠️ {duplicates} duplicatas ignoradas</p>
              <div className="rounded-lg bg-yellow-500/5 p-3 space-y-1">
                {duplicateDetails.map((d, i) => (
                  <div key={i} className="flex justify-between text-xs text-muted-foreground">
                    <span>{d.symbol} {d.direction} · {d.date}</span>
                    <span className="text-yellow-500">Já existe</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {failed > 0 && (
            <div>
              <p className="text-sm text-[hsl(var(--pnl-negative))] mb-2">❌ {failed} linhas com erro</p>
              <div className="rounded-lg bg-[hsl(var(--pnl-negative)/0.05)] p-3 space-y-1">
                {skippedDetails.map((s, i) => (
                  <div key={i} className="flex justify-between text-xs text-muted-foreground">
                    <span>Linha {s.line}{s.data ? ` · ${s.data}` : ""}</span>
                    <span className="text-[hsl(var(--pnl-negative))]">{s.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Create ImportResult**

```tsx
// components/journal/ImportResult.tsx
"use client";

import { useState } from "react";
import { CheckCircle, Brain } from "lucide-react";
import { DiscrepancyModal } from "./DiscrepancyModal";
import Link from "next/link";

interface ImportResultProps {
  fileName: string;
  imported: number;
  duplicates: number;
  failed: number;
  importedAt: string;
  duration: string;
  duplicateDetails?: Array<{ symbol: string; direction: string; date: string }>;
  skippedDetails?: Array<{ line: number; reason: string; data?: string }>;
  showAiCoach?: boolean;
  onReset: () => void;
}

export function ImportResult({
  fileName, imported, duplicates, failed,
  importedAt, duration, duplicateDetails, skippedDetails,
  showAiCoach = false, onReset,
}: ImportResultProps) {
  const [modalOpen, setModalOpen] = useState(false);

  const kpis = [
    { value: imported, label: "importados", color: "hsl(var(--pnl-positive))", bg: "hsl(var(--pnl-positive)/0.1)" },
    { value: duplicates, label: "duplicatas", color: "hsl(210 40% 70%)", bg: "hsl(210 40% 70% / 0.1)" },
    { value: failed, label: "falhou", color: "hsl(var(--pnl-negative))", bg: "hsl(var(--pnl-negative)/0.1)" },
  ];

  return (
    <div className="rounded-2xl border p-6 text-center" style={{ backgroundColor: "hsl(var(--card))" }}>
      <CheckCircle className="mx-auto mb-2 text-[hsl(var(--pnl-positive))]" size={36} />
      <p className="text-base font-semibold mb-4">Import concluído</p>

      <div className="grid grid-cols-3 gap-3 mb-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-lg p-3" style={{ backgroundColor: k.bg }}>
            <p className="text-xl font-bold tabular-nums" style={{ color: k.color }}>{k.value}</p>
            <p className="text-[11px] text-muted-foreground">{k.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-3 justify-center">
        {(duplicates > 0 || failed > 0) && (
          <button
            onClick={() => setModalOpen(true)}
            className="text-xs px-3 py-1.5 rounded-lg border border-[hsl(var(--pnl-negative)/0.3)] text-[hsl(var(--pnl-negative))] bg-[hsl(var(--pnl-negative)/0.1)] hover:bg-[hsl(var(--pnl-negative)/0.15)] transition-colors"
          >
            Ver detalhes ({duplicates + failed})
          </button>
        )}
        {showAiCoach && (
          <Link
            href="/app/ai-coach"
            className="text-xs px-3 py-1.5 rounded-lg border border-primary/30 text-primary bg-primary/10 hover:bg-primary/20 transition-colors"
          >
            <Brain size={12} className="inline mr-1" />Analisar com AI Coach
          </Link>
        )}
        <button
          onClick={onReset}
          className="text-xs px-3 py-1.5 rounded-lg border text-muted-foreground hover:bg-muted transition-colors"
        >
          Novo import
        </button>
      </div>

      <DiscrepancyModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        fileName={fileName}
        importedAt={importedAt}
        duration={duration}
        imported={imported}
        duplicates={duplicates}
        duplicateDetails={duplicateDetails}
        failed={failed}
        skippedDetails={skippedDetails}
      />
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add components/journal/ImportResult.tsx components/journal/DiscrepancyModal.tsx
git commit -m "feat: ImportResult KPIs and DiscrepancyModal"
```

### Task 4: Extend API with preview mode and skipped_details

**Files:**
- Modify: `app/api/journal/import-mt5/route.ts`

- [ ] **Step 1: Add preview query param support**

Read the existing route file. Add logic at the top of POST handler:
- Parse `url.searchParams.get("preview")`
- If `"true"`: parse file, return first 5 trades + total count + payouts count without inserting
- Response shape: `{ ok: true, preview: true, trades_found: number, payouts: number, sample: Array<{symbol, direction, lots, pnl, date}> }`

- [ ] **Step 2: Add skipped_details to import response**

During the import loop, collect skipped lines with reason:
- Track `skipped_details: Array<{ line: number; reason: string; data?: string }>`
- When a trade fails validation or insert, push to array with reason
- Add `skipped_details` to the response JSON
- Add `duplicate_details: Array<{ symbol: string; direction: string; date: string }>` for duplicated trades

- [ ] **Step 3: Add CSV format detection**

Before calling MT5 parsers, check file extension:
- `.csv` → call `parseCtraderCsv()` (from `lib/ctrader-parser.ts`)
- `.xlsx` → existing `parseMt5Xlsx()`
- `.html`/`.htm` → existing `parseMt5Html()`
- Unknown → return `{ ok: false, error: "Formato não suportado" }`

- [ ] **Step 4: Commit**

```bash
git add app/api/journal/import-mt5/route.ts
git commit -m "feat: API preview mode, skipped_details, and CSV format detection"
```

### Task 5: Integrate import flow into Journal page

**Files:**
- Modify: `app/app/journal/page.tsx`

- [ ] **Step 1: Read current journal page and understand import tab structure**

- [ ] **Step 2: Replace file input with stateful import flow**

Replace the current "Importar MT5" tab content with a state machine:
- `idle` → shows `ImportDropZone`
- `previewing` → calls API with `?preview=true`, shows `ImportPreview`
- `importing` → calls API without preview, shows progress bar
- `done` → shows `ImportResult`

State management via `useState<"idle"|"previewing"|"importing"|"done">("idle")`.

- [ ] **Step 3: Wire up file selection → preview → confirm → result flow**

- `onFileSelected` → set state to "previewing", call preview API, store response
- `onConfirm` → set state to "importing", call import API, store response
- `onReset` → set state back to "idle"
- `onCancel` → set state back to "idle"

- [ ] **Step 4: Commit**

```bash
git add app/app/journal/page.tsx
git commit -m "feat: Journal import with drag & drop, preview, and discrepancy modal"
```

---

## Chunk 2: Onboarding Step 4

### Task 6: Connect onboarding to ImportDropZone

**Files:**
- Modify: `app/onboarding/page.tsx`

- [ ] **Step 1: Read current onboarding page**

- [ ] **Step 2: Replace Step 4 placeholder with ImportDropZone**

In the Step 4 render section:
- Remove the "Disponível em breve" text and disabled state
- Import `ImportDropZone` and `ImportPreview` components
- Add `compact` prop to both
- Add state: `onboardingFile`, `previewData`, `importState`

- [ ] **Step 3: Implement inline import flow**

When file dropped:
1. Call preview API → show compact ImportPreview (3 trades)
2. On confirm → call import API → show inline success message
3. After 1.5s delay → redirect to `/app?imported=true`

"Explorar primeiro" button → redirect to `/app` (existing behavior, no change).

- [ ] **Step 4: Commit**

```bash
git add app/onboarding/page.tsx
git commit -m "feat: Onboarding step 4 connected to real import"
```

---

## Chunk 3: Dashboard Consolidated Accounts (Pro+)

### Task 7: Create AccountsOverview component

**Files:**
- Create: `components/dashboard/AccountsOverview.tsx`

- [ ] **Step 1: Create the component**

Component receives:
- `accounts: Account[]` (from existing types)
- `trades: JournalTrade[]` (from existing types)
- `propPayoutsTotal: number`

Renders:
- 4 header KPI cards: Capital Total, Total Sacado, P&L Mês, Contas Ativas
- Accounts table with columns: Conta, P&L Mês, DD Diário, DD Total, Win Rate, Status
- Uses `calc_drawdown` RPC for each prop account
- Sorted by drawdown risk (highest first)
- Status badges: "⚠️ Risco" (DD >70%), "OK", "Pessoal", "Crypto"
- Row highlight for at-risk accounts

- [ ] **Step 2: Commit**

```bash
git add components/dashboard/AccountsOverview.tsx
git commit -m "feat: AccountsOverview component with risk-sorted accounts table"
```

### Task 8: Integrate into Dashboard with PaywallGate

**Files:**
- Modify: `app/app/page.tsx`

- [ ] **Step 1: Read current dashboard page**

- [ ] **Step 2: Add AccountsOverview between calendar and performance**

- Import `AccountsOverview` and `PaywallGate`
- Fetch `prop_payouts` total: `supabase.from("prop_payouts").select("amount_usd")...`
- Wrap `AccountsOverview` in `<PaywallGate plan="pro">`
- Position after the calendar section, before performance + news

- [ ] **Step 3: Commit**

```bash
git add app/app/page.tsx
git commit -m "feat: Dashboard consolidated accounts view (Pro+) with PaywallGate"
```

---

## Chunk 4: cTrader Parser

### Task 9: Create cTrader CSV parser

**Files:**
- Create: `lib/ctrader-parser.ts`

- [ ] **Step 1: Create parser**

```typescript
// lib/ctrader-parser.ts
// Parses cTrader CSV export into standardized trade format
// Expected columns: Position ID, Symbol, Type (Buy/Sell), Volume, Entry Price,
//   Close Price, Profit, Commission, Swap, Open Time, Close Time
// Supports comma and semicolon delimiters
// External source: "ctrader"
```

Implementation:
- Read CSV as UTF-8 string
- Detect delimiter (comma vs semicolon) by checking first data line
- Find header row by looking for "Position" or "Symbol" column
- Map each row to trade object with: symbol, direction, lots (volume/100000), pnl_usd (profit + commission + swap), opened_at, closed_at, external_id (Position ID)
- Skip header/summary rows
- Return same `ParsedTrades` interface as MT5 parsers
- Set `external_source: "ctrader"`

- [ ] **Step 2: Commit**

```bash
git add lib/ctrader-parser.ts
git commit -m "feat: cTrader CSV parser"
```

### Task 10: Wire cTrader parser into API route

**Files:**
- Modify: `app/api/journal/import-mt5/route.ts`

- [ ] **Step 1: Import and integrate cTrader parser**

This was partially done in Task 4 Step 3. Verify:
- `import { parseCtraderCsv } from "@/lib/ctrader-parser"`
- CSV detection calls `parseCtraderCsv(buffer)`
- Trades from cTrader get `external_source: "ctrader"` for dedup

- [ ] **Step 2: Update drop zone badge**

In `ImportDropZone.tsx`, the cTrader badge is already enabled. No change needed.

- [ ] **Step 3: Commit**

```bash
git add app/api/journal/import-mt5/route.ts
git commit -m "feat: integrate cTrader parser into import API"
```

---

## Final: Push to deploy

- [ ] **Step 1: Run build to verify no errors**

```bash
npm run build
```

- [ ] **Step 2: Push to main for Vercel deploy**

```bash
git push origin main
```
