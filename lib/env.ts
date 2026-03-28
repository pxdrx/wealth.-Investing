/**
 * Runtime environment variable validation.
 * Use in API routes to fail fast with clear error messages
 * instead of silent undefined behavior from `process.env.X!`.
 */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}
