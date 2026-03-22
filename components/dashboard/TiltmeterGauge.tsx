"use client";

import { motion } from "framer-motion";
import type { TiltmeterResult } from "@/lib/psychology-tags";

interface TiltmeterGaugeProps {
  result: TiltmeterResult;
  size?: "sm" | "md";
}

const SIZES = {
  sm: { width: 140, height: 85, strokeWidth: 10, fontSize: 16, labelSize: 9 },
  md: { width: 200, height: 115, strokeWidth: 12, fontSize: 22, labelSize: 11 },
};

const ZONE_CONFIG = {
  red: { color: "#ef4444", label: "Em Tilt", textClass: "text-red-500" },
  yellow: { color: "#f59e0b", label: "Alerta", textClass: "text-amber-500" },
  green: { color: "#22c55e", label: "Focado", textClass: "text-emerald-500" },
};

export function TiltmeterGauge({ result, size = "md" }: TiltmeterGaugeProps) {
  const s = SIZES[size];
  const cx = s.width / 2;
  const cy = s.height - 8;
  const radius = Math.min(cx, cy) - s.strokeWidth - 2;
  const innerRadius = radius - s.strokeWidth;

  // Score is -1 to 1. Map to angle: -1 = PI (left), +1 = 0 (right)
  const needleAngle = Math.PI * (1 - (result.score + 1) / 2);
  const needleLen = radius * 0.72;
  const needleX = cx + needleLen * Math.cos(needleAngle);
  const needleY = cy - needleLen * Math.sin(needleAngle);

  const zone = ZONE_CONFIG[result.zone];

  // Gradient arc with smooth color transition using multiple segments
  const arcSegments = 60;
  const segmentPaths: { d: string; color: string }[] = [];

  for (let i = 0; i < arcSegments; i++) {
    const frac1 = i / arcSegments;
    const frac2 = (i + 1) / arcSegments;
    const a1 = Math.PI * (1 - frac1);
    const a2 = Math.PI * (1 - frac2);
    const x1 = cx + radius * Math.cos(a1);
    const y1 = cy - radius * Math.sin(a1);
    const x2 = cx + radius * Math.cos(a2);
    const y2 = cy - radius * Math.sin(a2);

    // Color interpolation: red (0-0.3) -> yellow (0.3-0.6) -> green (0.6-1.0)
    let r: number, g: number, b: number;
    if (frac1 < 0.35) {
      const t = frac1 / 0.35;
      r = 239 + (245 - 239) * t;
      g = 68 + (158 - 68) * t;
      b = 68 + (11 - 68) * t;
    } else if (frac1 < 0.65) {
      const t = (frac1 - 0.35) / 0.3;
      r = 245 + (34 - 245) * t;
      g = 158 + (197 - 158) * t;
      b = 11 + (94 - 11) * t;
    } else {
      r = 34;
      g = 197;
      b = 94;
    }

    segmentPaths.push({
      d: `M ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2}`,
      color: `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`,
    });
  }

  // Zone label positions along the arc
  const zoneLabels = [
    { label: "Em Tilt", frac: 0.12, color: "rgb(239, 68, 68)" },
    { label: "Alerta", frac: 0.42, color: "rgb(245, 158, 11)" },
    { label: "Neutro", frac: 0.5, color: "rgb(156, 163, 175)" },
    { label: "Focado", frac: 0.85, color: "rgb(34, 197, 94)" },
  ];

  return (
    <div className="flex flex-col items-center gap-0.5">
      <svg
        width={s.width}
        height={s.height}
        viewBox={`0 0 ${s.width} ${s.height}`}
      >
        {/* Subtle background track */}
        <path
          d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={s.strokeWidth + 2}
          strokeLinecap="round"
          className="text-muted/20"
          opacity={0.15}
        />

        {/* Gradient arc segments */}
        {segmentPaths.map((seg, i) => (
          <path
            key={i}
            d={seg.d}
            fill="none"
            stroke={seg.color}
            strokeWidth={s.strokeWidth}
            strokeLinecap="butt"
            opacity={0.6}
          />
        ))}

        {/* Active highlight arc up to needle position */}
        {(() => {
          const scoreFrac = (result.score + 1) / 2;
          const highlightEnd = Math.PI * (1 - scoreFrac);
          const hx = cx + radius * Math.cos(highlightEnd);
          const hy = cy - radius * Math.sin(highlightEnd);
          const largeArc = scoreFrac > 0.5 ? 1 : 0;
          return (
            <path
              d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 ${largeArc} 1 ${hx} ${hy}`}
              fill="none"
              stroke={zone.color}
              strokeWidth={s.strokeWidth}
              strokeLinecap="round"
              opacity={0.9}
            />
          );
        })()}

        {/* Needle with drop shadow */}
        <motion.line
          x1={cx}
          y1={cy}
          initial={{ x2: cx, y2: cy - needleLen }}
          animate={{ x2: needleX, y2: needleY }}
          transition={{ type: "spring", stiffness: 50, damping: 12 }}
          stroke={zone.color}
          strokeWidth={2}
          strokeLinecap="round"
          filter="drop-shadow(0 1px 2px rgba(0,0,0,0.15))"
        />

        {/* Center dot */}
        <circle cx={cx} cy={cy} r={4} fill={zone.color} />
        <circle cx={cx} cy={cy} r={2} fill="white" opacity={0.6} />

        {/* Score text */}
        <text
          x={cx}
          y={cy - radius * 0.35}
          textAnchor="middle"
          className="fill-foreground"
          fontSize={s.fontSize}
          fontWeight={700}
          letterSpacing="-0.02em"
        >
          {result.score > 0 ? "+" : ""}
          {result.score.toFixed(2)}
        </text>

        {/* Zone labels along bottom of arc */}
        {size === "md" && (
          <>
            <text
              x={cx - radius + 4}
              y={cy + s.labelSize + 4}
              textAnchor="start"
              fontSize={s.labelSize - 2}
              fill="rgb(239, 68, 68)"
              opacity={0.7}
              fontWeight={500}
            >
              Tilt
            </text>
            <text
              x={cx}
              y={cy + s.labelSize + 4}
              textAnchor="middle"
              fontSize={s.labelSize - 2}
              fill="rgb(156, 163, 175)"
              opacity={0.7}
              fontWeight={500}
            >
              Neutro
            </text>
            <text
              x={cx + radius - 4}
              y={cy + s.labelSize + 4}
              textAnchor="end"
              fontSize={s.labelSize - 2}
              fill="rgb(34, 197, 94)"
              opacity={0.7}
              fontWeight={500}
            >
              Focado
            </text>
          </>
        )}
      </svg>
      <span
        className={`text-[${s.labelSize + 1}px] font-semibold ${zone.textClass}`}
      >
        {zone.label}
      </span>
    </div>
  );
}
