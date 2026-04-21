# Parallel Track Roadmap — reconstructed from design-agent sessions

Sources: 3 JSONL session transcripts in `.claude/projects/C--Users-phalm-trading-dashboard/`:
- `71bb7e9a-3898-4291-bb94-a3742d3723a9.jsonl` — Track A (brand) session
- `bd031f3e-f109-469b-83ec-ef99f20e4f1e.jsonl` — Track C (app) session
- `da847ebb-7774-4f9b-9abd-66b4431cefaf.jsonl` — Track B (landing) session

Reconstructed: 2026-04-20

> **Status legend:** `[SHIPPED]` = commit with `[X-NN]` tag exists on a `feat/track-*` branch. `[PENDING]` otherwise.
> **Detail legend:** `[full plan]` means the design agent emitted a detailed implementation plan; `[summary only]` means only the one-line objective from the track-init prompt is known. Where only a summary exists, the user will need to re-run the design agent to regenerate the detailed plan before handing the task to a track session.

---

## Track A — Brand

**Session init prompt** (copied verbatim — paste as the first message to a new Track A session):

```
Você é a sessão TRACK A. Contexto crítico:

- Repo: trading-dashboard (Next 14, Tailwind, shadcn, Supabase)
- Docs obrigatórias: CLAUDE.md, BRAND.md, docs/TRACK-COORDINATION.md
- Outra 2 sessões rodam em paralelo em outras branches (B: landing, C: app).
  Você não pode modificar arquivos fora do seu ownership.

SEU OWNERSHIP (só você escreve aqui):
  tailwind.config.ts
  app/globals.css
  app/layout.tsx (só fontes e metadata)
  BRAND.md
  components/brand/**
  public/dexter/**
  public/icon.svg, favicons
  lib/brand/**

NÃO TOCAR:
  app/page.tsx               # dono: B
  components/landing/**      # dono: B
  app/app/**                 # dono: C
  components/{dashboard,journal,macro,ai,live}/**  # dono: C
  middleware.ts, AuthGate, auth callback  # congelado

OBJETIVO: implementar Direção 01 — Terminal brutalista — com light + dark.

TASKS (execute em ordem, use plan mode em cada uma):
  A-01 Tokens HSL light + Terminal dark em app/globals.css
  A-02 Reescrever BRAND.md
  A-03 Adicionar JetBrains Mono via next/font, remover Plus Jakarta
  A-04 <Dexter mood=... /> com 4 SVGs em public/dexter/
  A-05 <Logo variant=... /> unificado + favicons
  A-06 <UltraBadge /> e <UltraLock active />
  A-07 ThemeToggle com 3 estados (Light/Terminal/System)
  A-08 Remover tokens --landing-* duplicados, documentar migração
  A-09 lib/brand/voice.ts com 30 microcopy strings (PT + EN)
  A-10 Página interna /brand pra dogfood
  A-11 PR + docs/MIGRATION-TRACK-A.md

REGRAS:
- Antes de cada task, plan mode. Depois execute.
- Cada task = 1 commit. Mensagem: "feat(brand): [A-XX] descrição curta".
- Commit + push após cada task. NÃO fazer squash.
- bg-card sozinho não funciona — use inline style com hsl(var(--card))
- Framer Motion: easing [0.16, 1, 0.3, 1]
- Testar cada task com npm run build e npm run lint
- Ao fim: abrir PR contra main. NÃO mergear. Aguardar coordenação.

Comece lendo os 3 docs e depois START A-01.
```

### A-01 — Tokens HSL light + Terminal dark em app/globals.css [SHIPPED] [full plan]

```md
# A-01 Terminal Brutalist Tokens — Implementation Plan

> Track A task 01. Replace current Lumina Slate palette with Terminal brutalist tokens (light + dark) in `app/globals.css`. Single commit.

**Goal:** Replace the HSL token values in `:root` and `.dark` of `app/globals.css` with a Terminal brutalist palette (paper+ink for light, CRT phosphor for dark), add 6 new brand-level tokens the subsequent tasks will consume, and sharpen radii. One commit: `feat(brand): [A-01] terminal brutalist tokens (light + dark)`.

**Architecture:** Token-only change. Every shadcn variable name is preserved (`--background`, `--foreground`, `--card`, `--border`, `--primary`, `--muted`, `--accent`, `--ring`, `--popover`, `--input`, `--input-bg`, `--secondary`) so every existing component keeps rendering. Values shift to the Terminal palette. The `--landing-*` family is left UNTOUCHED in A-01 — aliasing happens in A-08. New brand-scoped tokens (`--terminal-*`, `--ultra-*`, `--brand-ink`, `--brand-paper`, `--scanline`) are added so later tasks (A-04, A-05, A-06, A-07, A-10) can reference them without re-opening globals.css. The glass-blur `.bg-card` override is removed — brutalism is flat.

**Tech Stack:** CSS custom properties in HSL triplet form (per CLAUDE.md: `hsl(var(--card))`).

---

## Context

Track A owns the visual identity reset. The current palette (Lumina Slate) is soft, Apple-ish, glass-morphism-heavy. The new direction — **Terminal brutalista** — is the opposite: paper+ink ("newspaper brutalism") for light, CRT phosphor for dark, sharp corners, heavy hairlines, no glass. All downstream brand work (mascot, logo, badges, dogfood page) depends on these tokens existing first, which is why this is A-01.

Constraints from clarifying round with user:
- `components/theme-provider.tsx` is editable by A (for A-07 later).
- `--landing-*` tokens keep their names as aliases — A-08 flips them to point at the new tokens. A-01 must NOT redefine them.
- `/brand` dogfood page goes into `app/(brand)/brand/` — irrelevant for A-01, mentioned for context.
- TRACK-COORDINATION.md will be updated in a later task (not A-01) to add BRAND.md, `app/(brand)/**`, `components/theme-provider.tsx` to A's matrix.

---

## Palette design (the "why" behind each HSL)

### Light — paper+ink
| Token                  | HSL                | Hex approx | Role |
|------------------------|--------------------|------------|------|
| `--background`         | `48 15% 96%`       | #F7F5F0    | Warm newsprint paper |
| `--foreground`         | `0 0% 8%`          | #141414    | Ink black |
| `--card`               | `0 0% 100%`        | #FFFFFF    | Card = clean white sheet over paper |
| `--card-foreground`    | `0 0% 8%`          | #141414    | Same ink |
| `--primary`            | `0 0% 8%`          | #141414    | Ink button |
| `--primary-foreground` | `0 0% 100%`        | #FFFFFF    | White on ink |
| `--secondary`          | `48 10% 92%`       | #EDEBE5    | Slightly darker paper |
| `--secondary-foreground`| `0 0% 8%`         | #141414    | Ink |
| `--muted`              | `48 10% 90%`       | #E8E6DF    | Aged paper |
| `--muted-foreground`   | `0 0% 32%`         | #525252    | Pencil gray (WCAG AA on paper) |
| `--accent`             | `48 10% 92%`       | #EDEBE5    | Subtle hover paper |
| `--accent-foreground`  | `0 0% 8%`          | #141414    | Ink |
| `--border`             | `0 0% 78%`         | #C7C7C7    | Strong hairline |
| `--input`              | `0 0% 78%`         | #C7C7C7    | Same hairline |
| `--input-bg`           | `0 0% 100%`        | #FFFFFF    | Input = white paper |
| `--ring`               | `142 72% 28%`      | #137A3A    | CRT green focus (readable on white) |
| `--popover`            | `0 0% 100%`        | #FFFFFF    | White sheet |
| `--popover-foreground` | `0 0% 8%`          | #141414    | Ink |

### Dark — CRT terminal
| Token                  | HSL                | Hex approx | Role |
|------------------------|--------------------|------------|------|
| `--background`         | `120 4% 6%`        | #0E0F0E    | CRT black with tiny green tint |
| `--foreground`         | `120 25% 92%`      | #DAE8DA    | Phosphor-green-white text |
| `--card`               | `120 6% 9%`        | #151816    | Panel over background |
| `--card-foreground`    | `120 25% 92%`      | #DAE8DA    | Phosphor text |
| `--primary`            | `142 72% 52%`      | #30D866    | Bright phosphor green button |
| `--primary-foreground` | `120 20% 6%`       | #0D100D    | Near-black on green |
| `--secondary`          | `120 6% 12%`       | #1B1E1C    | Slightly elevated panel |
| `--secondary-foreground`| `120 25% 92%`     | #DAE8DA    | Phosphor |
| `--muted`              | `120 6% 14%`       | #202321    | Inactive panel |
| `--muted-foreground`   | `120 10% 65%`      | #95A59A    | Dim phosphor (WCAG AA on dark) |
| `--accent`             | `120 6% 14%`       | #202321    | Hover panel |
| `--accent-foreground`  | `120 25% 92%`      | #DAE8DA    | Phosphor |
| `--border`             | `120 8% 22%`       | #323834    | Scanline/grid line |
| `--input`              | `120 8% 22%`       | #323834    | Same |
| `--input-bg`           | `120 6% 9%`        | #151816    | Panel |
| `--ring`               | `142 72% 52%`      | #30D866    | Bright phosphor focus |
| `--popover`            | `120 6% 9%`        | #151816    | Panel |
| `--popover-foreground` | `120 25% 92%`      | #DAE8DA    | Phosphor |

### New brand-scope tokens (both themes)
These are consumed by A-04/A-05/A-06/A-07/A-10.

Light:
- `--brand-paper: 48 15% 96%`  (explicit alias for "max-paper")
- `--brand-ink: 0 0% 8%`       (explicit alias for "max-ink")
- `--terminal-accent: 142 72% 28%`  (CRT green for light)
- `--terminal-amber: 32 95% 42%`    (phosphor amber, secondary terminal signal)
- `--ultra-accent: 32 95% 42%`       (Ultra tier color — amber on paper)
- `--ultra-accent-foreground: 0 0% 8%`
- `--scanline: 120 8% 78% / 0.6`     (subtle decorative overlay)

Dark:
- `--brand-paper: 120 25% 92%`  (inverted — "paper" in dark = phosphor white)
- `--brand-ink: 120 4% 6%`      (inverted — "ink" in dark = CRT black)
- `--terminal-accent: 142 72% 52%`  (bright phosphor)
- `--terminal-amber: 38 95% 60%`
- `--ultra-accent: 38 95% 60%`       (amber on black for Ultra)
- `--ultra-accent-foreground: 120 4% 6%`
- `--scanline: 120 8% 22% / 0.5`

### Radius — sharper for brutalism
- `--radius-card: 22px → 4px`
- `--radius-modal: 24px → 6px`
- `--radius-input: 12px → 2px`

### Typography variables (unchanged in A-01; A-03 handles font swap)
- `--tracking-tight`, `--tracking-tighter`, `--leading-*`, `--placeholder-opacity`, `--font-weight-heading`, `--font-weight-display` — left as is.

### PnL tokens (unchanged)
`--pnl-positive`, `--pnl-negative`, `--pnl-cell-win`, `--pnl-cell-loss`, `--pnl-text-positive`, `--pnl-text-negative` — kept verbatim. C owns journal/calendar; these are cross-cutting data semantics.

### Landing tokens (unchanged in A-01)
All `--landing-*` values stay EXACTLY as they are. A-08 will flip them to point at the new tokens. Leaving them alone now guarantees B's `app/academy/*`, `app/blog/*`, landing components keep building.

### Glass override removal
The current `app/globals.css` has this in `@layer components`:

```css
.bg-card {
  background-color: hsl(var(--card) / 0.65) !important;
  backdrop-filter: blur(28px) saturate(140%);
  ...
}
.dark .bg-card { ... glass ... }
```

Brutalism is flat — remove both blocks. Replace with a simple flat `.bg-card` that uses `hsl(var(--card))` solid + `border: 1px solid hsl(var(--border))`. CLAUDE.md rule ("`bg-card` alone is NOT reliable — always add inline style") still applies because Tailwind's base `bg-card` utility from the token is fine, but the override WAS breaking inline-style expectations. We keep a minimal flat override so callsites that use `bg-card` without inline style render solid.

---

## Files Modified

- `app/globals.css` — `:root` block, `.dark` block, `@layer components` `.bg-card` glass removal.

**NOT touched** in A-01:
- `tailwind.config.ts` (no new color keys needed — Terminal tokens are raw CSS vars consumed via `hsl(var(--terminal-accent))` or added to tailwind in later tasks if needed)
- `app/layout.tsx` (A-03 handles fonts)
- any component file

---

## Task steps (single commit)

- [ ] **Step 1: Read the full current `app/globals.css`**

Run: `read the whole file into editor context`
Expected: I already have head, middle, tail in my batch — confirm no surprises in lines 401+ (tail was empty in ctx output, which means file ends around 400).

- [ ] **Step 2: Replace the `:root` block (lines ~5 to ~75)**

Keep all variable NAMES exactly the same. Replace only the VALUES for the token set above. Preserve the landing-*, pnl-*, radius (with new values), typography, placeholder-opacity, font-weight-* variables. Add the new `--brand-paper`, `--brand-ink`, `--terminal-accent`, `--terminal-amber`, `--ultra-accent`, `--ultra-accent-foreground`, `--scanline` variables at the end of the `:root` block, right before the closing `}` — grouped under a comment `/* ── Terminal brutalist brand tokens ── */`.

Concrete `:root` inner content (replaces current values only):

```css
/* ── Light: paper + ink (Terminal brutalist) ── */
--background: 48 15% 96%;
--foreground: 0 0% 8%;
--card: 0 0% 100%;
--card-foreground: 0 0% 8%;
--primary: 0 0% 8%;
--primary-foreground: 0 0% 100%;
--secondary: 48 10% 92%;
--secondary-foreground: 0 0% 8%;
--muted: 48 10% 90%;
--muted-foreground: 0 0% 32%;
--accent: 48 10% 92%;
--accent-foreground: 0 0% 8%;
--border: 0 0% 78%;
--input: 0 0% 78%;
--input-bg: 0 0% 100%;
--ring: 142 72% 28%;
--popover: 0 0% 100%;
--popover-foreground: 0 0% 8%;

