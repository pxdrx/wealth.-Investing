# Needs from Track A

Historical coordination doc. Tracked artifacts Track B expected from Track A.

## Resolution (2026-04-21)

Superseded — Track A shipped `Dexter` as the mascot abstraction instead of
`Mascot`. Current Track A barrel exports: `BrandMark`, `Dexter` +
`DEXTER_MOODS`, `UltraBadge`, `UltraLock`, `ThemeToggle`.

- `components/brand/Mascot.tsx` — **not delivered, not needed.** Track A's
  `Dexter` fulfils the mascot role.
- No barrel line to restore. Track A's `components/brand/index.ts` will
  replace B's stub at merge (A owns that file).
- Track B uses local `components/landing/_brand-stubs/` for landing visuals
  — no `Mascot` imports exist in B code.

No action required before merging PR #1.
