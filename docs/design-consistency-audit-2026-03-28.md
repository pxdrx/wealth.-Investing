# Design Consistency Audit Report
**Date:** 2026-03-28
**Auditor:** Claude Code (Forensic Design Audit)
**Scope:** Full codebase (excluding `node_modules`, `.next`, `forexfactory-ESSENCIAL`)

---

## Summary

| Metric | Value |
|---|---|
| Overall Design Consistency Score | **5.5/10** |
| Critical Issues | 6 |
| High Issues | 8 |
| Medium Issues | 7 |
| Low Issues | 4 |
| Total Findings | 25 |
| Technical Debt Estimate | ~16 hours |

---

## CRITICAL Issues

### [CRITICAL-001] `bg-card` Glass Override Hides Transparency Bug

- **File:** `app/globals.css:168-179`
- **Code:**
  ```css
  .bg-card {
    background-color: hsl(var(--card) / 0.65) !important;
    backdrop-filter: blur(28px) saturate(140%);
  }
  ```
- **Problem:** The CSS globally overrides `bg-card` with `!important` and 65% opacity glass effect. This means CLAUDE.md's rule ("always add inline `style={{ backgroundColor }}` for `bg-card`") is partially mitigated by this override, BUT elements using `bg-card/60` or `bg-card/40` in className bypass this override entirely, creating inconsistent transparency levels.
- **Affected files:** `app/app/ai-coach/page.tsx` (lines 545, 577, 610, 652, 728), `components/ai/ChatMessage.tsx:44`
- **Expected:** Either commit fully to the glass card system in CSS (remove inline style workaround from docs) OR remove the `!important` override and use inline styles consistently.
- **Fix:** Standardize: pick ONE approach. The CSS `!important` override is already handling `bg-card`. Remove the CLAUDE.md requirement for inline styles, OR remove the CSS override and use inline styles everywhere.
- **Effort:** Medium (architectural decision + cleanup)

### [CRITICAL-002] Login Page Completely Breaks in Dark Mode

- **File:** `app/login/page.tsx`
- **Lines:** 123, 130, 157, 195, 210, 247, 253
- **Code:**
  ```tsx
  className="min-h-screen ... bg-[#F7F6F3] text-[#1A1A1A]"  // line 123
  className="bg-white p-8 ..."  // line 195
  className="bg-white px-3 text-[#6B6B6B]"  // line 253
  ```
- **Problem:** Entire login page uses hardcoded light colors (`bg-[#F7F6F3]`, `bg-white`, `text-[#1A1A1A]`, `text-[#6B6B6B]`, `border-[#D4D2CB]`). No dark mode support at all.
- **Expected:** Use semantic tokens: `bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`
- **Fix:** Replace all hardcoded hex colors with semantic tokens. Add dark mode variants where needed.
- **Effort:** Medium (~2 hours)

### [CRITICAL-003] `--radius-card` Mismatch: CSS Says 20px, CLAUDE.md Says 22px

- **File:** `app/globals.css:52`, `tailwind.config.ts:56`
- **Code:** `--radius-card: 20px;`
- **Problem:** CLAUDE.md documents cards as `rounded-[22px]`, but the CSS variable `--radius-card` is set to `20px`. The `Card` component uses `rounded-card` (which resolves to 20px). Meanwhile, 88 instances across the codebase use `rounded-[22px]` directly. Only 1 file uses `rounded-card`.
- **Expected:** Single source of truth. Either 20px or 22px, used everywhere via the token.
- **Fix:** Decide on 20px or 22px. Update `--radius-card` to match. Replace all 88 hardcoded `rounded-[22px]` with `rounded-card`. Update CLAUDE.md.
- **Effort:** Medium (~2 hours for global find-replace + testing)

### [CRITICAL-004] bg-card Elements Missing `isolate` Class

