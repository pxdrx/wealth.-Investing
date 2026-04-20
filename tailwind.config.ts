import type { Config } from "tailwindcss";

// Terminal design system — emerald execution + amber alert.
// Semantic tokens resolve via CSS vars in app/globals.css (:root / .dark).
// Scales (neutral/green/red/amber) are inline HSL for predictability in
// marketing surfaces; use semantic tokens everywhere else.
export default {
  darkMode: ["class"],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./context/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Semantic tokens — bound to CSS vars, /<alpha-value> for opacity support
        background: "hsl(var(--background) / <alpha-value>)",
        foreground: "hsl(var(--foreground) / <alpha-value>)",
        card: {
          DEFAULT: "hsl(var(--card) / <alpha-value>)",
          foreground: "hsl(var(--card-foreground) / <alpha-value>)",
        },
        popover: {
          DEFAULT: "hsl(var(--popover) / <alpha-value>)",
          foreground: "hsl(var(--popover-foreground) / <alpha-value>)",
        },
        primary: {
          DEFAULT: "hsl(var(--primary) / <alpha-value>)",
          foreground: "hsl(var(--primary-foreground) / <alpha-value>)",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary) / <alpha-value>)",
          foreground: "hsl(var(--secondary-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted) / <alpha-value>)",
          foreground: "hsl(var(--muted-foreground) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "hsl(var(--accent) / <alpha-value>)",
          foreground: "hsl(var(--accent-foreground) / <alpha-value>)",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
        },
        success: {
          DEFAULT: "hsl(var(--success) / <alpha-value>)",
          foreground: "hsl(var(--success-foreground) / <alpha-value>)",
        },
        warning: {
          DEFAULT: "hsl(var(--warning) / <alpha-value>)",
          foreground: "hsl(var(--warning-foreground) / <alpha-value>)",
        },
        border: "hsl(var(--border) / <alpha-value>)",
        input: "hsl(var(--input) / <alpha-value>)",
        ring: "hsl(var(--ring) / <alpha-value>)",

        // Domain tokens — PNL semantics, kept 1:1 with existing vars
        "pnl-positive": "hsl(var(--pnl-positive) / <alpha-value>)",
        "pnl-positive-light": "hsl(var(--pnl-positive-light) / <alpha-value>)",
        "pnl-negative": "hsl(var(--pnl-negative) / <alpha-value>)",
        "pnl-text-positive": "hsl(var(--pnl-text-positive) / <alpha-value>)",
        "pnl-text-negative": "hsl(var(--pnl-text-negative) / <alpha-value>)",

        // Scales — raw HSL, independent of theme. Use for illustrations,
        // static marketing accents, and status surfaces that don't flip.
        neutral: {
          50: "hsl(220 14% 98% / <alpha-value>)",
          100: "hsl(220 13% 95% / <alpha-value>)",
          200: "hsl(220 13% 91% / <alpha-value>)",
          300: "hsl(216 12% 84% / <alpha-value>)",
          400: "hsl(218 11% 65% / <alpha-value>)",
          500: "hsl(220 9% 46% / <alpha-value>)",
          600: "hsl(220 13% 30% / <alpha-value>)",
          700: "hsl(221 19% 24% / <alpha-value>)",
          800: "hsl(222 22% 18% / <alpha-value>)",
          900: "hsl(222 28% 12% / <alpha-value>)",
          950: "hsl(223 39% 7% / <alpha-value>)",
        },
        green: {
          50: "hsl(152 81% 96% / <alpha-value>)",
          100: "hsl(152 75% 92% / <alpha-value>)",
          200: "hsl(152 70% 82% / <alpha-value>)",
          300: "hsl(152 62% 65% / <alpha-value>)",
          400: "hsl(152 55% 50% / <alpha-value>)",
          500: "hsl(152 60% 40% / <alpha-value>)",
          600: "hsl(152 65% 32% / <alpha-value>)",
          700: "hsl(152 68% 25% / <alpha-value>)",
          800: "hsl(152 72% 18% / <alpha-value>)",
          900: "hsl(152 72% 12% / <alpha-value>)",
          950: "hsl(152 75% 7% / <alpha-value>)",
        },
        red: {
          50: "hsl(0 85% 97% / <alpha-value>)",
          100: "hsl(0 93% 94% / <alpha-value>)",
          200: "hsl(0 96% 88% / <alpha-value>)",
          300: "hsl(0 95% 78% / <alpha-value>)",
          400: "hsl(0 90% 65% / <alpha-value>)",
          500: "hsl(0 75% 55% / <alpha-value>)",
          600: "hsl(0 70% 45% / <alpha-value>)",
          700: "hsl(0 72% 37% / <alpha-value>)",
          800: "hsl(0 70% 30% / <alpha-value>)",
          900: "hsl(0 65% 24% / <alpha-value>)",
          950: "hsl(0 75% 15% / <alpha-value>)",
        },
        amber: {
          50: "hsl(44 100% 96% / <alpha-value>)",
          100: "hsl(44 98% 90% / <alpha-value>)",
          200: "hsl(44 96% 80% / <alpha-value>)",
          300: "hsl(44 95% 68% / <alpha-value>)",
          400: "hsl(44 95% 56% / <alpha-value>)",
          500: "hsl(44 100% 47% / <alpha-value>)",
          600: "hsl(40 92% 43% / <alpha-value>)",
          700: "hsl(36 92% 38% / <alpha-value>)",
          800: "hsl(32 82% 30% / <alpha-value>)",
          900: "hsl(28 80% 24% / <alpha-value>)",
          950: "hsl(24 80% 15% / <alpha-value>)",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "-apple-system", "sans-serif"],
        display: ["var(--font-manrope)", "system-ui", "-apple-system", "sans-serif"],
        headline: ["var(--font-manrope)", "system-ui", "-apple-system", "sans-serif"],
        mono: ["var(--font-jetbrains)", "JetBrains Mono", "ui-monospace", "monospace"],
      },
      fontSize: {
        xs: ["0.75rem", { lineHeight: "1.5" }],
        sm: ["0.875rem", { lineHeight: "1.5" }],
        base: ["1rem", { lineHeight: "1.55" }],
        lg: ["1.125rem", { lineHeight: "1.5" }],
        xl: ["1.25rem", { lineHeight: "1.45" }],
        "2xl": ["1.5rem", { lineHeight: "1.3" }],
        "3xl": ["1.875rem", { lineHeight: "1.2" }],
        "4xl": ["2.25rem", { lineHeight: "1.15" }],
        "5xl": ["3rem", { lineHeight: "1.1" }],
        "6xl": ["3.75rem", { lineHeight: "1.05" }],
        "7xl": ["4.5rem", { lineHeight: "1" }],
      },
      borderRadius: {
        // New system — derives from --radius (0.75rem terminal-ish)
        DEFAULT: "var(--radius)",
        sm: "calc(var(--radius) - 4px)",
        md: "calc(var(--radius) - 2px)",
        lg: "var(--radius)",
        xl: "calc(var(--radius) + 4px)",
        "2xl": "calc(var(--radius) + 8px)",
        "3xl": "calc(var(--radius) + 16px)",
        // Legacy tokens — existing cards/modals/inputs still 22/24/12px.
        // Migrate to new scale incrementally (tracked via C-12+).
        card: "var(--radius-card)",
        modal: "var(--radius-modal)",
        input: "var(--radius-input)",
      },
      letterSpacing: {
        "tight-apple": "var(--tracking-tight)",
        "tighter-apple": "var(--tracking-tighter)",
      },
      lineHeight: {
        "tight-apple": "var(--leading-tight)",
        "snug-apple": "var(--leading-snug)",
        "relaxed-apple": "var(--leading-relaxed)",
      },
      boxShadow: {
        soft: "0 1px 3px rgba(0,0,0,0.06), 0 10px 32px -12px rgba(0,0,0,0.08)",
        "soft-dark":
          "0 1px 4px rgba(0,0,0,0.12), 0 12px 32px -12px rgba(0,0,0,0.14)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
