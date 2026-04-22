// Shared next-intl provider config.
// Applied in every NextIntlClientProvider mount so missing-key behavior stays
// consistent: swallow in production (fallback to `namespace.key`), log in dev.
export const providerConfig = {
  onError: (err: { code?: string; message?: string }) => {
    if (err.code === "MISSING_MESSAGE") {
      if (process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console
        console.warn("[i18n] missing key:", err.message ?? err);
      }
      return;
    }
    throw err;
  },
  getMessageFallback: ({ namespace, key }: { namespace?: string; key: string }) =>
    namespace ? `${namespace}.${key}` : key,
};