- **Files (sample):**
  - `app/app/account/page.tsx:60,80,97` -- no `isolate`
  - `app/app/page.tsx:600,663` -- no `isolate`
  - `components/journal/JournalTradesTable.tsx:102,121` -- no `isolate`
  - `components/layout/AppHeader.tsx:113` -- no `isolate`
  - `components/macro/MacroWidgetBriefing.tsx:23,33,45` -- no `isolate`
- **Problem:** These cards use `bg-card` but lack the `isolate` class, meaning the BGPattern dots can bleed through the card background.
- **Expected:** All card-level `bg-card` elements must have `isolate` class per design system.
- **Fix:** Add `isolate` to all card-level `bg-card` elements. The `Card` component already includes it, but raw `<div className="bg-card ...">` elements do not.
- **Effort:** Small (~1 hour, mechanical)

### [CRITICAL-005] Border Radius Fragmentation -- 15+ Different Values

- **Rounded values distribution:**
  ```
  306 rounded-full       (correct for pills/buttons)
  201 rounded-lg         (acceptable for form inputs)
  143 rounded-xl         (NOT in design system)
  88  rounded-[22px]     (cards -- should be rounded-card)
  42  rounded-2xl        (NOT in design system)
  30  rounded-md         (acceptable for small elements)
  18  rounded-[14px]     (custom -- NOT in design system)
  13  rounded-[16px]     (custom -- NOT in design system)
  11  rounded-input      (correct token)
  7   rounded-[24px]     (should be rounded-modal)
  6   rounded-[12px]     (should be rounded-input)
  4   rounded-[28px]     (NOT in design system)
  3   rounded-[10px]     (NOT in design system)
  3   rounded-modal      (correct token)
  1   rounded-[32px]     (NOT in design system)
  1   rounded-[20px]     (duplicate of rounded-card)
  1   rounded-card       (correct token -- but only 1 usage!)
  ```
- **Problem:** 15+ different border-radius values. Design system defines 3 tokens (`rounded-card`, `rounded-modal`, `rounded-input`) but they are barely used. Custom pixel values dominate.
- **Expected:** `rounded-card` (20-22px), `rounded-modal` (24px), `rounded-input` (12px), `rounded-full`, `rounded-lg/md/sm` for standard elements.
- **Fix:** Consolidate `rounded-xl` (143 uses) -- decide if it maps to `rounded-card` or a new token. Replace `rounded-[14px]`, `rounded-[16px]`, `rounded-[28px]` with nearest token.
- **Effort:** Large (~4 hours)

### [CRITICAL-006] Inconsistent Page Layouts Across App Routes

- **Findings:**
  | Page | Layout Classes |
  |---|---|
  | `/app/account` | `mx-auto max-w-2xl px-6 py-10` |
  | `/app/analyst` | `mx-auto max-w-6xl px-4 sm:px-6 py-10` |
  | `/app/journal` | `w-full max-w-none px-4 sm:px-6 lg:px-8 py-8` |
  | `/app/macro` | `w-full max-w-none px-4 sm:px-6 lg:px-8 py-8` |
  | `/app/news` | `mx-auto max-w-4xl px-6 py-12` |
  | `/app/pricing` | `mx-auto max-w-6xl px-6 py-10` |
  | `/app/prop` | `mx-auto max-w-7xl px-6 py-12` |
  | `/app/page` (dashboard) | (needs verification -- likely `max-w-6xl`) |
- **Problem:** 5 different `max-w-*` values, 3 different `py-*` values, inconsistent responsive `px-*` patterns.
- **Expected:** Standard layout per CLAUDE.md: `mx-auto max-w-6xl px-6 py-10`
- **Fix:** Some pages (journal, macro) intentionally use full-width for data tables, which is acceptable. But `/app/news` (max-w-4xl), `/app/prop` (max-w-7xl), and `/app/account` (max-w-2xl) should be reviewed for intentional deviation vs. oversight.
- **Effort:** Small (~1 hour to audit and standardize)

---

## HIGH Issues

