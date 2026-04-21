// <ThemeToggle /> — brand-layer 3-state theme selector.
//
// Three states: Light, Terminal (brutalist dark from A-01), System.
// "Terminal" is the brand name for the dark theme — internally it maps to
// `setTheme("dark")` on the existing ThemeProvider (components/theme-provider).
//
// Two visual variants:
//   - "segmented" (default): inline 3-button segmented control, brutalist mono
//   - "icon":     compact single-button icon trigger + dropdown menu
//
// Uses the existing ThemeProvider context (no new provider, no migration).

"use client";

import * as React from "react";
import { Monitor, Sun, Terminal, type LucideIcon } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { voice, pick, type Locale } from "@/lib/brand";

// Brand-surface value. Internally mapped to the provider's "dark".
type ThemeChoice = "light" | "terminal" | "system";

// Provider accepts only "light" | "dark" | "system" — map here.
function toProvider(choice: ThemeChoice): "light" | "dark" | "system" {
  return choice === "terminal" ? "dark" : choice;
}

// Reverse of the above for initial rendering.
function fromProvider(theme: "light" | "dark" | "system"): ThemeChoice {
  return theme === "dark" ? "terminal" : theme;
}

const OPTIONS: ReadonlyArray<{
  value: ThemeChoice;
  icon: LucideIcon;
  voiceKey: keyof typeof voice.theme;
}> = [
  { value: "light", icon: Sun, voiceKey: "light" },
  { value: "terminal", icon: Terminal, voiceKey: "terminal" },
  { value: "system", icon: Monitor, voiceKey: "system" },
] as const;

export interface ThemeToggleProps {
  /** Visual variant. "segmented" inline, "icon" compact dropdown. Default "segmented". */
  variant?: "segmented" | "icon";
  /** Locale for labels + aria. Default "pt". */
  locale?: Locale;
  /** Extra classes on the outer element. */
  className?: string;
}

export function ThemeToggle({
  variant = "segmented",
  locale = "pt",
  className,
}: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const active: ThemeChoice = fromProvider(theme);
  const label = pick(voice.theme.label, locale);

  if (variant === "icon") {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn("relative h-9 w-9", className)}
            aria-label={label}
          >
            <ActiveIcon theme={active} />
            <span className="sr-only">{label}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {OPTIONS.map(({ value, icon: Icon, voiceKey }) => (
            <DropdownMenuItem
              key={value}
              onClick={() => setTheme(toProvider(value))}
              aria-pressed={active === value}
              className="font-mono text-xs uppercase tracking-wider"
            >
              <Icon width={14} height={14} strokeWidth={2} className="mr-2" />
              {pick(voice.theme[voiceKey], locale)}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Segmented variant (default)
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        "inline-flex rounded-sm border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)] p-0.5",
        className,
      )}
    >
      {OPTIONS.map(({ value, icon: Icon, voiceKey }) => {
        const selected = active === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={pick(voice.theme[voiceKey], locale)}
            onClick={() => setTheme(toProvider(value))}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1",
              "font-mono text-[11px] font-semibold uppercase tracking-wider",
              "transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-1",
              selected
                ? "bg-[hsl(var(--background))] text-[hsl(var(--foreground))] shadow-sm"
                : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]",
            )}
          >
            <Icon width={12} height={12} strokeWidth={2} aria-hidden />
            <span>{pick(voice.theme[voiceKey], locale)}</span>
          </button>
        );
      })}
    </div>
  );
}

function ActiveIcon({ theme }: { theme: ThemeChoice }) {
  const Icon =
    theme === "light" ? Sun : theme === "terminal" ? Terminal : Monitor;
  return <Icon className="h-4 w-4" strokeWidth={2} aria-hidden />;
}
