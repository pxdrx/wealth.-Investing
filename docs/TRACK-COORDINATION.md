# TRACK-COORDINATION

> Read this before you touch anything. Each track owns a disjoint set of paths.
> Cross-track changes require a PR review from the other track's owner.

## Tracks

| Track | Branch                 | Focus                                 |
|-------|------------------------|---------------------------------------|
| A     | `feat/track-a-brand`   | Brand system, tokens, voice, mascot   |
| B     | `feat/track-b-landing` | Landing page, i18n, analytics         |
| C     | `feat/track-c-app`     | `/app/**` area, entitlements, billing |

## Ownership matrix

| Path                              | Owner | Readers            | Notes |
|-----------------------------------|-------|--------------------|-------|
| `lib/brand/**`                    | A     | B, C               | Voice, tokens helpers |
| `components/brand/**`             | A     | B, C               | Components live here |
| `components/brand/index.ts`       | A     | B, C               | Re-exports BrandMark, Dexter |
| `docs/TOKEN-MIGRATION.md`         | A     | —                  | Migration log |
| `tailwind.config.ts`              | A     | coord. w/ B, C     | Changes require ping |
| `app/globals.css`                 | A     | coord. w/ B, C     | Changes require ping |
| `app/page.tsx`                    | B     | —                  | Landing root |
| `app/(home)/**` / landing routes  | B     | —                  | Landing tree |
| `components/landing/**`           | B     | —                  | Landing-only components |
| `lib/analytics/events.ts`         | B     | A, C (emitters)    | Event taxonomy |
| `i18n.ts`, `messages/**`          | B     | A, C               | Copy source of truth |
| `app/app/**`                      | C     | —                  | Authenticated area |
| `lib/entitlements.ts`             | C     | A, B (importers)   | Reuse Plan from `lib/subscription.ts` |
| `components/billing/**`           | C     | —                  | Paywall, pricing |
| `components/auth/**`              | C     | —                  | AuthGate territory |
| `lib/subscription.ts`             | C     | —                  | Existing; Plan type lives here |

## Contract files (already stubbed on `main`)

These exist as empty-with-TODO and are imported by multiple tracks. Keep the
import path stable; add exports incrementally. Breaking changes to the exported
API require a ping before merge.

- `lib/entitlements.ts` — Track C writes, A and B import
- `lib/analytics/events.ts` — Track B writes, A and C emit
- `lib/brand/voice.ts` — Track A writes, B and C consume
- `components/brand/index.ts` — Track A writes, B and C import

## Merge order (suggested)

1. Track A merges first (tokens + voice are foundational)
2. Track B rebases on A, merges second
3. Track C rebases on A+B, merges last

## Shared files — DO NOT edit without coordination

- `CLAUDE.md`, `BRAND.md`
- `package.json` / `package-lock.json` (coordinate deps)
- `next.config.mjs`
- `middleware.ts`
- `tsconfig.json`
- `.env*`

## i18n note

`next-intl` is installed but not wired into `app/**`. Track B integrates it
during their work. Until then, treat `app/**` copy as pt-BR hardcoded
(current state).

## Changelog

- **2026-04-20 — A-03: design tokens consolidated.** `tailwind.config.ts`
  rewritten (semantic tokens with `/<alpha-value>`, new `neutral/green/red/amber`
  scales, `display` font → Manrope, `fontSize` scale with paired line-heights,
  new `--radius` system + legacy `--radius-card/modal/input` preserved).
  `app/globals.css` re-skinned: Lumina Slate → Terminal (emerald primary
  `152 60% 30%`, amber accent `44 100% 47%`). All `--landing-*` vars and
  `l-*` Tailwind classes removed. PNL tokens untouched. Migration table
  in `docs/TOKEN-MIGRATION.md`. **Action for B/C after pulling:** run
  `npm install && npm run build` in your worktree, smoke-test both modes.
