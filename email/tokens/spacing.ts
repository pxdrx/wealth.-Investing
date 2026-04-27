// Source: brief A-03 spec (dir não materializado no repo)
// Escala de spacing em pixels.

export const spacing = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 24,
  6: 32,
  7: 48,
  8: 64,
} as const;

export type SpacingToken = keyof typeof spacing;

export const containerWidth = 600;
export const radius = {
  sm: 4,
  md: 8,
  lg: 12,
} as const;
