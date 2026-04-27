# email-engine/

Track B email orchestration. Sequences, schedulers, generators, integrations.

**Do NOT touch `email/`** at repo root — that is Track A (React Email templates).

## Tree

```
email-engine/
  integrations/resend.ts        wraps lib/email/send.ts, takes TemplateId + props
  sequences/                    multi-step user journeys (welcome, upgrade, churn, opt-in)
  generators/                   build template props from app data (briefing, recap)
  schedulers/queue.ts           DB-backed delayed sends (scheduled_emails)
  data/                         static seed data (principles, holidays)
  __mocks__/                    Track A swap-point — types + template factory
  lib/                          shared helpers (bias, consent, rate limit)
```

## Track A handoff

`__mocks__/types.ts` mirrors `email/types.ts` verbatim. When Track A merges:

1. Delete `email-engine/__mocks__/types.ts`
2. Replace `__mocks__/templates.ts` with a 10-line wrapper calling `@react-email/render`
3. Update imports across `email-engine/**` from `'../__mocks__/types'` → `'@/email/types'`

## Env vars

```
RESEND_API_KEY              already in .env.example
EMAIL_FROM                  default: wealth.Investing <briefing@owealthinvesting.com>
COMPANY_ADDRESS             physical address for CAN-SPAM/LGPD footer
RESEND_WEBHOOK_SECRET       Svix signing secret (Task 08)
CRON_SECRET                 reused for unsubscribe HMAC (lib/email/unsubscribe-token.ts)
```
