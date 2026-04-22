"use client";

import { motion } from "framer-motion";
import { X } from "lucide-react";
import { Dexter } from "@/components/brand/Dexter";

export interface CompanionBriefingProps {
  briefing: { summary: string; quickReplies: string[] };
  loading: boolean;
  onAsk: (text: string) => void;
  onDismiss: () => void;
}

const easeApple: [number, number, number, number] = [0.16, 1, 0.3, 1];

export function CompanionBriefing({
  briefing,
  loading,
  onAsk,
  onDismiss,
}: CompanionBriefingProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: easeApple }}
      className="relative flex items-start gap-4 rounded-[22px] border border-border/60 p-4 sm:p-5 shadow-soft dark:shadow-soft-dark"
      style={{ backgroundColor: "hsl(var(--card))" }}
    >
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dispensar briefing"
        className="absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted/30 hover:text-foreground"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      <div className="shrink-0">
        <Dexter mood="thinking" size={56} animated alt="" />
      </div>

      <div className="flex-1 min-w-0 pr-6">
        {loading ? (
          <div className="flex flex-col gap-2">
            <div className="h-3 w-24 animate-pulse rounded-full bg-muted/40" />
            <div className="h-3 w-full animate-pulse rounded-full bg-muted/40" />
            <div className="h-3 w-4/5 animate-pulse rounded-full bg-muted/40" />
          </div>
        ) : (
          <>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-500">
              Ticker
            </p>
            <p className="mt-1 text-sm leading-relaxed text-foreground whitespace-pre-wrap">
              {briefing.summary}
            </p>
            {briefing.quickReplies.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {briefing.quickReplies.slice(0, 3).map((reply) => (
                  <button
                    key={reply}
                    type="button"
                    onClick={() => onAsk(reply)}
                    className="inline-flex items-center rounded-full border border-border/60 px-3 py-1 text-xs font-medium text-foreground transition-colors hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:text-emerald-300"
                  >
                    {reply}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}
