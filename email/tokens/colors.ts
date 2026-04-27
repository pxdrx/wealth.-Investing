// Source: brief A-03 spec (dir não materializado no repo)
// Hex literais — email clients não suportam OKLCH/CSS vars.

export const colors = {
  paper: '#FAFAF7',
  paper2: '#F0EFEA',
  ink: '#0A0F0D',
  ink2: '#1F2A24',
  green: '#2DB469',
  greenDeep: '#1F3A2E',
  accent: '#E8A317',
  danger: '#D85A5A',
  line: '#E8E8E8',
} as const;

export type ColorToken = keyof typeof colors;
