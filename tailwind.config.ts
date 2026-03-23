import type { Config } from "tailwindcss";

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
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: "hsl(var(--card))",
        "card-foreground": "hsl(var(--card-foreground))",
        primary: "hsl(var(--primary))",
        "primary-foreground": "hsl(var(--primary-foreground))",
        secondary: "hsl(var(--secondary))",
        "secondary-foreground": "hsl(var(--secondary-foreground))",
        muted: "hsl(var(--muted))",
        "muted-foreground": "hsl(var(--muted-foreground))",
        accent: "hsl(var(--accent))",
        "accent-foreground": "hsl(var(--accent-foreground))",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        popover: "hsl(var(--popover))",
        "popover-foreground": "hsl(var(--popover-foreground))",
        /* Landing-specific semantic colors */
        "l-bg": "hsl(var(--landing-bg))",
        "l-elevated": "hsl(var(--landing-bg-elevated))",
        "l-tertiary": "hsl(var(--landing-bg-tertiary))",
        "l-border": "hsl(var(--landing-border))",
        "l-border-strong": "hsl(var(--landing-border-strong))",
        "l-text": "hsl(var(--landing-text))",
        "l-text-secondary": "hsl(var(--landing-text-secondary))",
        "l-text-muted": "hsl(var(--landing-text-muted))",
        "l-accent": "hsl(var(--landing-accent))",
        "l-accent-secondary": "hsl(var(--landing-accent-secondary))",
        "l-warning": "hsl(var(--landing-accent-warning))",
        "l-danger": "hsl(var(--landing-accent-danger))",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "-apple-system", "sans-serif"],
        display: ["var(--font-jakarta)", "system-ui", "-apple-system", "sans-serif"],
        headline: ["var(--font-manrope)", "system-ui", "-apple-system", "sans-serif"],
        mono: ["var(--font-jetbrains)", "JetBrains Mono", "monospace"],
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
        "3xl": "1.5rem",
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
        "landing-card":
          "0 1px 2px rgba(0,0,0,0.04), 0 4px 16px -4px rgba(0,0,0,0.06)",
        "landing-card-hover":
          "0 2px 4px rgba(0,0,0,0.06), 0 8px 24px -4px rgba(0,0,0,0.1)",
        "landing-mockup":
          "0 4px 6px rgba(0,0,0,0.04), 0 20px 60px -12px rgba(0,0,0,0.12)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
