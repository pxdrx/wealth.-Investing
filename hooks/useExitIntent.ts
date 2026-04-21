"use client";

import { useEffect, useState } from "react";

const SESSION_KEY = "wealth-exit-intent-shown";
const ARM_DELAY_MS = 10_000;

export function useExitIntent(): { open: boolean; dismiss: () => void } {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!window.matchMedia("(min-width: 768px)").matches) return;

    try {
      if (sessionStorage.getItem(SESSION_KEY) === "1") return;
    } catch {
      // ignore storage errors
    }

    let armed = false;
    const armTimer = window.setTimeout(() => {
      armed = true;
    }, ARM_DELAY_MS);

    const onLeave = (e: MouseEvent) => {
      if (!armed) return;
      if (e.clientY > 0) return;
      setOpen(true);
      try {
        sessionStorage.setItem(SESSION_KEY, "1");
      } catch {
        // ignore
      }
      document.documentElement.removeEventListener("mouseleave", onLeave);
    };

    document.documentElement.addEventListener("mouseleave", onLeave);

    return () => {
      window.clearTimeout(armTimer);
      document.documentElement.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  const dismiss = () => setOpen(false);

  return { open, dismiss };
}
