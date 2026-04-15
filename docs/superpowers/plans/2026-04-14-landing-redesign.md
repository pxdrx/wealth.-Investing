# Landing Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the landing page (`/`) into a compact, premium, convert+educate surface with a 7-feature interactive hero, bento features, and streamlined supporting sections — reducing ~2,800 LOC across 14 sections to ~1,200 LOC across 7 sections.

**Architecture:** Client-side Next.js 14 App Router page composed of focused landing components. The hero owns a client-side `activeFeature` state that crossfades between 7 pre-rendered panels. All other sections are server components for fast LCP. No canvas, no heavy animations — gradient radial + static BG dots only.

**Tech Stack:** Next.js 14 (App Router) · TypeScript strict · Tailwind CSS · framer-motion v12 · lucide-react · Vitest + @testing-library/react · Playwright MCP (for mobile/visual QA).

**Reference:** Design spec at `C:\Users\phalm\.claude\plans\polished-knitting-toucan.md`. Validated mockup at `.superpowers/brainstorm/4620-1776183407/content/hero-interactive-v4.html`.

---

## File Structure

**Create (new):**
- `components/landing/InteractiveFeatureShowcase.tsx` — client component, owns `activeFeature` state, renders pills + panel container + (desktop-only) callouts
- `components/landing/feature-panels/types.ts` — shared `FeatureKey` type + `FEATURES` constant array
- `components/landing/feature-panels/JournalPanel.tsx`
- `components/landing/feature-panels/AiCoachPanel.tsx`
- `components/landing/feature-panels/MacroPanel.tsx`
- `components/landing/feature-panels/DexterPanel.tsx`
- `components/landing/feature-panels/BacktestPanel.tsx`
- `components/landing/feature-panels/RiskPanel.tsx`
- `components/landing/feature-panels/MentorPanel.tsx`
- `components/landing/feature-panels/FlagIcon.tsx` — inline SVG flag components (US/EU/UK) reused by Macro panel
- `components/landing/BentoFeatures.tsx` — assimmetric 3-col grid with 7 cells
- `components/landing/HowItWorks.tsx` — 3 numbered steps
- `components/landing/PricingSummary.tsx` — compact block, links to `/pricing`
- `components/landing/TrustBar.tsx` — horizontal prop-firm logos
- `components/landing/__tests__/InteractiveFeatureShowcase.test.tsx`
- `components/landing/__tests__/featurePanels.test.tsx`
- `vitest.config.ts` (if missing) + `vitest.setup.ts` (jsdom + @testing-library/jest-dom)

**Rewrite:**
- `components/landing/Hero.tsx` — becomes a thin server-rendered shell that composes headline + CTAs + `<InteractiveFeatureShowcase />`. ~60 lines, no floating widgets, no 3D.
- `app/page.tsx` — orchestrates the 7 new sections.

**Keep as-is:**
- `components/landing/Navbar.tsx`
- `components/landing/Footer.tsx`
- `components/landing/LegalModals.tsx`

**Delete:**
- `components/landing/SpiralBackground.tsx`
- `components/landing/FeatureSection.tsx`
- `components/landing/FeatureVisuals.tsx`
- `components/landing/AIAssistant.tsx`
- `components/landing/MacroIntelligence.tsx`
- `components/landing/DexterSection.tsx`
- `components/landing/BacktestLandingSection.tsx`
- `components/landing/EnterpriseTrust.tsx`
- `components/landing/LandingPricing.tsx`
- `components/landing/Testimonial.tsx`
- `components/landing/feature-pages/mockups/` (unused children only — audit before bulk delete)

Each file above has exactly one responsibility. The 7 panel files are pure markup (props-less) and testable in isolation. The showcase owns all interactivity.

---

## Task 0: Branch + Vitest setup

**Files:**
- Create: `vitest.config.ts`
- Create: `vitest.setup.ts`
- Modify: `package.json` (scripts already contain `test`/`test:watch` — verify only)

- [ ] **Step 1: Create branch**

```bash
cd /c/Users/phalm/trading-dashboard
git checkout -b landing-redesign-v2
```

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
});
```

- [ ] **Step 3: Create `vitest.setup.ts`**

```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 4: Sanity check**

Run: `npm test -- --reporter=verbose`
Expected: "No test files found" (zero tests is fine).

- [ ] **Step 5: Commit**

```bash
git add vitest.config.ts vitest.setup.ts
git commit -m "chore: configure vitest for landing component tests"
```

---

## Task 1: Shared types + feature registry

**Files:**
- Create: `components/landing/feature-panels/types.ts`

- [ ] **Step 1: Write `types.ts`**

```ts
export type FeatureKey =
  | "journal"
  | "ai"
  | "macro"
  | "dexter"
  | "backtest"
  | "risk"
  | "mentor";

export interface FeatureMeta {
  key: FeatureKey;
  label: string;
}

export const FEATURES: readonly FeatureMeta[] = [
  { key: "journal", label: "Journal" },
  { key: "ai", label: "IA Coach" },
  { key: "macro", label: "Macroeconomia" },
  { key: "dexter", label: "Dexter" },
  { key: "backtest", label: "Backtest" },
  { key: "risk", label: "Risk" },
  { key: "mentor", label: "Mentor" },
] as const;

export const DEFAULT_FEATURE: FeatureKey = "journal";
```

- [ ] **Step 2: Commit**

```bash
git add components/landing/feature-panels/types.ts
git commit -m "feat(landing): add FeatureKey type and FEATURES registry"
```

---

## Task 2: FlagIcon (shared by Macro panel)

**Files:**
- Create: `components/landing/feature-panels/FlagIcon.tsx`

- [ ] **Step 1: Write `FlagIcon.tsx`**

