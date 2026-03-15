"use client";

import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/components/theme-provider";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="relative flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-l-tertiary"
      aria-label={isDark ? "Ativar tema claro" : "Ativar tema escuro"}
    >
      <Sun className="h-4 w-4 text-l-text-secondary rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 text-l-text-secondary rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </button>
  );
}
