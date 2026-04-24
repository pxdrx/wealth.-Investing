"use client";

import type { CSSProperties } from "react";

import styles from "./Dexter.module.css";

// 7 moods, each with its own SVG in public/dexter/.
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

type CanonicalPose = DexterMood;

const MOOD_TO_POSE: Record<DexterMood, CanonicalPose> = {
  default: "default",
  thinking: "thinking",
  alert: "alert",
  celebrating: "celebrating",
  sleeping: "sleeping",
  analyzing: "analyzing",
  offline: "offline",
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
  const pose = MOOD_TO_POSE[mood] ?? "default";
  // eslint-disable-next-line @next/next/no-img-element -- pixel-art SVG, next/image would add unwanted optimization pipeline
  return (
    <img
      src={`/dexter/${pose}.svg`}
      width={size}
      height={size}
      alt={alt ?? `Dexter ${mood}`}
      title={title}
      className={classes}
      style={STYLE}
      draggable={false}
      aria-hidden={alt === "" ? true : undefined}
    />
  );
}