### [HIGH-001] Hardcoded Colors in Macro Components -- Dark Mode Risk

- **Files:**
  - `components/macro/AssetImpactCards.tsx:21,28,38` -- `text-gray-400`, `text-gray-600`, `bg-gray-500/10`
  - `components/macro/DecisionIntelligence.tsx:29,31,95` -- `text-gray-400`, `bg-gray-500/10`, `border-gray-500/20`
  - `components/macro/InterestRatesPanel.tsx:20` -- `text-gray-400`
  - `components/macro/RegionalAnalysis.tsx:13` -- `text-gray-400`
  - `components/macro/WeeklyHistory.tsx:192` -- `text-gray-400`
  - `components/macro/SentimentBar.tsx:28` -- `bg-gray-400`
- **Problem:** `text-gray-400` is acceptable for neutral indicators in both themes, but `text-gray-600` without dark variant will be invisible in dark mode. `bg-gray-400` bar will look off in dark mode.
- **Expected:** Use `text-muted-foreground` for neutral text, or add explicit `dark:text-gray-400` pairs.
- **Fix:** Replace `text-gray-600` with `text-gray-600 dark:text-gray-400` (already done in some places). Replace `bg-gray-400` with `bg-muted-foreground`.
- **Effort:** Small

### [HIGH-002] JournalReports Uses `bg-white` / `bg-zinc-800` Hardcoded Pair

- **File:** `components/journal/JournalReports.tsx:160-161, 179-180`
- **Code:**
  ```tsx
  ? "bg-white dark:bg-zinc-800 shadow-sm"
  : "hover:bg-white/50 dark:hover:bg-zinc-700/50"
  ```
- **Problem:** Uses `bg-white`/`bg-zinc-800` pair instead of semantic tokens. Works in both themes but is fragile -- if theme colors change, these won't follow.
- **Expected:** `bg-card` / `hover:bg-muted/50`
- **Fix:** Replace with semantic tokens.
- **Effort:** Small

### [HIGH-003] Shadow Class Inconsistency

- **Distribution:**
  ```
  38 shadow-sm          (used inline, NOT in design system tokens)
  29 shadow-soft         (correct design token)
  26 shadow-soft-dark    (correct dark token)
  26 shadow-lg           (generic Tailwind, not design token)
  9  shadow-xl           (generic Tailwind)
  9  shadow-md           (generic Tailwind)
  7  shadow-2xl          (generic Tailwind)
  2  shadow-landing-card-hover (correct landing token)
  1  shadow-landing-card (correct landing token)
  ```
- **Problem:** `shadow-sm` (38 uses) and `shadow-lg` (26 uses) are generic Tailwind shadows, not from the design system. Should use `shadow-soft` / `dark:shadow-soft-dark` for app cards, `shadow-landing-card` for landing.
- **Expected:** Consistent use of custom shadow tokens.
- **Fix:** Audit all `shadow-sm` and `shadow-lg` in app routes. Replace card shadows with `shadow-soft dark:shadow-soft-dark`.
- **Effort:** Medium (~2 hours)

### [HIGH-004] Analyst Page Uses Hardcoded Neutral Color

- **File:** `app/app/analyst/page.tsx:101`
- **Code:** `color: "bg-gray-500/10 text-gray-500 border-gray-500/30"`
- **Problem:** Hardcoded gray for "neutral" badge. No dark mode consideration.
- **Expected:** Use `bg-muted text-muted-foreground border-border`
- **Fix:** Replace with semantic tokens.
- **Effort:** Small

### [HIGH-005] Non-Standard Card Radius in Account Page

- **File:** `app/app/account/page.tsx:60,80,97`
- **Code:** `rounded-[16px]`
- **Problem:** Uses `rounded-[16px]` instead of `rounded-card` (20px) or `rounded-[22px]` (88 uses elsewhere). These cards look noticeably different from every other card in the app.
- **Expected:** `rounded-card`
- **Fix:** Replace `rounded-[16px]` with `rounded-card`.
- **Effort:** Small

