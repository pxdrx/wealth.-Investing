"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { SpiralBackground } from "@/components/landing/SpiralBackground";
import { BrandMark } from "@/components/brand/BrandMark";
import { useTheme } from "@/components/theme-provider";

const easeApple = [0.16, 1, 0.3, 1] as const;

export default function HomePage() {
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 1800);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden"
      style={{ background: isLight ? "#f0f0f2" : "#000000" }}
    >
      {/* Spiral */}
      <div className="absolute inset-0">
        <SpiralBackground />
      </div>

      {/* Vignette */}
      <div
        className="pointer-events-none absolute inset-0 z-10"
        style={{
          background: isLight
            ? "radial-gradient(ellipse at center, transparent 30%, rgba(240,240,242,0.75) 100%)"
            : "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.55) 100%)",
        }}
      />

      {/* UI */}
      <div className="relative z-20 flex flex-col items-center">
        <motion.div
          className="mb-3 text-center"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.6, ease: easeApple }}
        >
          <BrandMark size="xl" />
        </motion.div>

        <motion.p
          className="mb-12 text-sm text-center"
          style={{ color: isLight ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.35)" }}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.8, ease: easeApple }}
        >
          Suas notícias, seu journal, sua wallet,{" "}
          <span
            style={{
              color: isLight ? "rgba(0,0,0,0.7)" : "rgba(255,255,255,0.65)",
              fontWeight: 500,
            }}
          >
            seu tudo.
          </span>
        </motion.p>

        <motion.button
          onClick={() => router.push("/login")}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: visible ? 1 : 0, y: visible ? 0 : 8 }}
          transition={{ duration: 0.8, ease: easeApple }}
          whileHover={{ scale: 1.02 }}
          style={{
            border: isLight ? "1px solid rgba(0,0,0,0.15)" : "1px solid rgba(255,255,255,0.18)",
            color: isLight ? "rgba(0,0,0,0.65)" : "rgba(255,255,255,0.8)",
            background: "transparent",
            backdropFilter: "blur(8px)",
          }}
          className="rounded-full px-10 py-3.5 text-xs font-normal tracking-[0.18em] uppercase cursor-pointer transition-colors hover:bg-white/5"
        >
          Entrar
        </motion.button>
      </div>
    </div>
  );
}