```tsx
type Country = "US" | "EU" | "UK" | "JP" | "BR";

export function FlagIcon({ country, className = "" }: { country: Country; className?: string }) {
  const base = `inline-block rounded-[2px] shrink-0 ${className}`;
  switch (country) {
    case "US":
      return (
        <svg viewBox="0 0 20 14" className={`${base} w-5 h-[14px]`} aria-hidden>
          <rect width="20" height="14" fill="#b22234" />
          {[1, 3, 5, 7, 9, 11, 13].map((y) => (
            <rect key={y} y={y} width="20" height="1" fill="#fff" />
          ))}
          <rect width="8" height="7.5" fill="#3c3b6e" />
        </svg>
      );
    case "EU":
      return (
        <svg viewBox="0 0 20 14" className={`${base} w-5 h-[14px]`} aria-hidden>
          <rect width="20" height="14" fill="#003399" />
          <text x="10" y="11" textAnchor="middle" fontSize="11" fill="#ffcc00">★</text>
        </svg>
      );
    case "UK":
      return (
        <svg viewBox="0 0 20 14" className={`${base} w-5 h-[14px]`} aria-hidden>
          <rect width="20" height="14" fill="#012169" />
          <path d="M0,0 L20,14 M20,0 L0,14" stroke="#fff" strokeWidth="1.5" />
          <path d="M10,0 L10,14 M0,7 L20,7" stroke="#fff" strokeWidth="3" />
          <path d="M10,0 L10,14 M0,7 L20,7" stroke="#cf142b" strokeWidth="1.5" />
        </svg>
      );
    case "JP":
      return (
        <svg viewBox="0 0 20 14" className={`${base} w-5 h-[14px]`} aria-hidden>
          <rect width="20" height="14" fill="#fff" />
          <circle cx="10" cy="7" r="4" fill="#bc002d" />
        </svg>
      );
    case "BR":
      return (
        <svg viewBox="0 0 20 14" className={`${base} w-5 h-[14px]`} aria-hidden>
          <rect width="20" height="14" fill="#009c3b" />
          <polygon points="10,2 18,7 10,12 2,7" fill="#ffdf00" />
          <circle cx="10" cy="7" r="2.5" fill="#002776" />
        </svg>
      );
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add components/landing/feature-panels/FlagIcon.tsx
git commit -m "feat(landing): add FlagIcon (US/EU/UK/JP/BR)"
```

---

## Task 3: JournalPanel

**Files:**
- Create: `components/landing/feature-panels/JournalPanel.tsx`

- [ ] **Step 1: Write `JournalPanel.tsx`**

```tsx
export function JournalPanel() {
  return (
    <div className="h-full flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-2">
        <Kpi label="Net PnL" value="+$4.280" tone="green" />
        <Kpi label="Win rate" value="62%" />
        <Kpi label="Trades" value="147" />
      </div>
      <div className="flex-1 rounded-lg bg-white border border-zinc-100 p-3">
        <div className="text-[9px] uppercase tracking-wider text-zinc-400 mb-1.5">
          Equity curve · últimos 30 dias
        </div>
        <svg viewBox="0 0 400 130" preserveAspectRatio="none" className="w-full h-[140px]">
          <defs>
            <linearGradient id="eq-j" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#16a34a" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#16a34a" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d="M 0 100 L 30 92 L 60 96 L 90 78 L 120 84 L 150 65 L 180 70 L 210 50 L 240 55 L 270 38 L 300 42 L 330 26 L 360 30 L 400 18 L 400 130 L 0 130 Z"
            fill="url(#eq-j)"
          />
          <path
            d="M 0 100 L 30 92 L 60 96 L 90 78 L 120 84 L 150 65 L 180 70 L 210 50 L 240 55 L 270 38 L 300 42 L 330 26 L 360 30 L 400 18"
            stroke="#16a34a"
            strokeWidth="1.8"
            fill="none"
          />
        </svg>
      </div>
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone?: "green" | "red" }) {
  const color = tone === "green" ? "text-emerald-600" : tone === "red" ? "text-red-600" : "text-zinc-900";
  return (
    <div className="rounded-lg bg-white border border-zinc-100 p-2.5">
      <div className="text-[8px] uppercase tracking-wider text-zinc-400">{label}</div>
      <div className={`text-[15px] font-semibold mt-0.5 ${color}`}>{value}</div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/landing/feature-panels/JournalPanel.tsx
git commit -m "feat(landing): add JournalPanel (KPIs + equity curve)"
```

---

## Task 4: AiCoachPanel

**Files:**
- Create: `components/landing/feature-panels/AiCoachPanel.tsx`

- [ ] **Step 1: Write `AiCoachPanel.tsx`**

```tsx
const INSIGHTS = [
  { kind: "Melhor setup:", body: "pullback em EUR/USD na sessão de Londres (win rate 78%, 23 trades)." },
  { kind: "Alerta:", body: "você perde 2x mais nas quintas — revise seu plano." },
  { kind: "Sugestão:", body: "reduza tamanho em XAU nas news de CPI (DD médio -2.3%)." },
];

export function AiCoachPanel() {
  return (
    <div className="h-full flex flex-col gap-2">
      <div className="text-[10px] uppercase tracking-wider text-zinc-400 mb-1">
        IA Coach · análise automática
      </div>
      {INSIGHTS.map((i) => (
        <div
          key={i.kind}
          className="rounded-md border-l-[3px] border-violet-500 bg-violet-50 px-3 py-2.5 text-[11px] text-zinc-700 leading-snug"
        >
          <strong className="text-violet-700 font-semibold">{i.kind}</strong> {i.body}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/landing/feature-panels/AiCoachPanel.tsx
git commit -m "feat(landing): add AiCoachPanel (3 insight cards)"
```

---

## Task 5: MacroPanel

**Files:**
- Create: `components/landing/feature-panels/MacroPanel.tsx`

- [ ] **Step 1: Write `MacroPanel.tsx`**

```tsx
import { FlagIcon } from "./FlagIcon";

type Event = {
  country: "US" | "EU" | "UK";
  region: string;
  name: string;
  time: string;
  impact: "high" | "medium" | "low";
};

const EVENTS: Event[] = [
  { country: "US", region: "Estados Unidos", name: "CPI YoY", time: "14:30", impact: "high" },
  { country: "EU", region: "Zona do Euro", name: "ECB Rate Decision", time: "15:45", impact: "high" },
  { country: "US", region: "Estados Unidos", name: "PPI MoM", time: "17:00", impact: "medium" },
  { country: "US", region: "Estados Unidos", name: "NFP (Non-Farm Payrolls)", time: "19:30", impact: "high" },
  { country: "UK", region: "Reino Unido", name: "BOE Rate Decision", time: "20:00", impact: "medium" },
];

const IMPACT_COLOR: Record<Event["impact"], string> = {
  high: "bg-red-600",
  medium: "bg-amber-400",
  low: "bg-emerald-500",
};

export function MacroPanel() {
  return (
    <div className="h-full flex flex-col gap-1.5">
      <div className="text-[10px] uppercase tracking-wider text-zinc-400 mb-1">
        Calendário macroeconômico · hoje
      </div>
      {EVENTS.map((e) => (
        <div
          key={e.name}
          className="flex items-center justify-between rounded-md border border-zinc-100 bg-white px-3 py-2 text-[11px]"
        >
          <div className="flex items-center gap-2 min-w-0">
            <FlagIcon country={e.country} />
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-zinc-900 truncate">{e.name}</span>
              <span className="text-[9px] text-zinc-500">{e.region}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="font-semibold text-zinc-900">{e.time}</span>
            <span className={`w-2 h-2 rounded-full ${IMPACT_COLOR[e.impact]}`} aria-label={`impacto ${e.impact}`} />
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/landing/feature-panels/MacroPanel.tsx
git commit -m "feat(landing): add MacroPanel (5 events with flags + impact)"
```

