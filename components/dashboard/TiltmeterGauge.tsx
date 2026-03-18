"use client";

import { motion } from "framer-motion";
import type { TiltmeterResult } from "@/lib/psychology-tags";

interface TiltmeterGaugeProps {
  result: TiltmeterResult;
  size?: "sm" | "md";
}

const SIZES = {
  sm: { width: 120, height: 70, strokeWidth: 8, fontSize: 14, labelSize: 10 },
  md: { width: 180, height: 100, strokeWidth: 10, fontSize: 20, labelSize: 12 },
};

const ZONE_COLORS = {
  red: { arc: "#ef4444", text: "text-red-500" },
  yellow: { arc: "#eab308", text: "text-yellow-500" },
  green: { arc: "#22c55e", text: "text-emerald-500" },
};

export function TiltmeterGauge({ result, size = "md" }: TiltmeterGaugeProps) {
  const s = SIZES[size];
  const cx = s.width / 2;
  const cy = s.height - 4;
  const radius = Math.min(cx, cy) - s.strokeWidth;

  // Score is -1 to 1. Map to angle: -1 = 180deg (left), 0 = 90deg (top), 1 = 0deg (right)
  // In SVG arc terms: start angle = PI (180), end angle = 0 (0)
  // Needle angle: score maps from PI (left, -1) to 0 (right, +1)
  const needleAngle = Math.PI * (1 - (result.score + 1) / 2);

  const needleX = cx + radius * 0.85 * Math.cos(needleAngle);
  const needleY = cy - radius * 0.85 * Math.sin(needleAngle);

  // Arc path for the semi-circle background
  const arcStartX = cx - radius;
  const arcEndX = cx + radius;

  const zoneColor = ZONE_COLORS[result.zone];

  // Three colored segments for red/yellow/green zones
  // Red: PI to 2*PI/3 (left third), Yellow: 2*PI/3 to PI/3 (middle), Green: PI/3 to 0 (right third)
  function arcSegment(startFrac: number, endFrac: number, color: string) {
    const a1 = Math.PI * (1 - startFrac);
    const a2 = Math.PI * (1 - endFrac);
    const x1 = cx + radius * Math.cos(a1);
    const y1 = cy - radius * Math.sin(a1);
    const x2 = cx + radius * Math.cos(a2);
    const y2 = cy - radius * Math.sin(a2);
    const largeArc = Math.abs(endFrac - startFrac) > 0.5 ? 1 : 0;
    return (
      <path
        key={`${startFrac}-${endFrac}`}
        d={`M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`}
        fill="none"
        stroke={color}
        strokeWidth={s.strokeWidth}
        strokeLinecap="round"
        opacity={0.25}
      />
    );
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={s.width} height={s.height} viewBox={`0 0 ${s.width} ${s.height}`}>
        {/* Background arc segments */}
        {arcSegment(0, 0.35, "#ef4444")}
        {arcSegment(0.35, 0.65, "#eab308")}
        {arcSegment(0.65, 1, "#22c55e")}

        {/* Active arc highlight */}
        <path
          d={`M ${arcStartX} ${cy} A ${radius} ${radius} 0 0 1 ${arcEndX} ${cy}`}
          fill="none"
          stroke="transparent"
          strokeWidth={s.strokeWidth}
        />

        {/* Needle */}
        <motion.line
          x1={cx}
          y1={cy}
          initial={{ x2: cx, y2: cy - radius * 0.85 }}
          animate={{ x2: needleX, y2: needleY }}
          transition={{ type: "spring", stiffness: 60, damping: 15 }}
          stroke={zoneColor.arc}
          strokeWidth={2.5}
          strokeLinecap="round"
        />

        {/* Center dot */}
        <circle cx={cx} cy={cy} r={3} fill={zoneColor.arc} />

        {/* Score text */}
        <text
          x={cx}
          y={cy - radius * 0.3}
          textAnchor="middle"
          className="fill-foreground"
          fontSize={s.fontSize}
          fontWeight={600}
        >
          {result.score > 0 ? "+" : ""}
          {result.score.toFixed(2)}
        </text>
      </svg>
      <span className={`text-[${s.labelSize}px] font-medium ${zoneColor.text}`}>
        {result.label}
      </span>
    </div>
  );
}
