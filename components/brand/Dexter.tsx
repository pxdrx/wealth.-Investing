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
  // eslint-disable-next-line @next/next/no-img-element -- pixel-art SVG, next/image would add unwanted optimization pipeline
  return (
    <img
      src={`/dexter/${mood}.svg`}
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