### [HIGH-006] AI Coach Page Uses Non-Standard Radius Values

- **File:** `app/app/ai-coach/page.tsx:545,577`
- **Code:** `rounded-[16px]` for prompt cards
- **Problem:** Same as HIGH-005. Inconsistent with the rest of the app.
- **Expected:** `rounded-card`
- **Fix:** Replace with `rounded-card`.
- **Effort:** Small

### [HIGH-007] Macro Page Uses `rounded-[28px]` -- Not in Design System

- **File:** `app/app/macro/page.tsx:557,573,602`
- **Code:** `rounded-[28px]`
- **Problem:** 4 instances of `rounded-[28px]`, not in any design token. Larger than `rounded-modal` (24px).
- **Expected:** Use `rounded-card` or `rounded-modal`.
- **Fix:** Replace with nearest token (`rounded-modal` at 24px or add new token if intentional).
- **Effort:** Small

### [HIGH-008] Font Weight: `--font-weight-heading` is 800, CLAUDE.md Says 600

- **File:** `app/globals.css:64`
- **Code:** `--font-weight-heading: 800;`
- **Problem:** CLAUDE.md states "Font weights: headings 600, display 700" but CSS sets both to 800. The `Card` component uses `font-semibold` (600) on titles, which is correct per CLAUDE.md but conflicts with the CSS variable.
- **Expected:** Either update CLAUDE.md to reflect 800 (Manrope works well at 800) or change CSS to 600/700.
- **Fix:** Reconcile documentation with implementation. Since Manrope at 800 is the visual intent, update CLAUDE.md.
- **Effort:** Small

---

## MEDIUM Issues

### [MED-001] `rounded-xl` Used 143 Times -- Unmapped Token

- **Problem:** `rounded-xl` (1rem / 16px) is the second most used radius value but has no design token mapping. It sits between `--radius-input` (12px) and `--radius-card` (20px).
- **Fix:** Either map it to an existing token or create `--radius-element: 16px` for sub-card containers.
- **Effort:** Large (143 occurrences to audit)

### [MED-002] ChatInput Uses Glass Morphism with Raw `bg-white/5`

- **File:** `components/ai/ChatInput.tsx:45`
- **Code:** `bg-white/5 dark:bg-black/20 backdrop-blur-xl`
- **Problem:** Uses raw white/black with opacity instead of semantic tokens. Not terrible since it's intentional glass effect, but inconsistent with how other glass elements use `bg-card/60`.
- **Expected:** `bg-card/10` or similar semantic approach.
- **Effort:** Small

### [MED-003] Landing Hero Cards Use `bg-white/5` Glass Pattern

- **File:** `components/landing/Hero.tsx:55,81`
- **Problem:** Decorative ghost cards use `bg-white/5 dark:bg-black/10`. Acceptable for decorative elements but inconsistent with `landing-card` CSS class.
- **Effort:** Small (cosmetic, low priority)

### [MED-004] `shadow-soft` Missing Dark Pair in Some Elements

- **Problem:** Some elements use `shadow-soft` without the companion `dark:shadow-soft-dark`. Search found 29 `shadow-soft` vs 26 `shadow-soft-dark` -- 3 mismatches.
- **Fix:** Find the 3 elements missing `dark:shadow-soft-dark` and add it.
- **Effort:** Small

### [MED-005] `shadow-landing-card` Used Only in Pricing -- Underutilized Token

- **File:** `components/landing/LandingPricing.tsx:152-153`
- **Problem:** Landing shadow tokens exist but are only used in one component. Other landing components use the `.landing-card` CSS class (which applies via CSS variable), so this may be intentional. But any landing card NOT using the CSS class will lack the shadow.
- **Effort:** Small (audit only)

### [MED-006] `rounded-[14px]` Used 18 Times -- No Token