/* ── Landing tokens — UNCHANGED in A-01; A-08 migrates to aliases ── */
--landing-bg: 0 0% 95%;
--landing-bg-elevated: 0 0% 100%;
--landing-bg-tertiary: 0 0% 93%;
--landing-border: 0 0% 82%;
--landing-border-strong: 0 0% 65%;
--landing-text: 0 0% 10%;
--landing-text-secondary: 0 0% 42%;
--landing-text-muted: 0 0% 60%;
--landing-accent: 0 0% 10%;
--landing-accent-secondary: 0 0% 25%;
--landing-accent-warning: 38 80% 48%;
--landing-accent-danger: 0 72% 50%;
--pnl-positive: 152 40% 38%;
--pnl-positive-light: 152 35% 48%;
--pnl-negative: 4 50% 52%;
--pnl-cell-win: 152 80% 45% / 0.12;
--pnl-cell-loss: 350 80% 55% / 0.10;
--pnl-text-positive: 152 85% 30%;
--pnl-text-negative: 350 75% 48%;
--landing-grid: 0 0% 82%;
--landing-card-shadow: 0 1px 2px rgba(0,0,0,0.02), 0 4px 16px -4px rgba(0,0,0,0.04);
--landing-card-shadow-hover: 0 2px 4px rgba(0,0,0,0.03), 0 8px 24px -4px rgba(0,0,0,0.08);

/* ── Radius (brutalist: sharp) ── */
--radius-card: 4px;
--radius-modal: 6px;
--radius-input: 2px;

/* ── Typography ── */
--tracking-tight: -0.02em;
--tracking-tighter: -0.03em;
--leading-tight: 1.15;
--leading-snug: 1.25;
--leading-normal: 1.5;
--leading-relaxed: 1.625;
--placeholder-opacity: 0.55;
--font-weight-heading: 800;
--font-weight-display: 800;

/* ── Terminal brutalist brand tokens ── */
--brand-paper: 48 15% 96%;
--brand-ink: 0 0% 8%;
--terminal-accent: 142 72% 28%;
--terminal-amber: 32 95% 42%;
--ultra-accent: 32 95% 42%;
--ultra-accent-foreground: 0 0% 8%;
--scanline: 120 8% 78% / 0.6;
```

- [ ] **Step 3: Replace the `.dark` block**

Concrete `.dark` inner content:

```css
/* ── Dark: CRT terminal ── */
--background: 120 4% 6%;
--foreground: 120 25% 92%;
--card: 120 6% 9%;
--card-foreground: 120 25% 92%;
--primary: 142 72% 52%;
--primary-foreground: 120 20% 6%;
--secondary: 120 6% 12%;
--secondary-foreground: 120 25% 92%;
--muted: 120 6% 14%;
--muted-foreground: 120 10% 65%;
--accent: 120 6% 14%;
--accent-foreground: 120 25% 92%;
--border: 120 8% 22%;
--input: 120 8% 22%;
--input-bg: 120 6% 9%;
--ring: 142 72% 52%;
--popover: 120 6% 9%;
--popover-foreground: 120 25% 92%;

/* ── Landing tokens dark — UNCHANGED in A-01 ── */
--landing-bg: 0 0% 4%;
--landing-bg-elevated: 0 0% 9%;
--landing-bg-tertiary: 0 0% 12%;
--landing-border: 0 0% 14%;
--landing-border-strong: 0 0% 20%;
--landing-text: 0 0% 96%;
--landing-text-secondary: 0 0% 65%;
--landing-text-muted: 0 0% 45%;
--landing-accent: 210 20% 90%;
--landing-accent-secondary: 217 60% 55%;
--landing-accent-warning: 38 80% 55%;
--landing-accent-danger: 0 72% 58%;
--pnl-positive: 152 70% 50%;
--pnl-positive-light: 152 60% 62%;
--pnl-negative: 4 80% 58%;
--pnl-cell-win: 152 70% 50% / 0.15;
--pnl-cell-loss: 350 70% 55% / 0.12;
--pnl-text-positive: 152 80% 55%;
--pnl-text-negative: 350 85% 65%;
--landing-grid: 0 0% 10%;
--landing-card-shadow: none;
--landing-card-shadow-hover: none;

--placeholder-opacity: 0.5;

/* ── Terminal brutalist brand tokens (dark) ── */
--brand-paper: 120 25% 92%;
--brand-ink: 120 4% 6%;
--terminal-accent: 142 72% 52%;
--terminal-amber: 38 95% 60%;
--ultra-accent: 38 95% 60%;
--ultra-accent-foreground: 120 4% 6%;
--scanline: 120 8% 22% / 0.5;
```

- [ ] **Step 4: Replace the glass `.bg-card` override**

Find the `@layer components` block containing:

```css
.bg-card { background-color: hsl(var(--card) / 0.65) !important; backdrop-filter: blur(28px) saturate(140%); ... }
.dark .bg-card { ... }
```

Replace with:

```css
/* ── Flat brutalist cards (replaces glass override) ── */
.bg-card {
  background-color: hsl(var(--card)) !important;
  border: 1px solid hsl(var(--border)) !important;
  box-shadow: none !important;
  -webkit-backdrop-filter: none;
  backdrop-filter: none;
}
.dark .bg-card {
  background-color: hsl(var(--card)) !important;
  border: 1px solid hsl(var(--border)) !important;
  box-shadow: none !important;
}
```

Keep all the other `.bg-*` lines (`.bg-muted`, `.bg-popover`, `.bg-accent`, `.bg-secondary`, `.bg-primary`, `.bg-input`) exactly as they are.

- [ ] **Step 5: Verify build**

Run:
```bash
cd C:/Users/phalm/trading-dashboard && npm run lint 2>&1 | tail -20
```
Expected: no new lint errors on `app/globals.css`. (CSS isn't linted by eslint — this catches only accidental JS/TS slip-ups.)

Run:
```bash
cd C:/Users/phalm/trading-dashboard && npm run build 2>&1 | tail -30
```
Expected: build succeeds. Pages compile. Tailwind picks up new values. Any pre-existing build failure is tracked separately (won't block A-01 if it was failing before).

- [ ] **Step 6: Manual visual smoke**

Not running dev server in this task (dev server is long-running; skip to save cycles). Instead, verify tokens parse correctly by a tiny sanity grep:

```bash
cd C:/Users/phalm/trading-dashboard && \
  grep -E '^\s*--(background|terminal-accent|ultra-accent|brand-ink|radius-card):' app/globals.css
```
Expected: at minimum one hit per variable in both `:root` and `.dark` blocks for the shadcn ones, and one hit each in both blocks for the brand-scope ones.

- [ ] **Step 7: Stage, commit, push**

Run:
```bash
cd C:/Users/phalm/trading-dashboard && \
  git add app/globals.css && \
  git diff --cached --name-only
```
Expected: exactly `app/globals.css`.

Run:
```bash
cd C:/Users/phalm/trading-dashboard && \
  git commit -m "feat(brand): [A-01] terminal brutalist tokens (light + dark)"
```
Expected: one commit on `feat/track-a-brand`.

Run:
```bash
cd C:/Users/phalm/trading-dashboard && \
  git push -u origin feat/track-a-brand 2>&1 | tail -5
