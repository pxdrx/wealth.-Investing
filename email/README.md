# Email templates (Track A)

React Email + MJML template system for transactional emails.
Track A owns this folder. Track B (`email-engine/`) consumes templates from here.

## Structure

```
email/
  components/        # EmailShell, BriefingCard, CalendarRow, TradeRow, CTAButton, PullQuote
  templates/         # DailyBriefing, WeeklyRecap, Welcome, Upgrade
  tokens/            # colors, typography, spacing
  preview/           # *.preview.tsx — mock data per template
  __tests__/         # vitest snapshot tests
  dist/              # build output (gitignored)
  types.ts           # SHARED CONTRACT — Track A/B coordination required
```

## Commands

```bash
npm run email:dev     # react-email dev server on http://localhost:3001
npm run email:build   # render all templates → email/dist/{name}.html (+ .min.html)
npx vitest run email/__tests__   # snapshot tests
```

## Contract (types.ts)

Shared with Track B. **Do not change without coordination.**

```ts
import type {
  DailyBriefingProps,
  WeeklyRecapProps,
  WelcomeProps,
  UpgradeProps,
} from 'trading-dashboard/email/types';
```

All props include `unsubscribeUrl` and either `appUrl` or `pricingUrl`. Track B is responsible for resolving these URLs (signed unsubscribe tokens, deep links).

## How Track B imports

### Option A — render at send-time (recommended)

```ts
import { render } from '@react-email/render';
import { DailyBriefing } from 'trading-dashboard/email/templates';
import type { DailyBriefingProps } from 'trading-dashboard/email/types';

const props: DailyBriefingProps = await buildBriefingProps(userId, date);
const html = await render(<DailyBriefing {...props} />);
const text = await render(<DailyBriefing {...props} />, { plainText: true });

await provider.send({ to, html, text, subject: '...' });
```

### Option B — pre-built HTML with placeholders

Run `npm run email:build` in CI, ship `email/dist/*.html`, replace placeholders at send-time. Less flexible but cheaper.

## Tokens

Hex literals, no OKLCH/CSS vars (email clients don't support them).

| Token | Hex |
|-------|-----|
| paper | `#FAFAF7` |
| paper2 | `#F0EFEA` |
| ink | `#0A0F0D` |
| ink2 | `#1F2A24` |
| green | `#2DB469` |
| greenDeep | `#1F3A2E` |
| accent | `#E8A317` |
| danger | `#D85A5A` |
| line | `#E8E8E8` |

Fonts: Fraunces (serif) / Inter (sans) / JetBrains Mono (mono) — all with email-safe fallbacks.

## Templates

| Template | Tier-aware? | Notes |
|----------|-------------|-------|
| `DailyBriefing` | yes (free=2 events, pro=full, ultra=+`extraAnalysis`) | Plan-variant logic in template |
| `WeeklyRecap` | no | Equity curve `<Img src="">` — Track B injects signed URL |
| `Welcome` | no | Trial end date callout uses `trialEndsAt` |
| `Upgrade` | no | Coupon hero shown only when `couponCode` + `couponPctOff` present |

### Open template-only props (not in shared `types.ts`)

- `DailyBriefing` accepts optional `extraAnalysis?: string` for ultra tier. If Track B wants to send this, propose adding the field to `DailyBriefingProps` and we coordinate.

## Adding a new template

1. Add props interface to `types.ts` (coordinate with Track B).
2. Create `templates/Foo.tsx` using components from `components/`.
3. Add `preview/foo.preview.tsx` with mock data.
4. Re-export from `templates/index.ts`.
5. Add to `scripts/email-build.ts` TEMPLATES array.
6. Add a snapshot test to `__tests__/templates.test.tsx`.
7. Verify with `npm run email:dev`.

## CI

`.github/workflows/email.yml` runs on PRs touching `email/**`:
- `npm run email:build`
- `npx vitest run email/__tests__`
- Uploads `email/dist/` as artifact (14-day retention) for visual review.
