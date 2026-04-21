// Local analytics emitter. Track B owns the canonical event taxonomy in
// lib/analytics/events.ts — until that ships, callsites emit through this
// wrapper so we can rewire it without touching every consumer.
//
// Contract: callers pass a string event name plus an optional payload.
// Once Track B lands the typed union, replace the body below to delegate
// to their `track()` helper while keeping this file's exported signature
// stable for Track C callsites.

export type EmitPayload = Record<string, unknown>;

export function emit(event: string, payload?: EmitPayload): void {
  if (process.env.NODE_ENV !== "production") {
    // Dev-only visibility: surfaces nav clicks and upgrade CTAs without
    // requiring a real analytics backend.
    // eslint-disable-next-line no-console
    console.debug("[emit]", event, payload ?? {});
  }
}