```
Expected: branch published to origin. First push of this branch so `-u` sets upstream.

- [ ] **Step 8: Mark A-01 done in the todo list, report.**

Report to user: commit SHA, tokens added, tokens removed from glass override, landing tokens untouched, build status, push status.

---

## Verification (end-to-end)

1. `git log --oneline -1 feat/track-a-brand` shows the A-01 commit.
2. `grep -c '^\s*--background:' app/globals.css` = 2 (one in :root, one in .dark).
3. `grep -c '^\s*--terminal-accent:' app/globals.css` = 2.
4. `grep -c '^\s*--landing-bg:' app/globals.css` = 2 (untouched).
5. `grep 'backdrop-filter: blur' app/globals.css` = 0 matches (glass removed).
6. `npm run build` exits 0.
7. `git status` shows clean working tree (besides the pre-existing dirty files we promised not to touch).
8. `git rev-parse --abbrev-ref --symbolic-full-name @{u}` returns `origin/feat/track-a-brand` (upstream set).

If build fails with an error that is clearly caused by A-01 (not pre-existing), revert with `git reset --hard HEAD~1` (local only — nothing pushed yet if push step failed) and re-plan. If it's pre-existing, push anyway and note it in the final report.

---

## Out of scope (explicit, for later tasks)

- Updating `tailwind.config.ts` with new brand color keys → defer (most tokens are consumed as raw CSS vars; add to Tailwind only when a component needs Tailwind utilities for them).
- `--landing-*` alias rewiring → **A-08**.
- Font change (JetBrains Mono) → **A-03**.
- BRAND.md rewrite → **A-02**.
- ThemeToggle with `terminal` as a distinct mode name → **A-07**. (A-01 keeps `.dark` as the dark class; A-07 decides if "terminal" is a separate class or an alias.)
- TRACK-COORDINATION.md updates → done incrementally, not in A-01.
- Any component, logo, mascot, badge, /brand page → later tasks.

---

## Risk register

| Risk | Mitigation |
|------|-----------|
| `.bg-card` flat override breaks cards that relied on the glass blur | Inline-style pattern from CLAUDE.md (`style={{ backgroundColor: "hsl(var(--card))" }}`) still wins — the override is `!important` but inline style also wins over class. Existing cards that only use `className="bg-card"` will now render solid, which is the desired Terminal look. |
| Radius jump from 22px to 4px looks abrupt in existing dashboard cards | Expected — that IS the visual reset. A-02/A-10 document; nothing to mitigate in A-01. |
| `--ring` color change (now green) makes focus outlines clash with an old page | Acceptable within Terminal direction. If user objects we can tone to 72% → 40% saturation. |
| Some consumer reads `hsl(var(--card))` with opacity suffix — e.g. `hsl(var(--card) / 0.65)` | Still works; opacity is per-call, not per-token. |
| Build fails due to a `--landing-*` consumer expecting old hex | No — they consume via `hsl(var(--landing-bg))` and landing values are UNCHANGED in A-01. |
```

---

### A-02 — Reescrever BRAND.md [SHIPPED] [summary only]

**Objective:** Reescrever BRAND.md

**Ownership (from Track A init):**
```
  tailwind.config.ts
  app/globals.css
  app/layout.tsx (só fontes e metadata)
  BRAND.md
  components/brand/**
  public/dexter/**
  public/icon.svg, favicons
  lib/brand/**
```

**Rules:** plan mode antes de cada task; 1 commit por task com mensagem `feat(brand): [A-02] descrição curta`; `npm run build && npm run lint` antes de commitar.

> No detailed design-agent plan was captured in the session for this task. Regenerate the detailed plan (objective / scope / acceptance criteria / deliverables) before handing to a track session.

---

### A-03 — Adicionar JetBrains Mono via next/font, remover Plus Jakarta [SHIPPED] [summary only]

**Objective:** Adicionar JetBrains Mono via next/font, remover Plus Jakarta

**Ownership (from Track A init):**
```
  tailwind.config.ts
  app/globals.css
  app/layout.tsx (só fontes e metadata)
  BRAND.md
  components/brand/**
  public/dexter/**
  public/icon.svg, favicons
  lib/brand/**
```

**Rules:** plan mode antes de cada task; 1 commit por task com mensagem `feat(brand): [A-03] descrição curta`; `npm run build && npm run lint` antes de commitar.

> No detailed design-agent plan was captured in the session for this task. Regenerate the detailed plan (objective / scope / acceptance criteria / deliverables) before handing to a track session.

---

### A-04 — <Dexter mood=... /> com 4 SVGs em public/dexter/ [PENDING] [summary only]

**Objective:** <Dexter mood=... /> com 4 SVGs em public/dexter/

**Ownership (from Track A init):**
```
  tailwind.config.ts
  app/globals.css
  app/layout.tsx (só fontes e metadata)
  BRAND.md
  components/brand/**
  public/dexter/**
  public/icon.svg, favicons
  lib/brand/**
```

**Rules:** plan mode antes de cada task; 1 commit por task com mensagem `feat(brand): [A-04] descrição curta`; `npm run build && npm run lint` antes de commitar.

> No detailed design-agent plan was captured in the session for this task. Regenerate the detailed plan (objective / scope / acceptance criteria / deliverables) before handing to a track session.

---

### A-05 — <Logo variant=... /> unificado + favicons [SHIPPED] [summary only]

**Objective:** <Logo variant=... /> unificado + favicons

**Ownership (from Track A init):**
```
  tailwind.config.ts
  app/globals.css
  app/layout.tsx (só fontes e metadata)
  BRAND.md
  components/brand/**
  public/dexter/**
  public/icon.svg, favicons
  lib/brand/**
```

**Rules:** plan mode antes de cada task; 1 commit por task com mensagem `feat(brand): [A-05] descrição curta`; `npm run build && npm run lint` antes de commitar.

> No detailed design-agent plan was captured in the session for this task. Regenerate the detailed plan (objective / scope / acceptance criteria / deliverables) before handing to a track session.

---

### A-06 — <UltraBadge /> e <UltraLock active /> [PENDING] [summary only]

**Objective:** <UltraBadge /> e <UltraLock active />

**Ownership (from Track A init):**
```
  tailwind.config.ts
  app/globals.css
  app/layout.tsx (só fontes e metadata)
  BRAND.md
  components/brand/**
  public/dexter/**
  public/icon.svg, favicons
  lib/brand/**
```

**Rules:** plan mode antes de cada task; 1 commit por task com mensagem `feat(brand): [A-06] descrição curta`; `npm run build && npm run lint` antes de commitar.

> No detailed design-agent plan was captured in the session for this task. Regenerate the detailed plan (objective / scope / acceptance criteria / deliverables) before handing to a track session.

---

### A-07 — ThemeToggle com 3 estados (Light/Terminal/System) [PENDING] [summary only]

**Objective:** ThemeToggle com 3 estados (Light/Terminal/System)

**Ownership (from Track A init):**
```
  tailwind.config.ts
  app/globals.css
  app/layout.tsx (só fontes e metadata)
  BRAND.md
  components/brand/**
  public/dexter/**
  public/icon.svg, favicons
  lib/brand/**
```

**Rules:** plan mode antes de cada task; 1 commit por task com mensagem `feat(brand): [A-07] descrição curta`; `npm run build && npm run lint` antes de commitar.

> No detailed design-agent plan was captured in the session for this task. Regenerate the detailed plan (objective / scope / acceptance criteria / deliverables) before handing to a track session.

---

### A-08 — Remover tokens --landing-* duplicados, documentar migração [PENDING] [summary only]

**Objective:** Remover tokens --landing-* duplicados, documentar migração

**Ownership (from Track A init):**
```
  tailwind.config.ts
  app/globals.css
  app/layout.tsx (só fontes e metadata)
  BRAND.md
  components/brand/**
  public/dexter/**
  public/icon.svg, favicons
  lib/brand/**
```

**Rules:** plan mode antes de cada task; 1 commit por task com mensagem `feat(brand): [A-08] descrição curta`; `npm run build && npm run lint` antes de commitar.

> No detailed design-agent plan was captured in the session for this task. Regenerate the detailed plan (objective / scope / acceptance criteria / deliverables) before handing to a track session.

---

### A-09 — lib/brand/voice.ts com 30 microcopy strings (PT + EN) [PENDING] [summary only]

**Objective:** lib/brand/voice.ts com 30 microcopy strings (PT + EN)

**Ownership (from Track A init):**
```
  tailwind.config.ts
  app/globals.css
  app/layout.tsx (só fontes e metadata)
  BRAND.md
  components/brand/**
  public/dexter/**
  public/icon.svg, favicons
  lib/brand/**
```

**Rules:** plan mode antes de cada task; 1 commit por task com mensagem `feat(brand): [A-09] descrição curta`; `npm run build && npm run lint` antes de commitar.

> No detailed design-agent plan was captured in the session for this task. Regenerate the detailed plan (objective / scope / acceptance criteria / deliverables) before handing to a track session.

---

### A-10 — Página interna /brand pra dogfood [PENDING] [summary only]

**Objective:** Página interna /brand pra dogfood

**Ownership (from Track A init):**
```
  tailwind.config.ts
  app/globals.css
  app/layout.tsx (só fontes e metadata)
  BRAND.md
  components/brand/**
  public/dexter/**
  public/icon.svg, favicons
  lib/brand/**
```

**Rules:** plan mode antes de cada task; 1 commit por task com mensagem `feat(brand): [A-10] descrição curta`; `npm run build && npm run lint` antes de commitar.

> No detailed design-agent plan was captured in the session for this task. Regenerate the detailed plan (objective / scope / acceptance criteria / deliverables) before handing to a track session.

---

### A-11 — PR + docs/MIGRATION-TRACK-A.md [PENDING] [summary only]

**Objective:** PR + docs/MIGRATION-TRACK-A.md

**Ownership (from Track A init):**
```
  tailwind.config.ts
  app/globals.css
  app/layout.tsx (só fontes e metadata)
  BRAND.md
  components/brand/**
  public/dexter/**
  public/icon.svg, favicons
  lib/brand/**
```

**Rules:** plan mode antes de cada task; 1 commit por task com mensagem `feat(brand): [A-11] descrição curta`; `npm run build && npm run lint` antes de commitar.

> No detailed design-agent plan was captured in the session for this task. Regenerate the detailed plan (objective / scope / acceptance criteria / deliverables) before handing to a track session.

---

## Track B — Landing

**Session init prompt** (Track B session opening):

