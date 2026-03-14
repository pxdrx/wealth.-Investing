"use client";

import { useEffect, useRef } from "react";

type Point = {
  x: number;
  y: number;
};

interface WaveConfig {
  offset: number;
  amplitude: number;
  frequency: number;
  color: string;
  opacity: number;
}

export function GlowyWavesBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef<Point>({ x: 0, y: 0 });
  const targetMouseRef = useRef<Point>({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return undefined;

    let animationId: number;
    let time = 0;
    let lastFrameTime = 0;
    const TARGET_FPS = 24;
    const FRAME_INTERVAL = 1000 / TARGET_FPS;

    const computeThemeColors = () => {
      const rootStyles = getComputedStyle(document.documentElement);

      const resolveColor = (variables: string[], alpha = 1): string => {
        for (const variable of variables) {
          const value = rootStyles.getPropertyValue(variable).trim();
          if (value) {
            return alpha < 1 ? `hsl(${value} / ${alpha})` : `hsl(${value})`;
          }
        }
        return `rgba(255, 255, 255, ${alpha})`;
      };

      return {
        backgroundTop: resolveColor(["--background"], 1),
        backgroundBottom: resolveColor(["--muted", "--background"], 0.95),
        wavePalette: [
          {
            offset: 0,
            amplitude: 45,
            frequency: 0.002,
            color: resolveColor(["--primary"], 0.5),
            opacity: 0.25,
          },
          {
            offset: Math.PI / 2,
            amplitude: 55,
            frequency: 0.0018,
            color: resolveColor(["--accent", "--primary"], 0.4),
            opacity: 0.2,
          },
          {
            offset: Math.PI,
            amplitude: 35,
            frequency: 0.0024,
            color: resolveColor(["--secondary", "--foreground"], 0.35),
            opacity: 0.15,
          },
          {
            offset: Math.PI * 1.5,
            amplitude: 50,
            frequency: 0.0015,
            color: resolveColor(["--primary-foreground", "--foreground"], 0.15),
            opacity: 0.12,
          },
        ] satisfies WaveConfig[],
      };
    };

    let themeColors = computeThemeColors();

    const handleThemeMutation = () => {
      themeColors = computeThemeColors();
    };

    const observer = new MutationObserver(handleThemeMutation);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme"],
    });

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const mouseInfluence = prefersReducedMotion ? 10 : 50;
    const influenceRadius = prefersReducedMotion ? 160 : 280;
    const smoothing = prefersReducedMotion ? 0.04 : 0.08;
    const STEP = 8; // pixels between points for better perf

    const resizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio, 1.5);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.scale(dpr, dpr);
    };

    const recenterMouse = () => {
      const centerPoint = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      mouseRef.current = centerPoint;
      targetMouseRef.current = centerPoint;
    };

    const handleResize = () => {
      resizeCanvas();
      recenterMouse();
    };

    const handleMouseMove = (event: MouseEvent) => {
      targetMouseRef.current = { x: event.clientX, y: event.clientY };
    };

    const handleMouseLeave = () => {
      recenterMouse();
    };

    resizeCanvas();
    recenterMouse();

    window.addEventListener("resize", handleResize);
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("mouseleave", handleMouseLeave);

    const W = () => window.innerWidth;
    const H = () => window.innerHeight;

    const drawWave = (wave: WaveConfig) => {
      const w = W();
      const h = H();
      ctx.save();
      ctx.beginPath();

      for (let x = 0; x <= w; x += STEP) {
        const dx = x - mouseRef.current.x;
        const dy = h / 2 - mouseRef.current.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const influence = Math.max(0, 1 - distance / influenceRadius);
        const mouseEffect =
          influence *
          mouseInfluence *
          Math.sin(time * 0.001 + x * 0.01 + wave.offset);

        const y =
          h / 2 +
          Math.sin(x * wave.frequency + time * 0.002 + wave.offset) *
            wave.amplitude +
          Math.sin(x * wave.frequency * 0.4 + time * 0.003) *
            (wave.amplitude * 0.45) +
          mouseEffect;

        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      // No shadowBlur — use double-stroke for glow effect (much faster)
      ctx.lineWidth = 6;
      ctx.strokeStyle = wave.color;
      ctx.globalAlpha = wave.opacity * 0.3;
      ctx.stroke();

      ctx.lineWidth = 2;
      ctx.globalAlpha = wave.opacity;
      ctx.stroke();

      ctx.restore();
    };

    const animate = (timestamp: number) => {
      animationId = window.requestAnimationFrame(animate);

      // Throttle to target FPS
      const delta = timestamp - lastFrameTime;
      if (delta < FRAME_INTERVAL) return;
      lastFrameTime = timestamp - (delta % FRAME_INTERVAL);

      time += 1;

      mouseRef.current.x +=
        (targetMouseRef.current.x - mouseRef.current.x) * smoothing;
      mouseRef.current.y +=
        (targetMouseRef.current.y - mouseRef.current.y) * smoothing;

      const w = W();
      const h = H();

      const gradient = ctx.createLinearGradient(0, 0, 0, h);
      gradient.addColorStop(0, themeColors.backgroundTop);
      gradient.addColorStop(1, themeColors.backgroundBottom);

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);

      ctx.globalAlpha = 1;

      themeColors.wavePalette.forEach(drawWave);
    };

    animationId = window.requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
      cancelAnimationFrame(animationId);
      observer.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    />
  );
}
