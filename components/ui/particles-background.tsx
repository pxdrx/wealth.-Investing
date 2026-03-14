"use client";

import { useEffect, useState } from "react";
import { useTheme } from "@/components/theme-provider";
import { Particles } from "@/components/ui/particles";

export function ParticlesBackground() {
  const { resolvedTheme } = useTheme();
  const [color, setColor] = useState("#000000");

  useEffect(() => {
    setColor(resolvedTheme === "dark" ? "#ffffff" : "#000000");
  }, [resolvedTheme]);

  return (
    <Particles
      className="fixed inset-0 z-0"
      quantity={20}
      staticity={90}
      ease={80}
      size={0.4}
      color={color}
    />
  );
}