---

## Task 6: DexterPanel

**Files:**
- Create: `components/landing/feature-panels/DexterPanel.tsx`

- [ ] **Step 1: Write `DexterPanel.tsx`**

```tsx
const LAYERS = [
  {
    num: "①",
    tag: "Basilar — fundamentos",
    tone: "blue" as const,
    body: "Real yields em queda (-2bps), DXY enfraquecendo após CPI. Ambiente positivo pra ouro no médio prazo.",
  },
  {
    num: "②",
    tag: "Técnica",
    tone: "violet" as const,
    body: "Rompimento de $2.680 com volume. Próxima resistência em $2.715 (high mensal). Stop abaixo de $2.660.",
  },
  {
    num: "③",
    tag: "Risco",
    tone: "amber" as const,
    body: "Risk/Reward 1:2.5 no setup atual. Evitar entradas 30min antes do NFP (19:30).",
  },
  {
    num: "④",
    tag: "Topo da cadeia — tese",
    tone: "emerald" as const,
    body: "Compra com alvo $2.715. Invalidação técnica em $2.660. Confluência: fundamento + técnico + timing favorável.",
  },
];

const TONE: Record<"blue" | "violet" | "amber" | "emerald", string> = {
  blue: "text-blue-600",
  violet: "text-violet-600",
  amber: "text-amber-600",
  emerald: "text-emerald-600",
};

export function DexterPanel() {
  return (
    <div className="h-full flex flex-col gap-1.5">
      <div className="text-[10px] uppercase tracking-wider text-zinc-400 mb-1">
        Dexter · análise de XAU/USD
      </div>
      <div className="flex items-center gap-2.5 rounded-md border border-zinc-100 bg-white px-3 py-2 mb-1">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-violet-700 text-white flex items-center justify-center text-sm font-semibold">
          D
        </div>
        <div>
          <div className="text-[12px] font-semibold text-zinc-900">Análise completa — Ouro</div>
          <div className="text-[9px] text-zinc-500">Executada há 2min · 4 camadas</div>
        </div>
      </div>
      {LAYERS.map((l) => (
        <div key={l.tag} className="rounded-md border border-zinc-100 bg-white px-2.5 py-2">
          <div className={`text-[8px] uppercase tracking-wider font-semibold mb-0.5 ${TONE[l.tone]}`}>
            {l.num} {l.tag}
          </div>
          <p className="text-[10px] text-zinc-700 leading-snug m-0">{l.body}</p>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/landing/feature-panels/DexterPanel.tsx
git commit -m "feat(landing): add DexterPanel (4-layer analyst report)"
```

---

## Task 7: BacktestPanel

**Files:**
- Create: `components/landing/feature-panels/BacktestPanel.tsx`

- [ ] **Step 1: Write `BacktestPanel.tsx`**

```tsx
type Day = { d: number; p?: string; tone?: "pos" | "neg" };
const DAYS: Day[] = [
  { d: 23 }, { d: 24 }, { d: 25 }, { d: 26 }, { d: 27 }, { d: 28 }, { d: 1 },
  { d: 2, p: "+$890", tone: "pos" }, { d: 3, p: "+$1.2k", tone: "pos" },
  { d: 4, p: "-$2k", tone: "neg" }, { d: 5, p: "-$330", tone: "neg" },
  { d: 6, p: "+$1.3k", tone: "pos" }, { d: 7 }, { d: 8 },
  { d: 9, p: "-$2k", tone: "neg" }, { d: 10, p: "-$2k", tone: "neg" },
  { d: 11, p: "+$1.4k", tone: "pos" }, { d: 12, p: "-$260", tone: "neg" },
  { d: 13, p: "+$1.6k", tone: "pos" }, { d: 14 }, { d: 15 },
  { d: 16, p: "+$1.1k", tone: "pos" }, { d: 17, p: "-$480", tone: "neg" },
  { d: 18, p: "+$1.4k", tone: "pos" }, { d: 19, p: "-$200", tone: "neg" },
  { d: 20, p: "-$620", tone: "neg" }, { d: 21 }, { d: 22 },
];

const ACCOUNTS = ["Todas", "Fimathe XAU 3am", "Fimathe XAU", "Fimathe S&P"];

export function BacktestPanel() {
  return (
    <div className="h-full flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[12px] font-semibold text-zinc-900">Backtest</div>
          <div className="text-[9px] text-zinc-500">3 contas · 34 trades</div>
        </div>
      </div>
      <div className="flex gap-1 flex-wrap">
        {ACCOUNTS.map((a, i) => (
          <span
            key={a}
            className={
              i === 0
                ? "rounded-full px-2 py-0.5 text-[9px] font-medium bg-violet-100 text-violet-700 border border-violet-200"
                : "rounded-full px-2 py-0.5 text-[9px] text-zinc-600 border border-zinc-200 bg-white"
            }
          >
            {a}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-6 gap-1">
        <BtKpi l="P&L" v="-$1.680" tone="red" />
        <BtKpi l="Win rate" v="55.9%" />
        <BtKpi l="PF" v="0.88" />
        <BtKpi l="Trades" v="19W/15L" />
        <BtKpi l="Max DD" v="-$5.080" tone="red" />
        <BtKpi l="Total" v="34" />
      </div>
      <div className="rounded-lg border border-zinc-100 bg-white p-2">
        <div className="flex justify-between items-center mb-1.5">
          <div className="text-[10px] font-semibold text-zinc-900">‹ Março 2026 ›</div>
          <div className="text-[9px] font-semibold text-red-600">P&L: -$1.7k</div>
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {DAYS.map((d, i) => (
            <div
              key={i}
              className={
                "aspect-[1.4] rounded px-1 py-0.5 text-[7px] flex flex-col justify-between border " +
                (d.tone === "pos"
                  ? "bg-emerald-100 border-emerald-200"
                  : d.tone === "neg"
                  ? "bg-red-100 border-red-200"
                  : "bg-zinc-50 border-zinc-100")
              }
            >
              <div className="text-zinc-500">{d.d}</div>
              {d.p && (
                <div
                  className={
                    "font-semibold text-[7px] " +
                    (d.tone === "pos" ? "text-emerald-700" : "text-red-700")
                  }
                >
                  {d.p}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BtKpi({ l, v, tone }: { l: string; v: string; tone?: "red" | "green" }) {
  const color = tone === "red" ? "text-red-600" : tone === "green" ? "text-emerald-600" : "text-zinc-900";
  return (
    <div className="rounded bg-white border border-zinc-100 px-1.5 py-1">
      <div className="text-[7px] uppercase tracking-wider text-zinc-400">{l}</div>
      <div className={`text-[11px] font-semibold mt-0.5 ${color}`}>{v}</div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/landing/feature-panels/BacktestPanel.tsx
git commit -m "feat(landing): add BacktestPanel (mirrors real backtest tab)"
```

