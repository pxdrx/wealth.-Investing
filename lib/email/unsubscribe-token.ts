import crypto from "node:crypto";

// HMAC-signed token so an unsubscribe link can be honored without a session.
// Reuses CRON_SECRET as the HMAC key — already guaranteed present on server
// and rotating it invalidates all in-flight links, which is the desired behavior.

function getSecret(): string {
  const s = process.env.CRON_SECRET;
  if (!s) throw new Error("CRON_SECRET is required for unsubscribe tokens");
  return s;
}

function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): Buffer {
  const pad = s.length % 4 === 2 ? "==" : s.length % 4 === 3 ? "=" : "";
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

export function signUnsubscribeToken(email: string): string {
  const payload = b64url(Buffer.from(email.toLowerCase(), "utf8"));
  const mac = b64url(
    crypto.createHmac("sha256", getSecret()).update(payload).digest(),
  );
  return `${payload}.${mac}`;
}

export function verifyUnsubscribeToken(token: string): string | null {
  if (!token || !token.includes(".")) return null;
  const [payload, mac] = token.split(".");
  if (!payload || !mac) return null;
  const expected = crypto
    .createHmac("sha256", getSecret())
    .update(payload)
    .digest();
  let provided: Buffer;
  try {
    provided = b64urlDecode(mac);
  } catch {
    return null;
  }
  if (provided.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(provided, expected)) return null;
  try {
    return b64urlDecode(payload).toString("utf8");
  } catch {
    return null;
  }
}

export function buildUnsubscribeUrl(email: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://owealthinvesting.com";
  return `${base}/api/unsubscribe?token=${signUnsubscribeToken(email)}`;
}
