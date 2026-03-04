"use client";

import { ActiveAccountProvider } from "@/components/context/ActiveAccountContext";
import { AppHeader } from "@/components/layout/AppHeader";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const prefersReducedMotion = useReducedMotion();

  const variants = {
    initial: prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 },
    animate: prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 },
    exit: prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -6 },
  };

  return (
    <ActiveAccountProvider>
      <AppHeader />
      <AnimatePresence mode="wait">
        <motion.main
          key={pathname}
          variants={variants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{
            duration: prefersReducedMotion ? 0.08 : 0.22,
            ease: [0.16, 1, 0.3, 1] as any,
          }}
        >
          {children}
        </motion.main>
      </AnimatePresence>
    </ActiveAccountProvider>
  );
}