---

## Task 8: RiskPanel

**Files:**
- Create: `components/landing/feature-panels/RiskPanel.tsx`

- [ ] **Step 1: Write `RiskPanel.tsx`**

```tsx
type Bar = { label: string; left: string; right: string; pct: number; tone: "red" | "green" | "gray" };

const BARS: Bar[] = [
  { label: "Drawdown diário", left: "-2.1%", right: "-5.0%", pct: 42, tone: "red" },
  { label: "Drawdown total", left: "-4.1%", right: "-10.0%", pct: 41, tone: "red" },
  { label: "Profit target", left: "+6.2%", right: "+8.0%", pct: 77, tone: "green" },
  { label: "Dias operados", left: "17", right: "30", pct: 57, tone: "gray" },
];

const BAR_COLOR: Record<Bar["tone"], string> = {
  red: "bg-red-600",
  green: "bg-emerald-600",
  gray: "bg-zinc-500",
};
const VALUE_COLOR: Record<Bar["tone"], string> = {
  red: "text-red-600",
  green: "text-emerald-600",
  gray: "text-zinc-900",
};

export function RiskPanel() {
  return (
    <div className="h-full flex flex-col gap-1.5">
      <div className="text-[10px] uppercase tracking-wider text-zinc-400 mb-1">
        Risk · The5ers 100k
      </div>
      {BARS.map((b) => (
        <div key={b.label} className="rounded-md border border-zinc-100 bg-white px-3 py-2.5">
          <div className="flex justify-between text-[10px] text-zinc-600 mb-1.5">
            <span>{b.label}</span>
            <span>
              <strong className={`font-semibold ${VALUE_COLOR[b.tone]}`}>{b.left}</strong>
              {" / "}
              <span className="text-zinc-500">{b.right}</span>
            </span>
          </div>
          <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${BAR_COLOR[b.tone]}`} style={{ width: `${b.pct}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/landing/feature-panels/RiskPanel.tsx
git commit -m "feat(landing): add RiskPanel (DD red, profit green)"
```

---

## Task 9: MentorPanel

**Files:**
- Create: `components/landing/feature-panels/MentorPanel.tsx`

- [ ] **Step 1: Write `MentorPanel.tsx`**

```tsx
type Student = {
  initials: string;
  name: string;
  pnl: string;
  pnlTone: "green" | "red";
  wr: string;
  trades: number;
  status: "ok" | "warn" | "err";
  gradient: string;
};

const STUDENTS: Student[] = [
  { initials: "RC", name: "Rafael Coutinho", pnl: "+12.4%", pnlTone: "green", wr: "64%", trades: 47, status: "ok", gradient: "from-blue-500 to-blue-700" },
  { initials: "LP", name: "Lucas Pereira", pnl: "+4.3%", pnlTone: "green", wr: "58%", trades: 29, status: "ok", gradient: "from-emerald-500 to-emerald-700" },
  { initials: "MF", name: "Maria Ferraz", pnl: "-1.8%", pnlTone: "red", wr: "42%", trades: 18, status: "warn", gradient: "from-violet-500 to-violet-700" },
];

const BADGE: Record<Student["status"], string> = {
  ok: "bg-emerald-100 text-emerald-700",
  warn: "bg-amber-100 text-amber-700",
  err: "bg-red-100 text-red-700",
};
const BADGE_LABEL: Record<Student["status"], string> = {
  ok: "Ativo",
  warn: "Atenção",
  err: "Crítico",
};

export function MentorPanel() {
  return (
    <div className="h-full flex flex-col gap-1.5">
      <div className="text-[10px] uppercase tracking-wider text-zinc-400 mb-1">
        Mentor · seus alunos
      </div>
      {STUDENTS.map((s) => (
        <div
          key={s.name}
          className="flex items-center gap-2.5 rounded-xl border border-zinc-100 bg-white px-3 py-2.5"
        >
          <div
            className={`w-8 h-8 rounded-full bg-gradient-to-br ${s.gradient} text-white flex items-center justify-center text-[11px] font-semibold shrink-0`}
          >
            {s.initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-semibold text-zinc-900 truncate">{s.name}</div>
            <div className="flex gap-2 mt-0.5 text-[9px] text-zinc-500">
              <span>
                PnL:{" "}
                <strong className={s.pnlTone === "green" ? "text-emerald-600" : "text-red-600"}>
                  {s.pnl}
                </strong>
              </span>
              <span>
                WR <strong className="text-zinc-900">{s.wr}</strong>
              </span>
              <span>{s.trades} trades</span>
            </div>
          </div>
          <span
            className={`text-[8px] px-1.5 py-0.5 rounded-full font-semibold uppercase tracking-wider ${BADGE[s.status]}`}
          >
            {BADGE_LABEL[s.status]}
          </span>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/landing/feature-panels/MentorPanel.tsx
git commit -m "feat(landing): add MentorPanel (3 students with status badges)"
```

---

## Task 10: InteractiveFeatureShowcase + tests

**Files:**
- Create: `components/landing/InteractiveFeatureShowcase.tsx`
- Create: `components/landing/__tests__/InteractiveFeatureShowcase.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
// components/landing/__tests__/InteractiveFeatureShowcase.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { InteractiveFeatureShowcase } from "../InteractiveFeatureShowcase";

describe("InteractiveFeatureShowcase", () => {
  it("renders Journal panel by default", () => {
    render(<InteractiveFeatureShowcase />);
    expect(screen.getByRole("tab", { name: "Journal" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText(/Equity curve/i)).toBeInTheDocument();
  });

  it("switches to IA Coach panel when its pill is clicked", () => {
    render(<InteractiveFeatureShowcase />);
    fireEvent.click(screen.getByRole("tab", { name: "IA Coach" }));
    expect(screen.getByRole("tab", { name: "IA Coach" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText(/análise automática/i)).toBeInTheDocument();
  });

  it("switches to Macroeconomia panel", () => {
    render(<InteractiveFeatureShowcase />);
    fireEvent.click(screen.getByRole("tab", { name: "Macroeconomia" }));
    expect(screen.getByText(/Calendário macroeconômico/i)).toBeInTheDocument();
  });

  it("renders all 7 pills", () => {
    render(<InteractiveFeatureShowcase />);
    ["Journal", "IA Coach", "Macroeconomia", "Dexter", "Backtest", "Risk", "Mentor"].forEach((label) => {
      expect(screen.getByRole("tab", { name: label })).toBeInTheDocument();
    });
  });

  it("shows callouts only on Journal panel (desktop)", () => {
    render(<InteractiveFeatureShowcase />);
    // Callouts container has data-testid="showcase-callouts"
    expect(screen.getByTestId("showcase-callouts")).toHaveAttribute("data-visible", "true");
    fireEvent.click(screen.getByRole("tab", { name: "Dexter" }));
    expect(screen.getByTestId("showcase-callouts")).toHaveAttribute("data-visible", "false");
  });
});
```

- [ ] **Step 2: Run test — expect failure**

Run: `npm test -- InteractiveFeatureShowcase`
Expected: FAIL (module not found).

- [ ] **Step 3: Write `InteractiveFeatureShowcase.tsx`**

```tsx
"use client";

import { useState } from "react";
import { FEATURES, DEFAULT_FEATURE, type FeatureKey } from "./feature-panels/types";
import { JournalPanel } from "./feature-panels/JournalPanel";
import { AiCoachPanel } from "./feature-panels/AiCoachPanel";
import { MacroPanel } from "./feature-panels/MacroPanel";
import { DexterPanel } from "./feature-panels/DexterPanel";
import { BacktestPanel } from "./feature-panels/BacktestPanel";
import { RiskPanel } from "./feature-panels/RiskPanel";
import { MentorPanel } from "./feature-panels/MentorPanel";

const PANELS: Record<FeatureKey, () => JSX.Element> = {
  journal: JournalPanel,
  ai: AiCoachPanel,
  macro: MacroPanel,
  dexter: DexterPanel,
  backtest: BacktestPanel,
  risk: RiskPanel,
  mentor: MentorPanel,
};

export function InteractiveFeatureShowcase() {
  const [active, setActive] = useState<FeatureKey>(DEFAULT_FEATURE);
  const ActivePanel = PANELS[active];
  const showCallouts = active === "journal";

  return (
    <div className="grid lg:grid-cols-[1fr_1.15fr] gap-8 lg:gap-12 items-center">
      {/* Left: pills + copy happen at Hero level; this component focuses on the showcase itself.
          For mobile/tablet test rendering we include pills here so the component is self-contained. */}
      <div
        role="tablist"
        aria-label="Funcionalidades"
        className="flex flex-wrap gap-1.5 lg:gap-2"
      >
        {FEATURES.map((f) => {
          const isActive = active === f.key;
          return (
            <button
              key={f.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${f.key}`}
              onClick={() => setActive(f.key)}
              className={
                "rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors min-h-[36px] active:scale-95 " +
                (isActive
                  ? "bg-zinc-900 text-white border border-zinc-900"
                  : "bg-white text-zinc-600 border border-zinc-200 hover:border-zinc-400")
              }
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Screenshot wrapper */}
      <div className="relative px-0 lg:px-6 py-5">
        <div
          id={`panel-${active}`}
          role="tabpanel"
          aria-labelledby={`tab-${active}`}
          className="relative rounded-xl border border-zinc-200 bg-gradient-to-b from-white to-zinc-50 shadow-[0_24px_48px_-16px_rgba(0,0,0,0.14)] h-[360px] p-4 overflow-hidden"
        >
          <div className="flex gap-1.5 mb-3">
            <span className="w-2 h-2 rounded-full bg-red-400" />
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
          </div>
          <div className="h-[calc(100%-20px)]">
            <ActivePanel />
          </div>
        </div>

        {/* Callouts — desktop only, only when Journal */}
        <div
          data-testid="showcase-callouts"
          data-visible={showCallouts}
          className={
            "hidden lg:block pointer-events-none transition-opacity duration-300 " +
            (showCallouts ? "opacity-100" : "opacity-0")
          }
        >
          <Callout tone="violet" label="IA Coach" value="3 insights" className="absolute top-2 -left-4" />
          <Callout tone="blue" label="Macroeconomia" value="CPI 14h" className="absolute top-1/2 -right-6 -translate-y-1/2" />
          <Callout tone="amber" label="Drawdown" value="-4.1%" className="absolute bottom-2 left-6" />
        </div>
      </div>
    </div>
  );
}

