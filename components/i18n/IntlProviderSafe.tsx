"use client";

import type { ReactNode } from "react";
import type { AbstractIntlMessages } from "next-intl";
import { NextIntlClientProvider } from "next-intl";

interface IntlProviderSafeProps {
  locale: string;
  messages: AbstractIntlMessages;
  children: ReactNode;
}

// Wraps NextIntlClientProvider with onError/getMessageFallback so that a
// single missing translation key never crashes the React tree. Required after
// the sitewide crash documented in commit ebee4ec: drift between pt.json and
// en.json would throw MISSING_MESSAGE and take down the whole app. Keep the
// handlers defined here (client module) — passing them as props from a server
// layout serializes a function and fails.
export function IntlProviderSafe({ locale, messages, children }: IntlProviderSafeProps) {
  return (
    <NextIntlClientProvider
      locale={locale}
      messages={messages}
      onError={(err) => {
        if (err.code === "MISSING_MESSAGE") {
          if (process.env.NODE_ENV !== "production") {
            // eslint-disable-next-line no-console
            console.warn("[i18n] missing key:", err.message);
          }
          return;
        }
        if (process.env.NODE_ENV !== "production") {
          // eslint-disable-next-line no-console
          console.error("[i18n]", err);
        }
      }}
      getMessageFallback={({ namespace, key }) =>
        namespace ? `${namespace}.${key}` : key
      }
    >
      {children}
    </NextIntlClientProvider>
  );
}
