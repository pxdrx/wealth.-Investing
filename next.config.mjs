import { withSentryConfig } from "@sentry/nextjs";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Evita perda de formatação/CSS após mudanças: desativa cache do webpack no dev
  webpack: (config, { dev }) => {
    if (dev) config.cache = false;
    return config;
  },

  async redirects() {
    // C-06: unified /app/dexter replaces /ai-coach + /analyst.
    // 308 preserves method + query string. Legacy ?chat=<id> flows through.
    return [
      { source: "/ai-coach",            destination: "/app/dexter/coach",   permanent: true },
      { source: "/ai-coach/:path*",     destination: "/app/dexter/coach",   permanent: true },
      { source: "/app/ai-coach",        destination: "/app/dexter/coach",   permanent: true },
      { source: "/app/ai-coach/:path*", destination: "/app/dexter/coach",   permanent: true },
      { source: "/analyst",             destination: "/app/dexter/analyst", permanent: true },
      { source: "/analyst/:path*",      destination: "/app/dexter/analyst", permanent: true },
      { source: "/app/analyst",         destination: "/app/dexter/analyst", permanent: true },
      { source: "/app/analyst/:path*",  destination: "/app/dexter/analyst", permanent: true },
    ];
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "geolocation=(), microphone=(), camera=()" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.tradingview.com https://*.vercel-scripts.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https: blob:",
              "font-src 'self' data:",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.sentry.io https://api.anthropic.com https://*.vercel-scripts.com https://*.tradingview.com wss://*.tradingview.com",
              "frame-src https://*.tradingview.com https://js.stripe.com",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default withSentryConfig(withNextIntl(nextConfig), {
  silent: true,
  hideSourceMaps: true,
});
