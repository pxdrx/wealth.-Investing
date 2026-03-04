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
      },
      fontFamily: {
        sans: ["system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
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
        /* Duas camadas: ampla leve + próxima — profundidade sofisticada, sem exagero */
        soft: "0 1px 3px rgba(0,0,0,0.06), 0 10px 32px -12px rgba(0,0,0,0.08)",
        "soft-dark": "0 1px 4px rgba(0,0,0,0.12), 0 12px 32px -12px rgba(0,0,0,0.14)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