- **Files:** `app/login/page.tsx`, `components/layout/AppHeader.tsx`, various
- **Problem:** 18 instances of `rounded-[14px]` with no design token. Close to `--radius-input` (12px) but not identical.
- **Fix:** Decide if this maps to `rounded-input` or needs its own token.
- **Effort:** Small

### [MED-007] Inconsistent `py-*` in Page Layouts

- **Problem:** Pages use `py-8`, `py-10`, `py-12` inconsistently. Standard is `py-10`.
- **Fix:** Standardize to `py-10` unless intentionally different.
- **Effort:** Small

---

## LOW Issues

### [LOW-001] Manifesto Page Uses `bg-white/5` Instead of Landing Tokens

- **File:** `app/manifesto/page.tsx:162,199`
- **Problem:** Uses `bg-white/5`, `border-white/10` for glass effects. Landing pages should use `l-*` tokens.
- **Effort:** Small

### [LOW-002] Google SVG Icon Contains Hardcoded Hex Colors (Acceptable)

- **File:** `app/login/page.tsx:16-19`
- **Problem:** Google brand colors (`#FFC107`, `#FF3D00`, `#4CAF50`, `#1976D2`) are hardcoded. This is correct -- brand logos must use their official colors.
- **Verdict:** No action needed.

### [LOW-003] BGPattern Dot Gradient Uses Hardcoded Hex

- **File:** `app/layout.tsx:75`
- **Code:** `bg-[radial-gradient(#D4D2CB_1px,transparent_1px)] dark:bg-[radial-gradient(#333333_1px,transparent_1px)]`
- **Problem:** Hardcoded hex for dot pattern. Has dark mode variant so it works, but could use CSS variables for consistency.
- **Effort:** Small

### [LOW-004] PricingCards Toggle Uses `bg-white` for Thumb

- **File:** `components/billing/PricingCards.tsx:248`, `components/landing/LandingPricing.tsx:123`
- **Problem:** Toggle thumb uses `bg-white` -- standard for toggle UI components. Acceptable.
- **Verdict:** No action needed.

---

## Positive Findings (Green Flags)

1. **Card component (`components/ui/card.tsx`) is excellent:** Uses `rounded-card`, `shadow-soft dark:shadow-soft-dark`, `isolate`, inline `backgroundColor` style. This is the gold standard that other elements should follow.

2. **Button component is fully tokenized:** All variants use `rounded-full`, semantic colors, proper hover states with `@media(hover:hover)` guard.

3. **Global `bg-card` CSS override is clever:** The glass morphism effect applied via `!important` in globals.css ensures consistent card styling even when developers forget inline styles. Smart defensive CSS.

4. **Dark mode is well-implemented in core components:** The theme system with CSS variables is solid. Most semantic tokens have proper light/dark values.

5. **Landing page design system is separate and clean:** `landing-card`, `l-*` color tokens, dedicated shadow tokens. Good separation of concerns.

6. **`isolate` class on Card component:** Prevents BGPattern bleed-through at the component level.

7. **Typography tokens are well-defined:** `tracking-tight-apple`, `leading-tight-apple`, font family cascade is Apple-like and professional.

---

## Priority Fix Order

| Priority | Finding | Impact | Effort |
|---|---|---|---|
| 1 | CRITICAL-002 | Login dark mode completely broken | Medium |
| 2 | CRITICAL-003 | Radius token mismatch (20 vs 22px) | Medium |
| 3 | CRITICAL-004 | Missing `isolate` on bg-card elements | Small |
| 4 | HIGH-005/006/007 | Non-standard radius values | Small |
| 5 | CRITICAL-005 | Border radius fragmentation | Large |
| 6 | HIGH-001 | Macro component hardcoded colors | Small |
| 7 | HIGH-003 | Shadow inconsistency | Medium |
| 8 | CRITICAL-001 | bg-card strategy decision | Medium |
| 9 | HIGH-008 | Font weight docs mismatch | Small |
| 10 | CRITICAL-006 | Page layout standardization | Small |
