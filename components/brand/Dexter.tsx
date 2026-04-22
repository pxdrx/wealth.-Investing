"use client";

import type { CSSProperties } from "react";

import styles from "./Dexter.module.css";

export const DEXTER_MOODS = [
  "default",
  "thinking",
  "alert",
  "celebrating",
  "sleeping",
  "analyzing",
  "offline",
] as const;

export type DexterMood = (typeof DEXTER_MOODS)[number];

export interface DexterProps {
  mood?: DexterMood;
  size?: number;
  animated?: boolean;
  className?: string;
  alt?: string;
  title?: string;
}

// Ticker mascot viewBox is 40x34 (full body with head + blob + 4 pseudopods).
const MASCOT_W = 40;
const MASCOT_H = 34;
const ASPECT = MASCOT_W / MASCOT_H;

// Map Dexter moods to Ticker pose assets so the full-body mascot renders
// instead of the legacy 16x16 head-only sprite.
const MOOD_TO_POSE: Record<DexterMood, string> = {
  default: "stand",
  thinking: "focus",
  alert: "blink",
  celebrating: "cheer",
  sleeping: "sleep",
  analyzing: "loading",
  offline: "wink",
};

const STYLE: CSSProperties = {
  imageRendering: "pixelated",
};

export function Dexter({
  mood = "default",
  size = 32,
  animated = false,
  className,
  alt,
  title,
}: DexterProps) {
  const classes = [styles.dexter, animated ? styles.animated : null, className]
    .filter(Boolean)
    .join(" ");
  const pose = MOOD_TO_POSE[mood] ?? "stand";
  // Preserve the caller's intent: use `size` as the height budget so the
  // mascot's taller body keeps its proportions without stretching.
  const height = size;
  const width = Math.round(height * ASPECT);
  // eslint-disable-next-line @next/next/no-img-element -- pixel-art SVG, next/image would add unwanted optimization pipeline
  return (
    <img
      src={`/brand/mascot/ticker-${pose}.svg`}
      width={width}
      height={height}
      alt={alt ?? `Dexter ${mood}`}
      title={title}
      className={classes}
      style={STYLE}
      draggable={false}
      aria-hidden={alt === "" ? true : undefined}
    />
  );
}
