// [D5-03 / M4] First-visit `/command` discoverability hint for the Dexter chat.
//
// Mounts a single dismissible chip below the chat input on the first visit
// per browser session. Once dismissed (or after one full session), the
// `sessionStorage` flag suppresses it. No layout shift, no router state.
"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useAppT } from "@/hooks/useAppLocale";

const SESSION_KEY = "dexter-command-hint-dismissed";

export function CommandHint() {
  const t = useAppT();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (sessionStorage.getItem(SESSION_KEY) === "1") return;
      setShow(true);
    } catch {
      // sessionStorage blocked (private mode / SSR-edge) — render hint anyway.
      setShow(true);
    }
  }, []);

  const dismiss = () => {
    setShow(false);
    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      // ignore
    }
  };

  if (!show) return null;

  return (
    <div className="pointer-events-auto mx-auto mt-2 inline-flex max-w-xs items-center gap-2 rounded-full border border-border/60 bg-muted/60 px-3 py-1.5 text-xs text-muted-foreground shadow-soft dark:shadow-soft-dark">
      <span className="font-mono text-[11px] text-foreground/80">/</span>
      <span>{t("dexter.commandHint.body")}</span>
      <button
        type="button"
        onClick={dismiss}
        aria-label={t("dexter.commandHint.dismiss")}
        className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
