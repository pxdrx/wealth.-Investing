"use client";

/**
 * Apple light premium background for /login:
 * - Base gray (#F5F5F7 / dark equivalent)
 * - Subtle static gradient (no animation)
 * - Very light static noise texture (SVG data-uri, low opacity, blend mode)
 * All static — no animated blur/filters. pointer-events: none on decorative layers.
 */

const NOISE_SVG = encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" result="n"/><feColorMatrix in="n" values="0 0 0 0 0.5 0 0 0 0 0.5 0 0 0 0 0.5 0 0 0 0 1"/></feColorMatrix></filter><rect width="100%" height="100%" filter="url(#n)"/></svg>`
);
const NOISE_DATA_URI = `data:image/svg+xml,${NOISE_SVG}`;

export function LoginBackground({ className = "" }: { className?: string }) {
  return (
    <div
      className={`absolute inset-0 overflow-hidden ${className}`}
      aria-hidden
    >
      {/* 1) Base — Apple gray light / dark (theme in dark mode) */}
      <div className="absolute inset-0 bg-[#F5F5F7] dark:bg-background" />

      {/* 2) Sutil gradiente neutro — profundidade sem cor saturada */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.4] dark:opacity-[0.2]"
        style={{
          background:
            "radial-gradient(ellipse 100% 80% at 30% 20%, rgba(0,0,0,0.02), transparent 50%), radial-gradient(ellipse 80% 100% at 75% 70%, rgba(0,0,0,0.015), transparent 45%)",
        }}
      />

      {/* 3) Noise texture — static, very low opacity, soft blend */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.045] dark:opacity-[0.025]"
        style={{
          backgroundImage: `url("${NOISE_DATA_URI}")`,
          backgroundRepeat: "repeat",
          mixBlendMode: "overlay",
        }}
      />
    </div>
  );
}
