"use client";

import type { CSSProperties } from "react";

import styles from "./Mascot.module.css";

export const MASCOT_POSES = [
  "default",
  "thinking",
  "alert",
  "celebrating",
  "sleeping",
  "analyzing",
  "offline",
] as const;

export type MascotPose = (typeof MASCOT_POSES)[number];

export interface MascotProps {
  pose?: MascotPose;
  size?: number;
  animated?: boolean;
  className?: string;
  alt?: string;
  title?: string;
}

const STYLE: CSSProperties = {
  imageRendering: "pixelated",
};

export function Mascot({
  pose = "default",
  size = 32,
  animated = false,
  className,
  alt,
  title,
}: MascotProps) {
  const classes = [styles.mascot, animated ? styles.animated : null, className]
    .filter(Boolean)
    .join(" ");
  // eslint-disable-next-line @next/next/no-img-element -- pixel-art SVG, next/image would add unwanted optimization pipeline
  return (
    <img
      src={`/dexter/${pose}.svg`}
      width={size}
      height={size}
      alt={alt ?? `Dexter ${pose}`}
      title={title}
      className={classes}
      style={STYLE}
      draggable={false}
      aria-hidden={alt === "" ? true : undefined}
    />
  );
}
