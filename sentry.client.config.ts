import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  sendDefaultPii: false,
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
          delete b.data.token;
          delete b.data.password;
          delete b.data.authorization;
          delete b.data.access_token;
          delete b.data.refresh_token;
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
      delete event.extra.token;
      delete event.extra.password;
      delete event.extra.authorization;
      delete event.extra.access_token;
      delete event.extra.refresh_token;
    }
    // Strip PII from request data
    if (event.request) {
      delete event.request.cookies;
      if (event.request.headers) {
        delete event.request.headers["authorization"];
        delete event.request.headers["cookie"];
      }
    }
    // Strip user email/ip if present
    if (event.user) {
      delete event.user.email;
      delete event.user.ip_address;
    }
    return event;
  },
});
