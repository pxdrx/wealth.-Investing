export type TagCategory = "positive" | "negative" | "neutral";

export interface PredefinedTag {
  slug: string;
  label: string;
  category: TagCategory;
  description: string;
}

export const PREDEFINED_TAGS: PredefinedTag[] = [
  // Positivas (5)
  { slug: "plano-seguido", label: "Plano seguido", category: "positive", description: "Entrou conforme o setup planejado" },
  { slug: "gestao-correta", label: "Gestão correta", category: "positive", description: "SL/TP respeitados, position sizing correto" },
  { slug: "paciencia", label: "Paciência", category: "positive", description: "Esperou confirmação antes de entrar" },
  { slug: "saida-no-alvo", label: "Saída no alvo", category: "positive", description: "Realizou lucro no target planejado" },
  { slug: "reentrada-correta", label: "Reentrada correta", category: "positive", description: "Reentrou após stop com nova tese válida" },
  // Negativas (5)
  { slug: "fomo", label: "FOMO", category: "negative", description: "Entrou por medo de ficar de fora" },
  { slug: "revenge-trade", label: "Revenge trade", category: "negative", description: "Operou para recuperar perda anterior" },
  { slug: "overtrading", label: "Overtrading", category: "negative", description: "Operou sem setup claro / mais vezes que o plano" },
  { slug: "sl-movido", label: "SL movido", category: "negative", description: "Moveu o stop loss no meio da operação contra si" },
  { slug: "saida-antecipada", label: "Saída antecipada", category: "negative", description: "Saiu antes do alvo por ansiedade" },
  // Neutras (2)
  { slug: "news-driven", label: "News-driven", category: "neutral", description: "Operação motivada por notícia ou evento macro" },
  { slug: "contra-tendencia", label: "Contra-tendência", category: "neutral", description: "Operou contra a tendência maior" },
];

export const PREDEFINED_TAG_SLUGS: ReadonlySet<string> = new Set(
  PREDEFINED_TAGS.map((t) => t.slug)
);

export const TAG_CATEGORY_LABELS: Record<TagCategory, string> = {
  positive: "Positivas",
  negative: "Negativas",
  neutral: "Neutras",
};

export const TAG_CATEGORY_ORDER: TagCategory[] = ["positive", "negative", "neutral"];

export function getTagBySlug(slug: string): PredefinedTag | undefined {
  return PREDEFINED_TAGS.find((t) => t.slug === slug);
}

export function getTagsByCategory(category: TagCategory): PredefinedTag[] {
  return PREDEFINED_TAGS.filter((t) => t.category === category);
}

export function getSlugsByCategory(category: TagCategory): string[] {
  return getTagsByCategory(category).map((t) => t.slug);
}

export function isPredefinedTag(slug: string): boolean {
  return PREDEFINED_TAG_SLUGS.has(slug);
}
