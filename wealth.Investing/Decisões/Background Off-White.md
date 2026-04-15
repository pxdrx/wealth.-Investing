---
tags: [decisão, design, cor]
date: 2026-03-17
status: implementado
---

# Background Off-White

## Decisão

Mudar `--background` light mode de branco puro para off-white para melhor contraste com cards.

## Antes vs Depois

| | Antes | Depois |
|--|-------|--------|
| HSL | branco puro | `220 14% 95%` |
| Efeito | Cards se misturavam com fundo | Cards se destacam claramente |

## Motivação

Cards com `bg-card` (white) não tinham contraste suficiente contra fundo branco. O off-white cria hierarquia visual clara entre Layer 0 (fundo) e Layer 1 (cards).

Ver: [[Design System]], [[Design Direction]]

#decisão #design #cor
