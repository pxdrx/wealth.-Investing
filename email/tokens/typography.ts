// Source: brief A-03 spec (dir não materializado no repo)
// Font stacks com fallbacks email-safe.

export const fontStacks = {
  serif: 'Fraunces, Georgia, serif',
  sans: 'Inter, Helvetica, Arial, sans-serif',
  mono: 'JetBrains Mono, Consolas, monospace',
} as const;

export const fontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  md: 18,
  lg: 22,
  xl: 28,
  display: 36,
} as const;

export const fontWeight = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;

export const lineHeight = {
  tight: 1.2,
  snug: 1.4,
  normal: 1.6,
} as const;

export type FontStack = keyof typeof fontStacks;
