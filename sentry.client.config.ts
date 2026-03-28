import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1.0,
  environment: process.env.NODE_ENV,
  beforeSend(event) {
    // Strip potential financial/PII data from breadcrumbs
    if (event.breadcrumbs) {
      event.breadcrumbs = event.breadcrumbs.map((b) => {
        if (b.data) {
          delete b.data.pnl;
          delete b.data.balance;
          delete b.data.amount;
          delete b.data.email;
          delete b.data.net_pnl_usd;
          delete b.data.starting_balance_usd;
        }
        return b;
      });
    }
    // Strip PII from extra context
    if (event.extra) {
      delete event.extra.pnl;
      delete event.extra.balance;
      delete event.extra.amount;
      delete event.extra.email;
    }
    return event;
  },
});
