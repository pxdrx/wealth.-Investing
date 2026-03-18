"use client";

import { useRef, useEffect, useState } from "react";

interface StatCounterProps {
  value: number;
  suffix?: string;
  duration?: number;
  className?: string;
}

export function StatCounter({
  value,
  suffix = "",
  duration = 1200,
  className = "",
}: StatCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isDecimal = value % 1 !== 0;
  const finalDisplay = isDecimal ? value.toFixed(1) : Math.round(value).toString();
  const [display, setDisplay] = useState(finalDisplay);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasAnimated]);

  useEffect(() => {
    if (!hasAnimated) return;

    // Reset to 0 to start the count-up animation
    setDisplay("0");
    const start = performance.now();

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = eased * value;
      setDisplay(isDecimal ? current.toFixed(1) : Math.round(current).toString());

      if (progress < 1) {
        requestAnimationFrame(tick);
      }
    }

    requestAnimationFrame(tick);
  }, [hasAnimated, value, duration]);

  return (
    <span ref={ref} className={className}>
      {display}
      {suffix}
    </span>
  );
}