function Callout({
  tone,
  label,
  value,
  className = "",
}: {
  tone: "violet" | "blue" | "amber";
  label: string;
  value: string;
  className?: string;
}) {
  const iconBg = {
    violet: "bg-violet-100 text-violet-700",
    blue: "bg-blue-100 text-blue-700",
    amber: "bg-amber-100 text-amber-700",
  }[tone];
  const iconChar = { violet: "✦", blue: "◑", amber: "⚠" }[tone];
  return (
    <div
      className={
        "bg-white rounded-xl px-3 py-2 text-[10px] shadow-[0_12px_28px_-8px_rgba(0,0,0,0.18)] flex items-center gap-2 z-10 " +
        className
      }
    >
      <div className={`w-[22px] h-[22px] rounded-md flex items-center justify-center text-[11px] ${iconBg}`}>
        {iconChar}
      </div>
      <div>
        <div className="text-zinc-500 text-[9px]">{label}</div>
        <div className="font-semibold text-zinc-900 text-[12px]">{value}</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests — expect pass**

Run: `npm test -- InteractiveFeatureShowcase`
Expected: all 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add components/landing/InteractiveFeatureShowcase.tsx components/landing/__tests__/InteractiveFeatureShowcase.test.tsx
git commit -m "feat(landing): add InteractiveFeatureShowcase with 7-panel tablist"
```

---

## Task 11: Rewrite Hero.tsx

**Files:**
- Modify: `components/landing/Hero.tsx` (full rewrite)

- [ ] **Step 1: Replace file contents**

```tsx
import Link from "next/link";
import { InteractiveFeatureShowcase } from "./InteractiveFeatureShowcase";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Subtle radial gradient — replaces SpiralBackground */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none -z-10"
        style={{
          background:
            "radial-gradient(ellipse at top, rgba(255,255,255,0.6), transparent 60%)",
        }}
      />
      <div className="mx-auto max-w-6xl px-6 pt-16 pb-20 lg:pt-24 lg:pb-28">
        <div className="grid lg:grid-cols-[1fr_1.15fr] gap-8 lg:gap-12 items-center">
          <div>
            <h1 className="text-[32px] lg:text-[44px] font-semibold leading-tight-apple tracking-tight-apple text-zinc-900">
              A plataforma completa do{" "}
              <span className="text-zinc-500 italic font-normal">trader profissional.</span>
            </h1>
            <p className="mt-4 text-[13px] lg:text-[15px] text-zinc-600 leading-relaxed max-w-[360px]">
              Journal automatizado, IA que lê seu histórico, calendário macroeconômico, backtest e
              gestão de risco para prop firms — tudo num lugar só.
            </p>
            <div className="mt-5 flex items-center gap-2">
              <Link
                href="/login"
                className="inline-flex items-center rounded-full bg-zinc-900 text-white px-5 py-2.5 text-[12px] font-medium hover:bg-zinc-800 transition-colors min-h-[44px]"
              >
                Começar grátis
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center text-zinc-600 hover:text-zinc-900 px-3.5 py-2.5 text-[12px] transition-colors"
              >
                Ver preços →
              </Link>
            </div>
            <div className="mt-5 flex items-center gap-2.5">
              <div className="flex">
                {[
                  { bg: "from-orange-500 to-orange-600", l: "M" },
                  { bg: "from-blue-500 to-blue-700", l: "R" },
                  { bg: "from-emerald-500 to-emerald-600", l: "L" },
                  { bg: "from-violet-500 to-violet-600", l: "A" },
                  { bg: "from-red-500 to-red-600", l: "P" },
                ].map((a, i) => (
                  <div
                    key={a.l}
                    style={{ marginLeft: i === 0 ? 0 : -7 }}
                    className={`w-6 h-6 rounded-full border-2 border-zinc-50 bg-gradient-to-br ${a.bg} text-white text-[10px] font-semibold flex items-center justify-center`}
                  >
                    {a.l}
                  </div>
                ))}
              </div>
              <div className="text-[11px] text-zinc-600">
                <strong className="font-semibold text-zinc-900">+430 traders</strong> já usam diariamente
              </div>
            </div>
          </div>
          <div>
            <InteractiveFeatureShowcase />
          </div>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Run tests**

Run: `npm test`
Expected: showcase tests PASS (hero has no tests).

- [ ] **Step 3: Commit**

```bash
git add components/landing/Hero.tsx
git commit -m "feat(landing): rewrite Hero as split + interactive showcase"
```

---

## Task 12: TrustBar

**Files:**
- Create: `components/landing/TrustBar.tsx`

- [ ] **Step 1: Write `TrustBar.tsx`**

```tsx
const FIRMS = ["The5ers", "FTMO", "FundedNext", "MyForexFunds", "Apex", "Topstep"];

export function TrustBar() {
  return (
    <section className="border-y border-zinc-200 bg-white/60 backdrop-blur-sm">
      <div className="mx-auto max-w-6xl px-6 py-6 flex flex-col md:flex-row items-center gap-4 md:gap-8">
        <span className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium shrink-0">
          Compatível com sua prop firm
        </span>
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 md:gap-x-8">
          {FIRMS.map((f) => (
            <span
              key={f}
              className="text-[13px] font-semibold text-zinc-400 hover:text-zinc-700 transition-colors"
            >
              {f}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/landing/TrustBar.tsx
git commit -m "feat(landing): add TrustBar with prop firm logos"
```

---

## Task 13: BentoFeatures

**Files:**
- Create: `components/landing/BentoFeatures.tsx`

- [ ] **Step 1: Write `BentoFeatures.tsx`**

```tsx
import {
  BookOpen,
  Sparkles,
  CalendarClock,
  Brain,
  History,
  Shield,
  GraduationCap,
} from "lucide-react";
import type { ReactNode } from "react";

type Cell = {
  icon: ReactNode;
  title: string;
  body: string;
  className: string;
  dark?: boolean;
};

const CELLS: Cell[] = [
  {
    icon: <BookOpen className="w-5 h-5" />,
    title: "Journal automatizado",
    body: "Importe MT5/MT4 em segundos. PnL real, win rate, equity curve — sem planilha.",
    className: "lg:col-span-2 lg:row-span-2",
    dark: true,
  },
  {
    icon: <Sparkles className="w-5 h-5" />,
    title: "IA Coach",
    body: "Insights automáticos sobre seus padrões — melhor setup, alertas e sugestões.",
    className: "",
  },
  {
    icon: <CalendarClock className="w-5 h-5" />,
    title: "Macroeconomia",
    body: "Calendário com CPI, NFP, decisões de juros e impacto por notícia.",
    className: "",
  },
  {
    icon: <Brain className="w-5 h-5" />,
    title: "Dexter",
    body: "Analista que faz análise basilar à topo da cadeia do ativo que você escolher.",
    className: "",
  },
  {
    icon: <History className="w-5 h-5" />,
    title: "Backtest",
    body: "Teste estratégias com dados reais. Sharpe, PF, max DD e calendário operacional.",
    className: "lg:col-span-2",
  },
  {
    icon: <Shield className="w-5 h-5" />,
    title: "Risk / Prop firms",
    body: "Drawdown diário e total, profit target, dias operados. Alertas antes de quebrar regra.",
    className: "",
  },
  {
    icon: <GraduationCap className="w-5 h-5" />,
    title: "Mentor",
    body: "Acompanhe alunos, veja PnL, WR e status de cada um. Badges de atenção automáticos.",
    className: "lg:col-span-2",
  },
];

export function BentoFeatures() {
  return (
    <section className="py-16 lg:py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-10 lg:mb-14 text-center lg:text-left">
          <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium mb-2">
            Funcionalidades
          </div>
          <h2 className="text-[28px] lg:text-[40px] font-semibold leading-tight-apple tracking-tight-apple text-zinc-900 max-w-xl">
            Tudo que seu trading precisa.{" "}
            <span className="text-zinc-500 italic font-normal">Num lugar só.</span>
          </h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 lg:gap-4">
          {CELLS.map((c) => (
            <div
              key={c.title}
              className={
                "rounded-[22px] p-6 border " +
                (c.dark
                  ? "bg-zinc-900 text-white border-zinc-800"
                  : "bg-white text-zinc-900 border-zinc-200") +
                " " +
                c.className
              }
            >
              <div
                className={
                  "w-9 h-9 rounded-lg flex items-center justify-center mb-4 " +
                  (c.dark ? "bg-zinc-800 text-zinc-300" : "bg-zinc-100 text-zinc-700")
                }
              >
                {c.icon}
              </div>
              <h3 className="text-[16px] font-semibold mb-1.5 tracking-tight-apple">{c.title}</h3>
              <p className={"text-[13px] leading-snug " + (c.dark ? "text-zinc-400" : "text-zinc-600")}>
                {c.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/landing/BentoFeatures.tsx
git commit -m "feat(landing): add BentoFeatures (7-cell asymmetric grid)"
```

---

## Task 14: HowItWorks

**Files:**
- Create: `components/landing/HowItWorks.tsx`

- [ ] **Step 1: Write `HowItWorks.tsx`**

```tsx
const STEPS = [
  { n: "01", title: "Importe", body: "MT5/MT4 em segundos. XLSX ou HTML — sem cadastrar credenciais de corretora." },
  { n: "02", title: "Analise", body: "IA lê seu histórico e mostra padrões que você não via. Journal preenche sozinho." },
  { n: "03", title: "Evolua", body: "Decisões baseadas em dados reais, não em intuição. Prop firms mais próximas." },
];

export function HowItWorks() {
  return (
    <section className="py-16 lg:py-20 bg-white border-y border-zinc-200">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-10 text-center lg:text-left">
          <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium mb-2">
            Como funciona
          </div>
          <h2 className="text-[28px] lg:text-[36px] font-semibold leading-tight-apple tracking-tight-apple text-zinc-900 max-w-xl">
            Três passos.{" "}
            <span className="text-zinc-500 italic font-normal">Zero fricção.</span>
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {STEPS.map((s) => (
            <div key={s.n} className="flex flex-col">
              <div className="text-[48px] font-semibold tracking-tight-apple text-zinc-300 leading-none mb-3">
                {s.n}
              </div>
              <h3 className="text-[18px] font-semibold text-zinc-900 mb-2 tracking-tight-apple">
                {s.title}
              </h3>
              <p className="text-[14px] text-zinc-600 leading-snug">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/landing/HowItWorks.tsx
git commit -m "feat(landing): add HowItWorks (3 numbered steps)"
```

---

## Task 15: PricingSummary

**Files:**
- Create: `components/landing/PricingSummary.tsx`

- [ ] **Step 1: Write `PricingSummary.tsx`**

```tsx
import Link from "next/link";

const TIERS = [
  { name: "Grátis", desc: "Journal básico, até 1 conta prop, IA Coach limitada." },
  { name: "Pro", desc: "Tudo grátis + contas ilimitadas, IA Coach completa, macroeconomia e backtest." },
  { name: "Mentor", desc: "Tudo Pro + painel de alunos, códigos de convite, gestão de turmas." },
];

export function PricingSummary() {
  return (
    <section className="py-16 lg:py-24">
      <div className="mx-auto max-w-4xl px-6 text-center">
        <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium mb-2">
          Preços
        </div>
        <h2 className="text-[28px] lg:text-[36px] font-semibold leading-tight-apple tracking-tight-apple text-zinc-900 mb-3">
          Planos a partir de <span className="text-zinc-500 italic font-normal">R$0/mês.</span>
        </h2>
        <p className="text-[14px] text-zinc-600 max-w-xl mx-auto mb-10">
          Comece grátis. Faça upgrade quando quiser — sem contrato, sem taxa de cancelamento.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-10">
          {TIERS.map((t) => (
            <div
              key={t.name}
              className="rounded-[22px] border border-zinc-200 bg-white p-5 text-left"
            >
              <div className="text-[14px] font-semibold text-zinc-900 mb-1.5">{t.name}</div>
              <p className="text-[12px] text-zinc-600 leading-snug">{t.desc}</p>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Link
            href="/pricing"
            className="inline-flex items-center rounded-full bg-zinc-900 text-white px-5 py-2.5 text-[12px] font-medium hover:bg-zinc-800 transition-colors min-h-[44px]"
          >
            Ver todos os planos →
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center text-zinc-600 hover:text-zinc-900 px-3.5 py-2.5 text-[12px] transition-colors"
          >
            Começar grátis
          </Link>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/landing/PricingSummary.tsx
git commit -m "feat(landing): add PricingSummary (redirect to /pricing)"
```

---

## Task 16: Rewrite app/page.tsx

**Files:**
- Modify: `app/page.tsx` (full rewrite)

- [ ] **Step 1: Read current file to know what to preserve**

```bash
cat app/page.tsx
```

Note: Navbar import paths, any metadata export, legal modal mount.

- [ ] **Step 2: Replace with new orchestration**

```tsx
import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { TrustBar } from "@/components/landing/TrustBar";
import { BentoFeatures } from "@/components/landing/BentoFeatures";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { PricingSummary } from "@/components/landing/PricingSummary";
import { Footer } from "@/components/landing/Footer";

export default function LandingPage() {
  return (
    <main className="bg-zinc-50 text-zinc-900 min-h-screen">
      <Navbar />
      <Hero />
      <TrustBar />
      <BentoFeatures />
      <HowItWorks />
      <PricingSummary />
      <Footer />
    </main>
  );
}
```

- [ ] **Step 3: Run build**

Run: `npm run build`
Expected: build succeeds. Type errors would indicate a mismatched component export.

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx
git commit -m "feat(landing): orchestrate 7-section landing in app/page.tsx"
```

---

## Task 17: Delete old landing components

**Files (delete):**
- `components/landing/SpiralBackground.tsx`
- `components/landing/FeatureSection.tsx`
- `components/landing/FeatureVisuals.tsx`
- `components/landing/AIAssistant.tsx`
- `components/landing/MacroIntelligence.tsx`
- `components/landing/DexterSection.tsx`
- `components/landing/BacktestLandingSection.tsx`
- `components/landing/EnterpriseTrust.tsx`
- `components/landing/LandingPricing.tsx`
- `components/landing/Testimonial.tsx`

- [ ] **Step 1: Verify no other files import these**

Run: `grep -r "SpiralBackground\|FeatureSection\|FeatureVisuals\|AIAssistant\|MacroIntelligence\|DexterSection\|BacktestLandingSection\|EnterpriseTrust\|LandingPricing\|Testimonial" --include="*.tsx" --include="*.ts" -l app/ components/`
Expected: no output (only self-references inside the components being deleted). If anything in `app/` or `components/` imports them besides `page.tsx` (already rewritten), investigate before deleting.

- [ ] **Step 2: Delete files**

```bash
rm components/landing/SpiralBackground.tsx \
   components/landing/FeatureSection.tsx \
   components/landing/FeatureVisuals.tsx \
   components/landing/AIAssistant.tsx \
   components/landing/MacroIntelligence.tsx \
   components/landing/DexterSection.tsx \
   components/landing/BacktestLandingSection.tsx \
   components/landing/EnterpriseTrust.tsx \
   components/landing/LandingPricing.tsx \
   components/landing/Testimonial.tsx
```

- [ ] **Step 3: Build + type-check**

Run: `npm run build`
Expected: success. Any compile error → a hidden importer exists; restore the file(s) and re-run Step 1 with wider scope.

- [ ] **Step 4: Commit**

```bash
git add -A components/landing/
git commit -m "chore(landing): remove deprecated sections replaced by redesign"
```

---

## Task 18: Audit + delete unused mockup assets

**Files:**
- Review: `components/landing/feature-pages/mockups/`

- [ ] **Step 1: Enumerate + check usage**

Run: `ls components/landing/feature-pages/mockups/ 2>/dev/null`

For each file returned, run:
`grep -r "<filename-without-ext>" --include="*.tsx" --include="*.ts" app/ components/`

Any file with zero matches → safe to delete. Any file still imported → leave in place.

- [ ] **Step 2: Delete unused files**

Remove only the unreferenced ones (build list in Step 1). Example:
```bash
rm components/landing/feature-pages/mockups/UnusedMockup.tsx
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: success.

- [ ] **Step 4: Commit**

```bash
git add -A components/landing/feature-pages/
git commit -m "chore(landing): prune unused feature-page mockups"
```

---

## Task 19: Manual visual QA — desktop

**Files:** none (QA pass)

- [ ] **Step 1: Start dev server**

Run: `npm run dev`
Wait for `http://localhost:3000` to be ready.

- [ ] **Step 2: Visual checks on `/`**

Open `http://localhost:3000` and verify:
- Hero: "A plataforma completa do **trader profissional**" (not "sério")
- Pill "Macroeconomia" visible (not abbreviated)
- Social proof reads "+430 traders"
- Default panel shows Journal KPIs + equity curve + 3 callouts (IA Coach / Macroeconomia / Drawdown) flutuando nas bordas do wrapper
- Clicking each of the 7 pills swaps the right panel
- Callouts fade out when leaving Journal, fade in when returning
- Bento features section visible below Hero with 7 cells and asymmetric layout
- HowItWorks 3 steps visible
- PricingSummary with 3 tier cards + CTA to `/pricing`
- Footer renders

- [ ] **Step 3: Dark mode check**

Toggle theme (if site has theme toggle). Verify no section is broken — text contrast remains ≥4.5, bento dark cell still legible.

- [ ] **Step 4: Commit any fixes uncovered**

If anything needed adjustment, commit fixes with `fix(landing): <description>` before proceeding.

---

## Task 20: Mobile/tablet QA with Playwright MCP

**Files:** none (QA pass)

- [ ] **Step 1: Open MCP playwright tool, navigate to `http://localhost:3000`**

Use `mcp__playwright__*` tools to:
1. Launch browser at viewport 390×844 (iPhone 13)
2. Navigate to `http://localhost:3000`

- [ ] **Step 2: Mobile assertions**

Verify:
- Headline renders at ~20-24px, no overflow
- Pills scroll horizontally (swipe), active pill visually highlighted
- Screenshot container appears below the CTA column (stacked)
- Callouts are NOT visible (hidden lg:block)
- CTAs have `min-h-[44px]` hit target
- No horizontal scroll at page level

- [ ] **Step 3: Tablet assertions (iPad 768×1024)**

- Hero transitions to 2-column layout or stays stacked depending on `lg:` breakpoint. Verify text + screenshot readable.
- Bento: check cell layout at tablet — ideally 2 columns or gracefully stacked.

- [ ] **Step 4: Click the 7 pills at mobile viewport**

Each click should swap panel with no layout shift.

- [ ] **Step 5: Commit any fixes**

If anything was broken, fix breakpoints/padding and commit. Then re-run Step 2-4.

---

## Task 21: Lighthouse + accessibility pass

**Files:** none

- [ ] **Step 1: Lighthouse mobile**

Chrome DevTools → Lighthouse → Mobile → Performance + Accessibility + Best Practices.
Targets: Performance ≥90, Accessibility ≥95.

- [ ] **Step 2: Note regressions**

If Performance < 90, check the network panel for oversized images or unexpected bundles. Common fix: add `loading="lazy"` on non-critical images, ensure no dev-only heavy components leaked into server bundle.

- [ ] **Step 3: Axe DevTools (or equivalent)**

Run axe scan, fix any violations (most likely: missing alt text, low contrast on zinc-400 placeholders).

- [ ] **Step 4: Commit fixes**

```bash
git commit -m "perf(landing): lighthouse tuning (lazy images, a11y fixes)"
```

---

## Task 22: Deploy

**Files:** none

- [ ] **Step 1: Final local sanity check**

Run in parallel:
- `npm run lint`
- `npm run build`
- `npm test`

All three must pass.

- [ ] **Step 2: Push to remote**

```bash
git push -u origin landing-redesign-v2
```

- [ ] **Step 3: Open PR**

Via `gh`:
```bash
gh pr create --title "landing: full redesign (7 sections, interactive hero)" --body "See docs/superpowers/plans/2026-04-14-landing-redesign.md"
```

- [ ] **Step 4: Merge after review → Vercel auto-deploys to production**

Verify production landing behaves identically to local after deploy.

---

## Self-Review Checklist (completed before handoff)

- **Spec coverage:** every section of the spec (Hero, Bento, TrustBar, HowItWorks, PricingSummary, Footer, decisions visuais globais, mobile) maps to a task. ✓
- **Placeholder scan:** no "TBD", "implement later", or vague steps. Every code step contains the actual code. ✓
- **Type consistency:** `FeatureKey` used identically in types.ts, showcase, and panels. Panel component names (`JournalPanel`, `AiCoachPanel`, …) match filenames. ✓
- **Interaction:** tablist a11y (`role="tab"`, `aria-selected`, `aria-controls`) specified and tested in Task 10. ✓
- **Mobile:** Task 20 covers responsive QA; breakpoints explicit in spec. ✓
- **Deletions:** old components enumerated in Task 17 exactly match spec "Remove/arquivar" list. ✓
- **Build safety:** Task 17 Step 1 greps for imports before deletion. ✓

---

## Execution Options

**1. Subagent-Driven (recommended)** — dispatch a fresh subagent per task, review between tasks, fast iteration. Best for keeping context clean on this 22-task build.

**2. Inline Execution** — execute tasks in this session using `superpowers:executing-plans`, batch execution with checkpoints.

Which approach?
