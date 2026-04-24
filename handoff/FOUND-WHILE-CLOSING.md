# Found While Closing

Bugs / inconsistencies discovered during the closeout sprint that are **out of scope**. Do not fix here. Log and move on.

| Date | Finder commit | File | Description | Severity |
|---|---|---|---|---|
| 2026-04-23 | pre-sprint | `lib/xlsx-adaptive-bridge.ts` (staged A), `lib/csv-adaptive-parser.ts` (modified), `package.json` + `package-lock.json` (modified), `scripts/debug-ninja-import.ts`, `scripts/debug-pdf-import.mjs`, `scripts/debug-pdf-position-history.mjs`, `lib/pdf-position-history-parser.ts`, `lib/i18n/IntlClientShell.tsx`, modified `app/api/journal/import-mt5/route.ts`, modified `components/journal/ImportDropZone.tsx` | Orphan uncommitted work from prior session (NinjaTrader + PDF position-history import pipeline). Not closeout scope. Left in working tree; do not touch. | Info |
| 2026-04-24 | pre-sprint | `lib/xlsx-adaptive-bridge.ts` disappeared during the reset/restore cycle — only a `.crlf-bak` sibling remained. Restored via `mv *.crlf-bak *.ts` so build would pass. The file is still untracked. Likely cause: git autocrlf backup layer triggered by earlier `git restore --staged`. | Process note | Info |
| 2026-04-23 | hook-cascade | `.git/hooks/pre-commit` runs `code-review-graph detect-changes --brief` which auto-stages any modified/untracked files before each commit. Caused 2 contaminated commits on D1 (C2: `81c072e4`, E5: `0a5af7df`) — both soft-reset and recommitted. **Mitigation adopted: every commit from D1-03 onward uses `git commit -m "..." -- <pathspec>` to lock commit scope irrespective of index state.** | Workaround | Medium |