```
Você é a sessão TRACK B. Contexto crítico:

- Repo: trading-dashboard (Next 14, Tailwind, shadcn, Supabase)
- Docs: CLAUDE.md, BRAND.md, docs/TRACK-COORDINATION.md
- Outras 2 sessões: A (brand) e C (app). Ownership estrito.

SEU OWNERSHIP:
  app/page.tsx
  app/[locale]/** (vai criar)
  app/(marketing)/** (se criar)
  components/landing/**
  messages/pt.json, messages/en.json
  i18n.ts
  lib/analytics/events.ts
  app/sitemap.ts
  app/manifesto, app/features, app/pricing (público), app/blog

NÃO TOCAR:
  tailwind.config.ts, app/globals.css, BRAND.md  # dono: A
  components/brand/**                             # dono: A
  app/app/**                                      # dono: C

META NORTE: conversão. Todo trade-off deve favorecer conversão.

FUNDAMENTO: a plataforma wealth.Investing é SaaS de journal + IA + macro pra
traders. NÃO faz payout. NÃO é corretora. Corrigir qualquer copy que sugira.

TASKS (B-01 a B-15, ordem):
  B-01 Setup next-intl (PT default + EN)
  B-02 Hero reescrito ("Pare de operar no escuro" / "Stop trading in the dark")
  B-03 Social proof real via Supabase (trades COUNT, users COUNT, volume SUM)
  B-04 Bento de 4 features com declarações fortes
  B-05 "Como funciona" em 3 passos
  B-06 Pricing — MANTER planos e valores atuais exatamente como estão no repo.
       Apenas melhorar apresentação visual, hierarquia e copy dos benefícios.
       PROIBIDO adicionar, remover, renomear ou reprecificar qualquer plano.
  B-07 <Testimonial /> component + placeholders marcados
  B-08 FAQ de 10 OBJEÇÕES (não features)
  B-09 Mobile-first audit em 375px (Lighthouse mobile ≥90)
  B-10 lib/analytics/events.ts com 9 eventos de funil
  B-11 SEO + OG + hreflang PT/EN + sitemap
  B-12 /manifesto, /features, /pricing, /blog traduzidas
  B-13 Exit intent + sticky mobile CTA
  B-14 Preencher messages/{pt,en}.json (~150 keys)
  B-15 docs/CONVERSION-FUNNEL.md + PR

REGRAS:
- Tudo que voce vê de tokens vem de A — use hsl(var(--*)) sempre
- Importar Dexter, Logo, UltraBadge via @/components/brand (barrel)
- Se precisar de token/microcopy novo de A, ABRA uma issue no docs/NEEDS-FROM-A.md
  e siga em frente com um placeholder claramente marcado
- Cada task = commit "feat(landing): [B-XX] desc"
- npm run build + lint após cada task
- Mobile first: se não passa em 375px, não tá done

Comece: leia os 3 docs + docs/MIGRATION-TRACK-A.md se existir. START B-01.
```

