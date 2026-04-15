---
tags: [projeto, design, tokens, lumina-slate]
date: 2026-03-25
---

# Design System — Lumina Slate

## Filosofia

> Neutro, premium, Apple-like. **SEM neon, SEM cyberpunk.**

Ver: [[Design Direction]]

## Cores (CSS Variables)

### Light Mode
| Token | Valor | Uso |
|-------|-------|-----|
| `--background` | `220 14% 95%` (#f0f1f4) | Fundo geral (off-white) |
| `--card` | white | Cards, modals, dropdowns |
| `--foreground` | dark | Texto principal |
| `--muted-foreground` | gray | Texto secundário |
| `--primary` | brand color | Botões, links |

### Dark Mode
| Token | Valor | Uso |
|-------|-------|-----|
| `--background` | `#111` | Fundo geral |
| `--card` | dark gray | Cards |

### Landing Page Tokens
`l-bg`, `l-elevated`, `l-text`, `l-accent`, etc.

## Tipografia

| Token | Valor |
|-------|-------|
| `--font-weight-heading` | 600 |
| `--font-weight-display` | 700 |
| `tracking-tight-apple` | custom tracking |
| `tracking-tighter-apple` | tighter custom |
| `leading-tight-apple` | custom line-height |
| `leading-snug-apple` | snug line-height |

**Fontes:** Plus Jakarta Sans (headings) + Inter (body)

## Radius

| Token | Valor | Uso |
|-------|-------|-----|
| `--radius-card` | 22px | Cards |
| `--radius-modal` | 24px | Modals |
| `--radius-input` | 12px | Inputs |
| pills/buttons | `rounded-full` | Botões |

## Shadows

| Token | Contexto |
|-------|----------|
| `shadow-soft` | Light mode |
| `dark:shadow-soft-dark` | Dark mode |
| `shadow-landing-card` | Landing page cards |
| `shadow-landing-card-hover` | Landing page hover |

## Animações

- Engine: **Framer Motion**
- Easing padrão: `easeApple = [0.16, 1, 0.3, 1]`
- Landing page: spiral animation na hero

## Padrão de Card

```tsx
<Card
  className="rounded-[22px] shadow-soft dark:shadow-soft-dark isolate"
  style={{ backgroundColor: "hsl(var(--card))" }}
>
  {/* conteúdo */}
</Card>
```

> [!warning] Sempre usar inline style para `backgroundColor`
> `bg-card` sozinho pode ser transparente em certos contextos.

## BGPattern

- Dots pattern fixo no body, z-0, opacity 0.12
- Cards usam `isolate` para evitar bleeding

#projeto #design #lumina-slate
