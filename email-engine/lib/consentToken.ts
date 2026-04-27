// Channel-scoped consent token. Reuses CRON_SECRET as HMAC key — same
// pattern as lib/email/unsubscribe-token.ts. Signs (email, channel)
// together so a token confirms only the channel it was issued for.

import crypto from "node:crypto";

function getSecret(): string {
  const s = process.env.CRON_SECRET;
  if (!s) throw new Error("CRON_SECRET is required for consent tokens");
  return s;
}

function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): Buffer {
  const pad = s.length % 4 === 2 ? "==" : s.length % 4 === 3 ? "=" : "";
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

export interface ConsentTokenPayload {
  email: string;
  channel: string;
  iat: number;
}

const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function signConsentToken(email: string, channel: string): string {
  const payload: ConsentTokenPayload = {
    email: email.toLowerCase(),
    channel,
    iat: Date.now(),
  };
  const json = JSON.stringify(payload);
  const body = b64url(Buffer.from(json, "utf8"));
  const mac = b64url(
    crypto.createHmac("sha256", getSecret()).update(body).digest(),
  );
  return `${body}.${mac}`;
}

export function verifyConsentToken(token: string): ConsentTokenPayload | null {
  if (!token || !token.includes(".")) return null;
  const [body, mac] = token.split(".");
  if (!body || !mac) return null;
  const expected = crypto.createHmac("sha256", getSecret()).update(body).digest();
  let provided: Buffer;
  try {
    provided = b64urlDecode(mac);
  } catch {
    return null;
  }
  if (provided.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(provided, expected)) return null;
  try {
    const payload = JSON.parse(b64urlDecode(body).toString("utf8")) as ConsentTokenPayload;
    if (typeof payload.email !== "string" || typeof payload.channel !== "string") {
      return null;
    }
    if (typeof payload.iat !== "number" || Date.now() - payload.iat > TOKEN_TTL_MS) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function buildConsentConfirmUrl(email: string, channel: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://owealthinvesting.com";
  const token = signConsentToken(email, channel);
  return `${base}/api/email/consent/confirm?token=${token}`;
}