**Full Track B roadmap** (from design-agent's approved plan, msg#280 — context, architecture decisions, per-task detail, cross-track coordination, and acceptance criteria — use this as the source of truth for B-01..B-15):

```md
# Track B — Landing & Conversion (B-01 → B-15)

## Context

A plataforma `wealth.Investing` (SaaS de journal + IA + macro pra traders, **não** corretora, **não** payout) está sendo refeita em 3 tracks paralelos. Track A (brand) merge primeiro com tokens + BrandMark + Mascot. Track C (app autenticado) merge por último. Eu sou Track B: minha responsabilidade é toda a superfície pública, i18n PT/EN, analytics de funil e SEO. Meta-norte: **conversão**. Toda escolha (copy, layout, ordem de seções, mobile-first) deve favorecer signup.

A landing atual já tem 22 componentes em `components/landing/` e copy genérica ("plataforma completa do trader profissional"). Vou reescrever com posicionamento de dor ("Pare de operar no escuro"), provar com dados reais do Supabase, e estruturar pra Lighthouse mobile ≥90.

**Pricing é INTOCÁVEL em valores e nomes** (Grátis R$0 / Pro R$29,90 / Ultra R$49,90; anual 0/22,90/39,90). Apenas apresentação visual e copy de benefícios podem mudar.

---

## Decisões arquiteturais

### i18n routing
- **Lib:** `next-intl@4.9.1` (já instalada)
- **Estratégia:** `localePrefix: "as-needed"` — PT default sem prefixo, EN com `/en`
- URLs PT preservadas (`/`, `/pricing`, `/manifesto`) → zero quebra de inbound links / SEO
- URLs EN: `/en`, `/en/pricing`, `/en/manifesto`
- `messages/pt.json` e `messages/en.json` populados (~150 keys, namespacing por seção)

### Estrutura de rotas (B-12)
**Mover** para `app/[locale]/`:
- `app/page.tsx` → `app/[locale]/page.tsx`
- `app/pricing/` → `app/[locale]/pricing/`
- `app/manifesto/` → `app/[locale]/manifesto/`
- `app/features/` → `app/[locale]/features/` (e subpages journal/macro/analytics/risk)
- `app/blog/` → `app/[locale]/blog/`
- `app/changelog/`, `app/academy/` → `app/[locale]/`

**Permanecem no root** (locale-neutral, ownership C ou compartilhado):
- `app/login/`, `app/auth/`, `app/onboarding/` (Track C — auth flow)
- `app/api/` (rotas server)
- `app/app/**` (Track C — área autenticada)
- `app/risk-disclaimer/` (legal, conteúdo PT-BR único)
- `app/layout.tsx`, `app/error.tsx`, `app/not-found.tsx`, `app/sitemap.ts`, `app/robots.ts`

### Brand placeholders (gap Track A)
Track A só exporta `BrandMark` e `Mascot`. Briefing pediu `Dexter`, `Logo`, `UltraBadge`. Estratégia:
- `Logo` → uso `BrandMark` (mesma intenção semântica)
- `Dexter` (mascote AI Coach) → stub local em `components/landing/_brand-stubs/Dexter.tsx` que renderiza `Mascot pose="focus" color="hsl(var(--landing-accent))"` com TODO no topo
- `UltraBadge` → stub local em `components/landing/_brand-stubs/UltraBadge.tsx` (pill com fundo `--landing-accent`)
- Abrir `docs/NEEDS-FROM-A.md` listando os 3 e propondo API mínima
- Quando A merge as versões oficiais, swap dos imports é busca-e-substitui (1 commit)

### Pricing preservation (B-06)
- **NÃO TOCAR** o array `tiers` em [components/billing/PricingCards.tsx](components/billing/PricingCards.tsx) (linhas 25-91)
- Refactor visual: criar wrapper `components/landing/PricingSection.tsx` que importa o `PricingCards` existente e adiciona contexto de conversão (heading "Escolha o plano que cabe agora", FAQ contextual, garantia, "cancele a qualquer momento")
- Copy de benefícios pode ser polida via prop opcional, mas defaults atuais ficam intactos
- O `components/landing/PricingSummary.tsx` (versão da landing root) é o único onde toco apresentação — sem mexer nos valores

### Analytics (B-10)
`lib/analytics/events.ts` é contract file (Track A e C também emitem). Vou definir:
- `track(event, props)` helper usando `@vercel/analytics` (já presente; sem nova dep — PostHog ausente, fora de scope)
- 9 eventos do funil: `landing_view`, `hero_cta_click`, `pricing_view`, `pricing_plan_click`, `signup_start`, `signup_complete`, `paywall_view`, `checkout_start`, `subscription_active`
- Props padronizados: `{ source, plan?, locale, variant? }`

### Social proof real (B-03)
- Endpoint server: `app/api/public/stats/route.ts` (cacheado 5min com `revalidate`)
- Queries: `COUNT(*)` em `journal_trades`, `COUNT(DISTINCT user_id)` em `profiles`, `SUM(net_pnl_usd)` em `journal_trades` para volume
- Floor mínimo (ex: trades < 1000 → mostrar "+1.000") pra evitar números pequenos no início
- Cliente consome via `<StatCounter />` existente (animado com `@number-flow/react`)

---

## Sequência de tasks

Cada task = 1 commit `feat(landing): [B-XX] desc` + `npm run build && npm run lint`.

### B-01 — Setup next-intl
- Atualizar `i18n.ts` (já é stub) com `getRequestConfig` validando locale
- `next.config.mjs`: adicionar plugin `createNextIntlPlugin('./i18n.ts')`
- `middleware.ts`: estender o atual (que está disabled para `/app/:path*`) com `createMiddleware` do next-intl, matcher `['/((?!api|_next|_vercel|.*\\..*).*)']`. Garantir que NÃO interfere com `/app/**` (auth) nem `/api/**`
- Criar `app/[locale]/layout.tsx` (substitui parte do `app/layout.tsx`) — `NextIntlClientProvider` + `unstable_setRequestLocale(locale)`
- Mover `app/page.tsx` → `app/[locale]/page.tsx` (apenas o move, conteúdo inalterado nesta task)

### B-02 — Hero rewrite
- `components/landing/Hero.tsx` reescrito
- Headline PT: "Pare de operar no escuro." Subhead: "Journal automatizado, IA que lê seu histórico e contexto macro em tempo real. Decisões com dados, não com achismo."
- Headline EN: "Stop trading in the dark." Subhead simétrico
- 2 CTAs: primário "Começar grátis" (→ `/login?intent=signup`, emite `hero_cta_click`); secundário "Ver demo" (anchor pra mockup)
- Mascot `pose="focus"` à direita em desktop
- Mobile: stack vertical, CTA primário sticky no fundo (compõe com B-13)
- Trust strip com `<StatCounter />` consumindo B-03

### B-03 — Social proof real
- `app/api/public/stats/route.ts` (GET, RLS-safe — usa anon read-only ou service-role server-only)
- Hook `lib/hooks/usePublicStats.ts` — SWR-style com fallback estático
- Substituir números hardcoded ("+430 traders") nos componentes que usam

### B-04 — Bento de 4 features
- `components/landing/FeatureBento.tsx` substituindo `BentoFeatures.tsx` atual (6 cells → 4 cells maiores)
- Cards com **declarações fortes** (não features):
  1. "Cada trade vira aula" (Journal + AI Coach)
  2. "O macro chega antes do mercado" (Macro briefing + headlines)
  3. "Sua psicologia, decifrada" (Tags + padrões emocionais)
  4. "Risco que não te quebra" (Drawdown + alerts prop firms)
- Cada card abre modal/drawer com mockup interativo (reusar `InteractiveFeatureShowcase.tsx`)

### B-05 — How it works (3 passos)
- `components/landing/HowItWorks.tsx` reescrito (atual tem 4 passos)
- Passos: 1) Importa MT5/MT4/cTrader → 2) IA analisa padrões → 3) Você decide com contexto
- Visual de timeline horizontal desktop / vertical mobile
- Cada passo com micro-animação Framer Motion (já no projeto)

### B-06 — Pricing visual polish
- Criar `components/landing/PricingSection.tsx` — wrapper que renderiza `<PricingCards />` existente + contexto de conversão (garantia 7 dias, "cancele a qualquer momento", FAQ link)
- **NÃO mexer** em `components/billing/PricingCards.tsx` (planos/preços)
- Atualizar `components/landing/PricingSummary.tsx` apenas em: spacing, hierarquia tipográfica, badge "Mais popular" mais visível, copy de benefícios (preservando lista `features` exata do array `tiers`)

### B-07 — Testimonial component
- `components/landing/Testimonial.tsx` — 1 testemunho destacado (large quote + foto + nome + firma + métrica destaque)
- `components/landing/TestimonialGrid.tsx` — 3-6 cards menores
- Conteúdo placeholder claramente marcado: `data-placeholder="true"` + comentário `{/* TODO: real testimonial */}` em cada string
- `CustomerStories.tsx` existente fica como fallback até ter conteúdo real

### B-08 — FAQ de 10 OBJEÇÕES
- `components/landing/FAQ.tsx` (não existe ainda)
- Foco em **objeções**, não em explicação de features:
  1. "É seguro conectar minha conta MT5?"
  2. "E se eu quiser cancelar?"
  3. "Funciona pra prop firm X?" (FTMO, The5ers, FundedNext, Topstep, Apex, MyForexFunds)
  4. "Qual a diferença pra Edgewonk/TraderSync?"
  5. "A IA realmente analisa ou é só wrapper de ChatGPT?"
  6. "Meus dados são privados?"
  7. "Vocês são corretora?" (RESPOSTA: não, somos SaaS)
  8. "Vocês fazem payout?" (RESPOSTA: não, journaling)
  9. "Funciona offline?"
  10. "Posso testar antes de pagar?"
- Schema.org `FAQPage` no JSON-LD (boost SEO B-11)

### B-09 — Mobile-first audit em 375px
- Auditar todas as seções no breakpoint mais hostil (iPhone SE)
- Grid: nada de `md:` sem fallback mobile elegante
- Tap targets ≥44px
- Lighthouse mobile ≥90 em Performance, Accessibility, Best Practices, SEO
- Verificar com `mcp__playwright__*` viewports 375x667 e 414x896
- LCP otimizado: hero image priority, fonts swap, no layout shift

### B-10 — lib/analytics/events.ts
- Exportar `track(event: FunnelEvent, props: EventProps)` + `FunnelEvent` union type + `EventProps` interface
- 9 eventos definidos acima, com propriedades tipadas
- Wrap `Analytics` do Vercel + queue local pra eventos pré-mount
- Documentar contrato em comment block (Track A e C importam)

### B-11 — SEO + OG + hreflang + sitemap
- `app/layout.tsx`: metadata base mantida; adicionar `alternates.languages` (PT/EN)
- Cada `app/[locale]/{page,pricing,manifesto,features,blog}/page.tsx`: `generateMetadata` com title/description traduzidos + `alternates.canonical` + `alternates.languages`
- OG images dinâmicas: `app/og/route.tsx` usando `next/og` (1200x630, brand-consistent)
- `app/sitemap.ts` reescrito: gerar entries para PT + EN de cada rota; `priority` mantido
- `app/robots.ts` (criar; hoje só `manifest.json` estático): allow all, sitemap link

### B-12 — Páginas públicas traduzidas
- Move + tradução: `manifesto`, `features` (+ subpages), `pricing`, `blog`, `changelog`, `academy`
- Cada página usa `useTranslations(namespace)` ou `getTranslations` (server)
- Conteúdo PT preservado verbatim; EN traduzido (manter espírito sugestivo do tom Instagram conforme `feedback_instagram_tone.md`)

### B-13 — Exit intent + sticky mobile CTA
- `components/landing/ExitIntentModal.tsx` — desktop: detecta `mouseleave` topo da viewport; uma vez por sessão (sessionStorage); oferece "Antes de sair: ganhe 30 dias Pro grátis no signup"
- `components/landing/StickyMobileCta.tsx` — fixed bottom em mobile (<768px), aparece após 30% scroll, dismiss-able
- Ambos emitem `hero_cta_click` com `source: 'exit_intent'` ou `source: 'sticky_mobile'`

### B-14 — messages/{pt,en}.json (~150 keys)
- Namespacing: `nav`, `hero`, `trust`, `bento`, `how`, `pricing`, `testimonial`, `faq`, `footer`, `meta` (SEO), `cta`, `exitIntent`
- PT preenchido com copy final aprovada nas tasks B-02 a B-13
- EN traduzido em paralelo (mesmas chaves, valores traduzidos)
- Validar com script: `tsx scripts/check-i18n-parity.ts` (criar) — falha se chave existe em PT mas não em EN

### B-15 — docs/CONVERSION-FUNNEL.md + PR
- `docs/CONVERSION-FUNNEL.md` documentando: 9 eventos, jornada esperada, métricas-alvo (CTR hero, scroll-depth pricing, signup conversion), instrumentação por componente
- PR `feat/track-b-landing` → main: changelog completo, screenshots mobile+desktop PT+EN, Lighthouse report anexado, checklist de tasks B-01..B-14

---

## Reuse vs replace (componentes existentes)

| Componente atual | Ação |
|---|---|
| `Navbar.tsx` | Refactor: i18n + locale switcher PT/EN |
| `Hero.tsx` | **Reescrever** (B-02) |
| `TrustBar.tsx` | Manter (logos prop firms) |
| `BentoFeatures.tsx` | **Substituir** por `FeatureBento.tsx` (B-04) |
| `HowItWorks.tsx` | **Reescrever** 4→3 passos (B-05) |
| `PricingSummary.tsx` | Polir visual, preservar dados |
| `PricingCards.tsx` (billing) | **NÃO TOCAR** |
| `Footer.tsx` | Refactor i18n + adicionar links manifesto/features |
| `CustomerStories.tsx` | Manter como fallback até B-07 |
| `InteractiveFeatureShowcase.tsx` | Reusar nos modals do Bento |
| `MockupDashboard.tsx`, `JournalMockup.tsx` | Reusar |
| `StatCounter.tsx` | Reusar com B-03 |
| `SmartCTALink.tsx` | Reusar (CTAs auth-aware) |
| `Logo.tsx` (landing) | Trocar por `BrandMark` |
| `AnnouncementBar.tsx` | Manter, opt-in |
| `LegalModals.tsx`, `NavModals.tsx` | Manter |
| `ThemeToggle.tsx` | Manter |
| `BlogContent.tsx` | Refactor para B-12 |
| `feature-pages/`, `feature-panels/` | Manter, refactorar imports pra `[locale]` |

---

## Coordenação cross-track

### Contract files (preciso editar — coordenar com A/C)
- `lib/analytics/events.ts` — sou eu quem define o contrato, A e C consomem
- `components/brand/index.ts` — **NÃO edito**, abro NEEDS-FROM-A.md

### `docs/NEEDS-FROM-A.md` (criar)
Pedidos pra Track A:
1. `Dexter` — mascote AI Coach. API: `<Dexter pose?, size?, mood? />`. Uso: cards Bento "Cada trade vira aula", FAQ "A IA realmente analisa?"
2. `Logo` — variante horizontal/vertical do BrandMark com tagline. API: `<Logo variant="horizontal"|"vertical"|"icon" />`
3. `UltraBadge` — pill destaque tier Ultra. API: `<UltraBadge>Ultra</UltraBadge>`. Cor de fundo/borda do tier máximo

### Não toco (ownership A)
- `tailwind.config.ts`, `app/globals.css`, `BRAND.md`, `components/brand/**`

### Não toco (ownership C)
- `app/app/**`, `app/login`, `app/auth`, `app/onboarding`, billing webhooks
- Mas POSSO emitir eventos do `events.ts` que C vai instrumentar no checkout

---

## Arquivos críticos a modificar/criar

**Modificar:**
- [i18n.ts](i18n.ts) (B-01)
- [middleware.ts](middleware.ts) (B-01 — preservar matcher /app/* atual)
- next.config.mjs (B-01)
- [app/layout.tsx](app/layout.tsx) (B-11 — alternates.languages)
- [app/sitemap.ts](app/sitemap.ts) (B-11 — entries PT+EN)
- [components/landing/Hero.tsx](components/landing/Hero.tsx) (B-02)
- [components/landing/HowItWorks.tsx](components/landing/HowItWorks.tsx) (B-05)
- [components/landing/Footer.tsx](components/landing/Footer.tsx) (B-12)
- [components/landing/Navbar.tsx](components/landing/Navbar.tsx) (B-01, B-12)
- [components/landing/PricingSummary.tsx](components/landing/PricingSummary.tsx) (B-06 — só visual)
- [messages/pt.json](messages/pt.json), [messages/en.json](messages/en.json) (B-14)

**Criar:**
- `app/[locale]/layout.tsx`, `app/[locale]/page.tsx`, `app/[locale]/{pricing,manifesto,features,blog,changelog,academy}/page.tsx`
- `app/api/public/stats/route.ts` (B-03)
- `app/og/route.tsx` (B-11)
- `app/robots.ts` (B-11)
- `components/landing/FeatureBento.tsx` (B-04)
- `components/landing/PricingSection.tsx` (B-06)
- `components/landing/Testimonial.tsx`, `TestimonialGrid.tsx` (B-07)
- `components/landing/FAQ.tsx` (B-08)
- `components/landing/ExitIntentModal.tsx` (B-13)
- `components/landing/StickyMobileCta.tsx` (B-13)
- `components/landing/_brand-stubs/Dexter.tsx`, `UltraBadge.tsx` (placeholders)
- `lib/hooks/usePublicStats.ts` (B-03)
- `lib/analytics/events.ts` (B-10 — substitui stub)
- `scripts/check-i18n-parity.ts` (B-14)
- `docs/NEEDS-FROM-A.md`
- `docs/CONVERSION-FUNNEL.md` (B-15)

**Mover (não modificar conteúdo na move):**
- `app/page.tsx` → `app/[locale]/page.tsx`
- `app/pricing/`, `app/manifesto/`, `app/features/`, `app/blog/`, `app/changelog/`, `app/academy/` → `app/[locale]/...`

**NÃO TOCAR:**
- `components/billing/PricingCards.tsx` (planos/preços)
- `components/brand/**` (Track A)
- `tailwind.config.ts`, `app/globals.css` (Track A)
- `app/app/**`, `app/login/`, `app/auth/`, `app/onboarding/`, `app/api/` exceto `api/public/stats` (Track C / shared)

---

## Verificação end-to-end

Por task:
- `npm run lint` — zero warnings novos
- `npm run build` — sucesso, sem erros TS
- Manual: `npm run dev`, abrir `/` (PT) e `/en` (EN), conferir tradução

Por milestone (após B-09 e B-15):
- Lighthouse mobile (Chrome DevTools) em `/`, `/en`, `/pricing`, `/en/pricing`: Performance/A11y/BP/SEO ≥90
- Playwright (`mcp__playwright__*`):
  - Viewport 375x667: hero CTA visível, sticky CTA aparece após 30% scroll, FAQ expansível
  - Viewport 1440x900: bento 4 cards, mocked dashboard renderiza
  - Locale switch: clicar PT/EN troca URL e idioma
  - Eventos analytics: console.log mockado dispara `landing_view`, `hero_cta_click`, `pricing_view`
- Verificar `/api/public/stats` retorna shape `{ trades: number, traders: number, volumeUsd: number }` com cache headers
- `tsx scripts/check-i18n-parity.ts` exit 0 (PT/EN sincronizados)
- Sitemap: `curl /sitemap.xml` lista entries PT+EN; hreflang nos `<head>`
- Pricing: diff de `components/billing/PricingCards.tsx` vs main = vazio (preservação confirmada)

## Aceitação final (B-15)

- [ ] PT default funciona em `/`, EN funciona em `/en`
- [ ] Hero copy: "Pare de operar no escuro" / "Stop trading in the dark"
- [ ] Pricing: 3 planos, valores R$0/29,90/49,90 mensal e 0/22,90/39,90 anual — INALTERADOS
- [ ] Social proof busca dados reais (não mais "+430 traders" hardcoded)
- [ ] FAQ tem 10 perguntas-objeção, não features
- [ ] Bento tem 4 (não 6) features com declarações fortes
- [ ] Como funciona em 3 passos (não 4)
- [ ] 9 eventos do funil instrumentados em `lib/analytics/events.ts`
- [ ] Lighthouse mobile ≥90 em todas as 4 categorias
- [ ] Sitemap inclui hreflang PT+EN
- [ ] Exit intent + sticky CTA funcionam
- [ ] `messages/pt.json` e `messages/en.json` em paridade (~150 keys)
- [ ] `docs/CONVERSION-FUNNEL.md` documenta funil
- [ ] `docs/NEEDS-FROM-A.md` lista Dexter/Logo/UltraBadge
- [ ] PR `feat/track-b-landing` aberto com checklist completo
```

---

### Track B — per-task status

- **B-01 — Setup next-intl** — [SHIPPED] — full plan embedded above
- **B-02 — Hero rewrite** — [SHIPPED] — full plan embedded above
- **B-03 — Social proof real** — [SHIPPED] — full plan embedded above
- **B-04 — Bento de 4 features** — [SHIPPED] — full plan embedded above
- **B-05 — How it works (3 passos)** — [SHIPPED] — full plan embedded above
- **B-06 — Pricing visual polish** — [SHIPPED] — full plan embedded above
- **B-07 — Testimonial component** — [SHIPPED] — full plan embedded above
- **B-08 — FAQ de 10 OBJEÇÕES** — [SHIPPED] — full plan embedded above
- **B-09 — Mobile-first audit em 375px** — [PENDING] — full plan embedded above
- **B-10 — lib/analytics/events.ts** — [PENDING] — full plan embedded above
- **B-11 — SEO + OG + hreflang + sitemap** — [PENDING] — full plan embedded above
- **B-12 — Páginas públicas traduzidas** — [SHIPPED] — full plan embedded above
- **B-13 — Exit intent + sticky mobile CTA** — [SHIPPED] — full plan embedded above
- **B-14 — messages/{pt,en}.json (~150 keys)** — [SHIPPED] — full plan embedded above
- **B-15 — docs/CONVERSION-FUNNEL.md + PR** — [PENDING] — full plan embedded above

---

## Track C — App (authenticated area)

**Session init prompt** (copied verbatim — paste as the first message to a new Track C session):

```
Você é a sessão TRACK C. Contexto crítico:

- Repo: trading-dashboard (Next 14, Tailwind, shadcn, Supabase)
- Docs: CLAUDE.md (OBRIGATÓRIO — regras de auth), BRAND.md, docs/TRACK-COORDINATION.md
- Outras 2 sessões: A (brand), B (landing). Ownership estrito.

SEU OWNERSHIP:
  app/app/**
  components/{dashboard,journal,macro,ai,live,calendar,prop,reports}/**
  components/layout/AppSidebar.tsx
  components/layout/AppShell.tsx
  components/layout/AppHeader.tsx (pode remover)
  components/layout/AppMobileNav.tsx
  lib/entitlements.ts
  lib/dexter/** (novo)
  app/api/dexter/** (novo, consolidando /api/ai-coach + /api/analyst)

NÃO TOCAR:
  middleware.ts                        # CONGELADO — CLAUDE.md
  components/auth/AuthGate.tsx         # CONGELADO — CLAUDE.md
  app/auth/callback/**                 # CONGELADO — CLAUDE.md
  app/page.tsx, components/landing/**  # dono: B
  tailwind.config.ts, globals.css, BRAND.md, components/brand/**  # dono: A

META NORTE: experiência logada que responde "o que eu faço agora?" em 2s.

TASKS (C-01 a C-16):
  C-01 AppSidebar unificado (substitui headers avulsos)
  C-02 lib/entitlements.ts + useEntitlements()
  C-03 Dashboard: "Hoje, isso importa" (Dexter gera, Redis cache 4h)
  C-04 Dashboard: 3 KPIs + Timeline do dia
  C-05 Aposentar widgets antigos (mover ou deletar seguindo triagem)
  C-06 Journal: Calendar PnL como topo da página
  C-07 Journal: Trade card narrativo com Dexter debrief
  C-08 Journal: Empty state como onboarding guiado
  C-09 Macro: Terminal mode layout (grid 5-4-3)
  C-10 Macro: filtro "só meus ativos"
  C-11 Dexter unificado (consolida /ai-coach + /analyst; redirects 301)
  C-12 MT5 Live como <UltraLock active> (economia de infra real)
  C-13 Prop firms dashboard por firma
  C-14 Reports: export PDF com branding (viralização)
  C-15 i18n integra app com next-intl (namespace app.*)
  C-16 QA smoke tests + PR + docs/CHANGES-C.md

REGRAS CRÍTICAS DE AUTH (CLAUDE.md):
- NUNCA supabase.auth.signOut() — manual localStorage cleanup
- NUNCA router.replace() em auth — window.location.href
- NUNCA .single() — sempre .maybeSingle()
- SEMPRE .eq("user_id", session.user.id) em queries
- bg-card precisa de inline style com hsl(var(--card))

OUTRAS:
- Importar <Dexter/>, <UltraBadge/>, <UltraLock/> via @/components/brand
- Emitir eventos via lib/analytics/events.ts (ultra_upgrade_clicked etc)
- Cada task = commit "feat(app): [C-XX] desc"
- Se mudança quiser tocar AuthGate/middleware, PARE e pergunte
- MT5 Live: polling só se entitlements.can.mt5Live === true (resolve gasto)

Comece: leia CLAUDE.md + BRAND.md + docs/TRACK-COORDINATION.md. START C-01.
```

### C-01 — AppSidebar unificado (substitui headers avulsos) [SHIPPED] [full plan]

```md
# Track C — C-01: AppSidebar unificado

## Context

Track C owns `/app/**` for the "what do I do now?" logged experience. Today, the
authenticated shell is split across three components that each maintain their
own nav array, admin/mentor detection and user card:

- `components/layout/AppSidebar.tsx` (439 lines) — desktop rail, most complete
- `components/layout/AppHeader.tsx` (177 lines) — mobile-only top bar (hidden `md:`) with hamburger drawer, user menu, logout
- `components/layout/AppMobileNav.tsx` — mobile bottom tab bar

The duplication hurts: three copies of the nav list, two copies of admin/mentor
fetches, two copies of `logout()`. The user card shape drifts between
AppSidebar and AppHeader. "C-01 AppSidebar unificado (substitui headers avulsos)"
calls for a single source of truth for nav + roles, with the rail and
bottom-bar rendering from it, and AppHeader reduced or removed.

Later tasks (C-02 entitlements, C-11 Dexter consolidation, C-15 i18n) will
layer on top, so C-01 keeps scope tight: **restructure, don't reskin**.

## What changes (files)

### New (Track C owned — safe zone)
- `lib/app-nav.ts` — single `AppNavItem[]` source. Exports `getAppNav({ isMentor, isLinkedStudent, isAdmin })` returning the ordered list. Icons imported from `lucide-react`. Each item gets `id` (for analytics), `href`, `labelKey` (future i18n), `icon`, `highlight?`, `primary?` (appears in mobile tab bar), `secondary?` (hamburger drawer only).
- `lib/hooks/useAppRoles.ts` — consolidates the `/api/admin/me` and `/api/mentor/my-mentor` fetches that are currently duplicated across AppSidebar and AppMobileNav. Returns `{ isAdmin, isLinkedStudent, isLoading }`. Uses `safeGetSession` per CLAUDE.md rules.
- `lib/analytics/emit.ts` — thin local emitter: `emit(event: string, payload?: Record<string, unknown>)`. No-ops today (Track B hasn't shipped taxonomy). Wrapped so every sidebar/mobile click fires `emit("nav_clicked", { id })` and the upgrade CTA fires `emit("ultra_upgrade_clicked", { source: "sidebar" })`. When Track B lands `lib/analytics/events.ts`, we swap internals without touching callsites. NOTE: this file lives under `lib/analytics/` but is a **separate file** from Track B's `events.ts` — doesn't violate ownership.

### Modified (Track C owned)
- `components/layout/AppSidebar.tsx` — consume `getAppNav()` + `useAppRoles()`. Remove the duplicated `baseNavLinks`, `adminNavLink`, admin/mentor effects, and `logout()` (moved to shared). Emit analytics on link click and upgrade CTA click. Keep AI Coach conversation sub-nav, collapse toggle, user card, theme toggle. No visual change.
- `components/layout/AppMobileNav.tsx` — consume `getAppNav()` filtered by `primary: true` + `useAppRoles()`. Remove duplicated items + admin effect. No visual change.
- `components/layout/AppHeader.tsx` — **reduce, not remove** (per task note "pode remover"). Becomes a lean mobile-only bar: brand on the left, hamburger on the right. The hamburger opens a drawer pulling nav from `getAppNav()` with `secondary: true` items (Contas, Planos, Settings, Feedback, Sair). Drops: duplicated desktop nav, user menu, standalone logout. `md:hidden` stays. Delete reason: removing it entirely leaves mobile without access to settings/logout unless we bolt those into the bottom bar, which crowds it.
- `lib/auth/logout.ts` — **new** (if missing) or relocate the duplicated `logout()` function. Both AppSidebar and AppHeader call identical `localStorage.removeItem` + `window.location.href` flows. Extract and import.

### Untouched (frozen or owned by others)
- `components/auth/AuthGate.tsx`, `app/auth/callback/**`, `middleware.ts`
- `components/brand/**` (Track A). `Dexter`, `UltraBadge`, `UltraLock` are **not yet exported** from `components/brand/index.ts` — deferred to C-11/C-02. C-01 ships without touching brand components.
- `lib/analytics/events.ts` (Track B stub — not edited)
- `app/app/layout.tsx`, `components/layout/AppShell.tsx` — already wired correctly; no change needed.

## Critical rules honored

- ✅ No `supabase.auth.signOut()` — shared `logout()` keeps manual `localStorage.removeItem` + `window.location.href`
- ✅ No `router.replace()` in auth
- ✅ No `.single()` — role fetches stay on `.maybeSingle()` semantics (the API routes return JSON, unchanged)
- ✅ `.eq("user_id", session.user.id)` — not applicable at this layer (calls go through Bearer-auth API routes)
- ✅ `bg-card` inline style — preserved wherever it already appears; no new `bg-card` usage

## Verification

1. `npm run lint && npm run build` — clean.
2. Manual: start `npm run dev`, log in, walk every route in the sidebar (Dashboard, Journal, Mentor, Contas, Macro, Analyst, AI Coach, Admin if admin), verify active state + collapse.
3. Mobile viewport (Chrome devtools): bottom tab bar renders same routes as `primary: true`; hamburger in AppHeader opens drawer with secondary items + logout.
4. Logout from desktop sidebar **and** mobile drawer → both land on `/login` with cleared localStorage (DevTools → Application → Local Storage should have no `sb-*-auth-token`).
5. Admin-only nav entry only shows for admin users (check with non-admin account).
6. Mentor label flips: mentor sees "Painel Mentor"; linked student sees "Mentor"; unlinked sees "Mentoria".
7. AI Coach sub-nav (conversation list) still loads when on `/app/ai-coach`.
8. Open DevTools console, click each nav item — confirm `emit("nav_clicked", { id })` fires (console.log during dev until Track B taxonomy lands).

## Decisions (confirmed with user)

- **AppHeader**: keep as lean mobile brand+hamburger; drawer renders `secondary: true` nav items
- **Analytics**: ship `lib/analytics/emit.ts` local wrapper (no-op), rewire to Track B's `events.ts` when it lands
- **Entitlements**: defer migration to C-02; C-01 keeps `useSubscription()`
- **Logout extraction**: `lib/auth/logout.ts` (new)

## Out of scope for C-01 (future tasks)

- Entitlements migration (`useSubscription` → `useEntitlements`) — **C-02**
- Dexter / UltraBadge / UltraLock visual slots — **C-11 / C-12**
- i18n keys replacing the hardcoded pt-BR labels — **C-15**
- Removing AppHeader entirely — revisit after mobile UX review
```

---

### C-02 — lib/entitlements.ts + useEntitlements() [SHIPPED] [summary only]

**Objective:** lib/entitlements.ts + useEntitlements()

**Ownership (from Track C init):**
```
  app/app/**
  components/{dashboard,journal,macro,ai,live,calendar,prop,reports}/**
  components/layout/AppSidebar.tsx
  components/layout/AppShell.tsx
  components/layout/AppHeader.tsx (pode remover)
  components/layout/AppMobileNav.tsx
  lib/entitlements.ts
  lib/dexter/** (novo)
  app/api/dexter/** (novo, consolidando /api/ai-coach + /api/analyst)
```

**Critical auth rules (CLAUDE.md):** NUNCA `supabase.auth.signOut()` (use manual localStorage cleanup); NUNCA `router.replace()` em auth (use `window.location.href`); NUNCA `.single()` (sempre `.maybeSingle()`); SEMPRE `.eq("user_id", session.user.id)`; `bg-card` precisa de inline style com `hsl(var(--card))`.

**Commit convention:** `feat(app): [C-02] desc`.

> No detailed design-agent plan was captured in the session for this task. Regenerate the detailed plan before handing to a Track C session.

---

### C-03 — Dashboard: "Hoje, isso importa" (Dexter gera, Redis cache 4h) [SHIPPED] [summary only]

**Objective:** Dashboard: "Hoje, isso importa" (Dexter gera, Redis cache 4h)

**Ownership (from Track C init):**
```
  app/app/**
  components/{dashboard,journal,macro,ai,live,calendar,prop,reports}/**
  components/layout/AppSidebar.tsx
  components/layout/AppShell.tsx
  components/layout/AppHeader.tsx (pode remover)
  components/layout/AppMobileNav.tsx
  lib/entitlements.ts
  lib/dexter/** (novo)
  app/api/dexter/** (novo, consolidando /api/ai-coach + /api/analyst)
```

**Critical auth rules (CLAUDE.md):** NUNCA `supabase.auth.signOut()` (use manual localStorage cleanup); NUNCA `router.replace()` em auth (use `window.location.href`); NUNCA `.single()` (sempre `.maybeSingle()`); SEMPRE `.eq("user_id", session.user.id)`; `bg-card` precisa de inline style com `hsl(var(--card))`.

**Commit convention:** `feat(app): [C-03] desc`.

> No detailed design-agent plan was captured in the session for this task. Regenerate the detailed plan before handing to a Track C session.

---

### C-04 — Dashboard: 3 KPIs + Timeline do dia [SHIPPED] [summary only]

**Objective:** Dashboard: 3 KPIs + Timeline do dia

**Ownership (from Track C init):**
```
  app/app/**
  components/{dashboard,journal,macro,ai,live,calendar,prop,reports}/**
  components/layout/AppSidebar.tsx
  components/layout/AppShell.tsx
  components/layout/AppHeader.tsx (pode remover)
  components/layout/AppMobileNav.tsx
  lib/entitlements.ts
  lib/dexter/** (novo)
  app/api/dexter/** (novo, consolidando /api/ai-coach + /api/analyst)
```

**Critical auth rules (CLAUDE.md):** NUNCA `supabase.auth.signOut()` (use manual localStorage cleanup); NUNCA `router.replace()` em auth (use `window.location.href`); NUNCA `.single()` (sempre `.maybeSingle()`); SEMPRE `.eq("user_id", session.user.id)`; `bg-card` precisa de inline style com `hsl(var(--card))`.

**Commit convention:** `feat(app): [C-04] desc`.

> No detailed design-agent plan was captured in the session for this task. Regenerate the detailed plan before handing to a Track C session.

---

### C-05 — Aposentar widgets antigos (mover ou deletar seguindo triagem) [SHIPPED] [summary only]

**Objective:** Aposentar widgets antigos (mover ou deletar seguindo triagem)

**Ownership (from Track C init):**
```
  app/app/**
  components/{dashboard,journal,macro,ai,live,calendar,prop,reports}/**
  components/layout/AppSidebar.tsx
  components/layout/AppShell.tsx
  components/layout/AppHeader.tsx (pode remover)
  components/layout/AppMobileNav.tsx
  lib/entitlements.ts
  lib/dexter/** (novo)
  app/api/dexter/** (novo, consolidando /api/ai-coach + /api/analyst)
```

**Critical auth rules (CLAUDE.md):** NUNCA `supabase.auth.signOut()` (use manual localStorage cleanup); NUNCA `router.replace()` em auth (use `window.location.href`); NUNCA `.single()` (sempre `.maybeSingle()`); SEMPRE `.eq("user_id", session.user.id)`; `bg-card` precisa de inline style com `hsl(var(--card))`.

**Commit convention:** `feat(app): [C-05] desc`.

> No detailed design-agent plan was captured in the session for this task. Regenerate the detailed plan before handing to a Track C session.

---

### C-06 — Journal: Calendar PnL como topo da página [SHIPPED] [summary only]

**Objective:** Journal: Calendar PnL como topo da página

**Ownership (from Track C init):**
```
  app/app/**
  components/{dashboard,journal,macro,ai,live,calendar,prop,reports}/**
  components/layout/AppSidebar.tsx
  components/layout/AppShell.tsx
  components/layout/AppHeader.tsx (pode remover)
  components/layout/AppMobileNav.tsx
  lib/entitlements.ts
  lib/dexter/** (novo)
  app/api/dexter/** (novo, consolidando /api/ai-coach + /api/analyst)
```

**Critical auth rules (CLAUDE.md):** NUNCA `supabase.auth.signOut()` (use manual localStorage cleanup); NUNCA `router.replace()` em auth (use `window.location.href`); NUNCA `.single()` (sempre `.maybeSingle()`); SEMPRE `.eq("user_id", session.user.id)`; `bg-card` precisa de inline style com `hsl(var(--card))`.

**Commit convention:** `feat(app): [C-06] desc`.

> No detailed design-agent plan was captured in the session for this task. Regenerate the detailed plan before handing to a Track C session.

---

### C-07 — Journal: Trade card narrativo com Dexter debrief [PENDING] [summary only]

**Objective:** Journal: Trade card narrativo com Dexter debrief

**Ownership (from Track C init):**
```
  app/app/**
  components/{dashboard,journal,macro,ai,live,calendar,prop,reports}/**
  components/layout/AppSidebar.tsx
  components/layout/AppShell.tsx
  components/layout/AppHeader.tsx (pode remover)
  components/layout/AppMobileNav.tsx
  lib/entitlements.ts
  lib/dexter/** (novo)
  app/api/dexter/** (novo, consolidando /api/ai-coach + /api/analyst)
```

**Critical auth rules (CLAUDE.md):** NUNCA `supabase.auth.signOut()` (use manual localStorage cleanup); NUNCA `router.replace()` em auth (use `window.location.href`); NUNCA `.single()` (sempre `.maybeSingle()`); SEMPRE `.eq("user_id", session.user.id)`; `bg-card` precisa de inline style com `hsl(var(--card))`.

**Commit convention:** `feat(app): [C-07] desc`.

> No detailed design-agent plan was captured in the session for this task. Regenerate the detailed plan before handing to a Track C session.

---

### C-08 — Journal: Empty state como onboarding guiado [PENDING] [summary only]

**Objective:** Journal: Empty state como onboarding guiado

**Ownership (from Track C init):**
```
  app/app/**
  components/{dashboard,journal,macro,ai,live,calendar,prop,reports}/**
  components/layout/AppSidebar.tsx
  components/layout/AppShell.tsx
  components/layout/AppHeader.tsx (pode remover)
  components/layout/AppMobileNav.tsx
  lib/entitlements.ts
  lib/dexter/** (novo)
  app/api/dexter/** (novo, consolidando /api/ai-coach + /api/analyst)
```

**Critical auth rules (CLAUDE.md):** NUNCA `supabase.auth.signOut()` (use manual localStorage cleanup); NUNCA `router.replace()` em auth (use `window.location.href`); NUNCA `.single()` (sempre `.maybeSingle()`); SEMPRE `.eq("user_id", session.user.id)`; `bg-card` precisa de inline style com `hsl(var(--card))`.

**Commit convention:** `feat(app): [C-08] desc`.

> No detailed design-agent plan was captured in the session for this task. Regenerate the detailed plan before handing to a Track C session.

---

### C-09 — Macro: Terminal mode layout (grid 5-4-3) [PENDING] [summary only]

**Objective:** Macro: Terminal mode layout (grid 5-4-3)

**Ownership (from Track C init):**
```
  app/app/**
  components/{dashboard,journal,macro,ai,live,calendar,prop,reports}/**
  components/layout/AppSidebar.tsx
  components/layout/AppShell.tsx
  components/layout/AppHeader.tsx (pode remover)
  components/layout/AppMobileNav.tsx
  lib/entitlements.ts
  lib/dexter/** (novo)
  app/api/dexter/** (novo, consolidando /api/ai-coach + /api/analyst)
```

**Critical auth rules (CLAUDE.md):** NUNCA `supabase.auth.signOut()` (use manual localStorage cleanup); NUNCA `router.replace()` em auth (use `window.location.href`); NUNCA `.single()` (sempre `.maybeSingle()`); SEMPRE `.eq("user_id", session.user.id)`; `bg-card` precisa de inline style com `hsl(var(--card))`.

**Commit convention:** `feat(app): [C-09] desc`.

> No detailed design-agent plan was captured in the session for this task. Regenerate the detailed plan before handing to a Track C session.

---

### C-10 — Macro: filtro "só meus ativos" [PENDING] [summary only]

**Objective:** Macro: filtro "só meus ativos"

**Ownership (from Track C init):**
```
  app/app/**
  components/{dashboard,journal,macro,ai,live,calendar,prop,reports}/**
  components/layout/AppSidebar.tsx
  components/layout/AppShell.tsx
  components/layout/AppHeader.tsx (pode remover)
  components/layout/AppMobileNav.tsx
  lib/entitlements.ts
  lib/dexter/** (novo)
  app/api/dexter/** (novo, consolidando /api/ai-coach + /api/analyst)
```

**Critical auth rules (CLAUDE.md):** NUNCA `supabase.auth.signOut()` (use manual localStorage cleanup); NUNCA `router.replace()` em auth (use `window.location.href`); NUNCA `.single()` (sempre `.maybeSingle()`); SEMPRE `.eq("user_id", session.user.id)`; `bg-card` precisa de inline style com `hsl(var(--card))`.

**Commit convention:** `feat(app): [C-10] desc`.

> No detailed design-agent plan was captured in the session for this task. Regenerate the detailed plan before handing to a Track C session.

---

### C-11 — Dexter unificado (consolida /ai-coach + /analyst; redirects 301) [PENDING] [summary only]

**Objective:** Dexter unificado (consolida /ai-coach + /analyst; redirects 301)

**Ownership (from Track C init):**
```
  app/app/**
  components/{dashboard,journal,macro,ai,live,calendar,prop,reports}/**
  components/layout/AppSidebar.tsx
  components/layout/AppShell.tsx
  components/layout/AppHeader.tsx (pode remover)
  components/layout/AppMobileNav.tsx
  lib/entitlements.ts
  lib/dexter/** (novo)
  app/api/dexter/** (novo, consolidando /api/ai-coach + /api/analyst)
```

**Critical auth rules (CLAUDE.md):** NUNCA `supabase.auth.signOut()` (use manual localStorage cleanup); NUNCA `router.replace()` em auth (use `window.location.href`); NUNCA `.single()` (sempre `.maybeSingle()`); SEMPRE `.eq("user_id", session.user.id)`; `bg-card` precisa de inline style com `hsl(var(--card))`.

**Commit convention:** `feat(app): [C-11] desc`.

> No detailed design-agent plan was captured in the session for this task. Regenerate the detailed plan before handing to a Track C session.

---

### C-12 — MT5 Live como <UltraLock active> (economia de infra real) [PENDING] [summary only]

**Objective:** MT5 Live como <UltraLock active> (economia de infra real)

**Ownership (from Track C init):**
```
  app/app/**
  components/{dashboard,journal,macro,ai,live,calendar,prop,reports}/**
  components/layout/AppSidebar.tsx
  components/layout/AppShell.tsx
  components/layout/AppHeader.tsx (pode remover)
  components/layout/AppMobileNav.tsx
  lib/entitlements.ts
  lib/dexter/** (novo)
  app/api/dexter/** (novo, consolidando /api/ai-coach + /api/analyst)
```

**Critical auth rules (CLAUDE.md):** NUNCA `supabase.auth.signOut()` (use manual localStorage cleanup); NUNCA `router.replace()` em auth (use `window.location.href`); NUNCA `.single()` (sempre `.maybeSingle()`); SEMPRE `.eq("user_id", session.user.id)`; `bg-card` precisa de inline style com `hsl(var(--card))`.

**Commit convention:** `feat(app): [C-12] desc`.

> No detailed design-agent plan was captured in the session for this task. Regenerate the detailed plan before handing to a Track C session.

---

### C-13 — Prop firms dashboard por firma [PENDING] [summary only]

**Objective:** Prop firms dashboard por firma

**Ownership (from Track C init):**
```
  app/app/**
  components/{dashboard,journal,macro,ai,live,calendar,prop,reports}/**
  components/layout/AppSidebar.tsx
  components/layout/AppShell.tsx
  components/layout/AppHeader.tsx (pode remover)
  components/layout/AppMobileNav.tsx
  lib/entitlements.ts
  lib/dexter/** (novo)
  app/api/dexter/** (novo, consolidando /api/ai-coach + /api/analyst)
```

**Critical auth rules (CLAUDE.md):** NUNCA `supabase.auth.signOut()` (use manual localStorage cleanup); NUNCA `router.replace()` em auth (use `window.location.href`); NUNCA `.single()` (sempre `.maybeSingle()`); SEMPRE `.eq("user_id", session.user.id)`; `bg-card` precisa de inline style com `hsl(var(--card))`.

**Commit convention:** `feat(app): [C-13] desc`.

> No detailed design-agent plan was captured in the session for this task. Regenerate the detailed plan before handing to a Track C session.

---

### C-14 — Reports: export PDF com branding (viralização) [PENDING] [summary only]

**Objective:** Reports: export PDF com branding (viralização)

**Ownership (from Track C init):**
```
  app/app/**
  components/{dashboard,journal,macro,ai,live,calendar,prop,reports}/**
  components/layout/AppSidebar.tsx
  components/layout/AppShell.tsx
  components/layout/AppHeader.tsx (pode remover)
  components/layout/AppMobileNav.tsx
  lib/entitlements.ts
  lib/dexter/** (novo)
  app/api/dexter/** (novo, consolidando /api/ai-coach + /api/analyst)
```

**Critical auth rules (CLAUDE.md):** NUNCA `supabase.auth.signOut()` (use manual localStorage cleanup); NUNCA `router.replace()` em auth (use `window.location.href`); NUNCA `.single()` (sempre `.maybeSingle()`); SEMPRE `.eq("user_id", session.user.id)`; `bg-card` precisa de inline style com `hsl(var(--card))`.

**Commit convention:** `feat(app): [C-14] desc`.

> No detailed design-agent plan was captured in the session for this task. Regenerate the detailed plan before handing to a Track C session.

---

### C-15 — i18n integra app com next-intl (namespace app.*) [PENDING] [summary only]

**Objective:** i18n integra app com next-intl (namespace app.*)

**Ownership (from Track C init):**
```
  app/app/**
  components/{dashboard,journal,macro,ai,live,calendar,prop,reports}/**
  components/layout/AppSidebar.tsx
  components/layout/AppShell.tsx
  components/layout/AppHeader.tsx (pode remover)
  components/layout/AppMobileNav.tsx
  lib/entitlements.ts
  lib/dexter/** (novo)
  app/api/dexter/** (novo, consolidando /api/ai-coach + /api/analyst)
```

**Critical auth rules (CLAUDE.md):** NUNCA `supabase.auth.signOut()` (use manual localStorage cleanup); NUNCA `router.replace()` em auth (use `window.location.href`); NUNCA `.single()` (sempre `.maybeSingle()`); SEMPRE `.eq("user_id", session.user.id)`; `bg-card` precisa de inline style com `hsl(var(--card))`.

**Commit convention:** `feat(app): [C-15] desc`.

> No detailed design-agent plan was captured in the session for this task. Regenerate the detailed plan before handing to a Track C session.

---

### C-16 — QA smoke tests + PR + docs/CHANGES-C.md [PENDING] [summary only]

**Objective:** QA smoke tests + PR + docs/CHANGES-C.md

**Ownership (from Track C init):**
```
  app/app/**
  components/{dashboard,journal,macro,ai,live,calendar,prop,reports}/**
  components/layout/AppSidebar.tsx
  components/layout/AppShell.tsx
  components/layout/AppHeader.tsx (pode remover)
  components/layout/AppMobileNav.tsx
  lib/entitlements.ts
  lib/dexter/** (novo)
  app/api/dexter/** (novo, consolidando /api/ai-coach + /api/analyst)
```

**Critical auth rules (CLAUDE.md):** NUNCA `supabase.auth.signOut()` (use manual localStorage cleanup); NUNCA `router.replace()` em auth (use `window.location.href`); NUNCA `.single()` (sempre `.maybeSingle()`); SEMPRE `.eq("user_id", session.user.id)`; `bg-card` precisa de inline style com `hsl(var(--card))`.

**Commit convention:** `feat(app): [C-16] desc`.

> No detailed design-agent plan was captured in the session for this task. Regenerate the detailed plan before handing to a Track C session.

---

## Gaps / Unknowns

The design agent ran out of credits before emitting detailed implementation plans for most Track A and Track C tasks. Specifically:

**Track A — only summary available (needs detailed plan regeneration before dispatch):**
- A-02 through A-11 (10 tasks). Only the one-line objective from the init prompt is captured. The detailed A-01 plan (`msg#82`, ~18k chars) is the only full spec in the Track A session.

**Track C — only summary available (needs detailed plan regeneration before dispatch):**
- C-02 through C-16 (15 tasks). Only the one-line objective from the init prompt is captured. The detailed C-01 plan (`msg#185`, ~6k chars) is the only full spec in the Track C session.

**Track B — complete.**
- B-01 through B-15 all have detailed specs embedded in the design-agent's approved plan (`msg#280`, ~17k chars), including architecture decisions, per-task scope, cross-track coordination, and an end-to-end acceptance checklist.

**Known cross-cutting blocker (already resolved):**
- `msg#157` documented that all 3 sessions shared one `.git/HEAD`, causing commits to land on the wrong branch. Recovery was `git worktree add` per track. This is why the current working tree is `trading-dashboard-a` (Track A worktree).

**Dependencies to watch when picking up pending tasks:**
- Track B depends on Track A merging `Dexter`, `Logo`, `UltraBadge` brand components (see `docs/NEEDS-FROM-A.md` per B's plan). B is currently using stubs in `components/landing/_brand-stubs/`.
- Track C depends on Track B's `lib/analytics/events.ts` contract (C emits to it).
- Track C depends on Track A's `<Dexter/>`, `<UltraBadge/>`, `<UltraLock/>` components (imports via `@/components/brand`).
