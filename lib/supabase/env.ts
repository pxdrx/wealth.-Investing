/**
 * Central Supabase env validation. Used by client and server.
 * Never creates a client with invalid or missing env; throws a traceable error.
 */

const URL_ENV = "NEXT_PUBLIC_SUPABASE_URL";
const ANON_KEY_ENV = "NEXT_PUBLIC_SUPABASE_ANON_KEY";

const MIN_ANON_KEY_LENGTH = 20;
const SUPABASE_URL_PREFIX = "https://";

export class SupabaseConfigError extends Error {
  readonly code = "SUPABASE_CONFIG_ERROR" as const;

  constructor(message: string) {
    super(message);
    this.name = "SupabaseConfigError";
    Object.setPrototypeOf(this, SupabaseConfigError.prototype);
  }
}

function isDev(): boolean {
  return process.env.NODE_ENV === "development";
}

function logDevError(message: string, detail?: string): void {
  if (typeof window !== "undefined") {
    console.error(
      `[Supabase] ${message}`,
      detail ? `\n  → ${detail}` : ""
    );
  } else if (isDev()) {
    console.error(
      `[Supabase] ${message}`,
      detail ? `\n  → ${detail}` : ""
    );
  }
}

function validateUrl(url: string | undefined): url is string {
  if (url === undefined || url === null || typeof url !== "string") return false;
  const trimmed = url.trim();
  if (trimmed.length === 0) return false;
  try {
    const u = new URL(trimmed);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    return true;
  } catch {
    return false;
  }
}

function validateAnonKey(key: string | undefined): key is string {
  if (key === undefined || key === null || typeof key !== "string") return false;
  const trimmed = key.trim();
  return trimmed.length >= MIN_ANON_KEY_LENGTH;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

/**
 * Returns validated Supabase URL and anon key. Throws SupabaseConfigError if
 * env is missing or invalid. In dev, logs a clear message before throwing.
 * Never exposes sensitive values in messages.
 */
export function getSupabaseConfig(): SupabaseConfig {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!validateUrl(url)) {
    const urlStr = typeof url === "string" ? url : "";
    const detail = !urlStr.trim()
      ? `${URL_ENV} is missing. Add it to .env.local (e.g. ${URL_ENV}=https://xxx.supabase.co).`
      : `${URL_ENV} must be a valid https (or http) URL.`;
    logDevError("Invalid or missing Supabase URL.", detail);
    throw new SupabaseConfigError(
      `Supabase URL is missing or invalid. Check ${URL_ENV} in your environment.`
    );
  }

  if (!validateAnonKey(anonKey)) {
    const keyStr = typeof anonKey === "string" ? anonKey : "";
    const detail = !keyStr.trim()
      ? `${ANON_KEY_ENV} is missing. Add it to .env.local from your Supabase project settings.`
      : `${ANON_KEY_ENV} must be a non-empty key (min length ${MIN_ANON_KEY_LENGTH}).`;
    logDevError("Invalid or missing Supabase anon key.", detail);
    throw new SupabaseConfigError(
      `Supabase anon key is missing or invalid. Check ${ANON_KEY_ENV} in your environment.`
    );
  }

  if (isDev() && typeof window !== "undefined") {
    console.debug("[Supabase] config ok", { urlPrefix: url!.trim().slice(0, 28) + "..." });
  }

  return {
    url: url!.trim(),
    anonKey: anonKey!.trim(),
  };
}
