---
tags: [instagram, reels, caption, copy, hashtags]
slug: 30telas-1decisao-20260505
date: 2026-05-05
---

# Caption + Hashtags + Thumbnail — "30 Telas → 1 Decisão"

## Caption (legenda do post)

> Cola direto no Instagram. **Linha em branco** entre blocos é proposital — quebra visual no feed.

```
Você não precisa sentir o mercado.

Você pode vê-lo.

Dexter cruza 30 fontes em 12 segundos —
macro, técnica, fundamentalista, sentimento, risco —
e te entrega UMA decisão.

Entry. Stop. Target.

Sem palpite. Sem palpiteiro.

—

→ wealth.investing
Dexter Analyst (plano Ultra). Link na bio.

Comenta aí: qual ativo você quer que o Dexter analise primeiro?
```

**Contagem:** 332 caracteres com espaços. Bem abaixo do limite de 2.200.

**Por que essa caption funciona:**
- Linha 1 (negação) + linha 2 (afirmação) = padrão "objection + reframe" que cria pausa cognitiva.
- "30 fontes em 12 segundos" = número específico, dispara curiosidade utilitária.
- "Sem palpite. Sem palpiteiro." = tira do campo emocional / guru, posiciona como ferramenta sóbria.
- CTA único e claro (link na bio). Nenhum "compre agora", nenhuma urgência fake.
- Pergunta final é low-stakes — gera tickers nos comentários (sinal pro algoritmo + lead implícito de interesse).

## Variações da caption (A/B test)

### Versão B — mais direta

```
Trinta telas piscando.
Cinco fontes que importam.
Uma decisão acionável.

Dexter Analyst no wealth.investing.
Link na bio.

Qual ativo você quer ver analisado primeiro?
```

### Versão C — mais provocativa

```
Trader olhando 30 monitores não é foco.
É medo de perder algum sinal.

Dexter cruza tudo, te entrega 1 verdict.

wealth.investing — link na bio.
```

**Recomendação:** começar com versão A (a do topo). Se em 24h o engajamento ficar abaixo de 60% retention 0–3s, repostar com versão C como Reel novo (não editar a legenda do post original — Instagram pune edição de Reels publicados).

## Primeiro comentário (hashtags)

> Postar imediatamente após o Reel ir ao ar. Conforme [[../../../BRAND.md|BRAND.md §7]]: hashtags **sempre no primeiro comentário**, nunca na legenda.

```
#trading #investimentos #mercadofinanceiro #trader #analisetecnica #forex #cripto #wealthinvesting
```

**8 hashtags exatas — limite máximo definido em `BRAND.md`.** Pool oficial da marca, nada novo.

## Thumbnail (capa do Reel)

Reels mostra capa nos perfis e na aba Reels. Capa **diferente** do primeiro frame do vídeo (que é a silhueta escura).

### Especificações

- **Dimensões:** 1080×1920px (mesma do Reel)
- **Safe zone para thumb na grid do perfil:** centralizar no quadrado central 1080×1080 (Instagram corta em 1:1 na grid)
- **Render:** HTML estático com `--brand-` tokens do `BRAND.md` §9, screenshot via Puppeteer 2x

### Layout da capa

```
┌─────────────────────────────────┐
│                                 │  ← topo livre (corte 9:16)
│                                 │
│  ┌───────────────────────────┐  │
│  │                           │  │  ← área visível na grid 1:1
│  │   30 telas.               │  │
│  │   1 decisão.              │  │
│  │                           │  │
│  │   ────────                │  │
│  │                           │  │
│  │   Dexter Analyst          │  │
│  │   wealth.investing        │  │
│  │                           │  │
│  └───────────────────────────┘  │
│                                 │
│                                 │  ← rodapé livre
└─────────────────────────────────┘
```

### Tipografia

- "30 telas." → Inter 700, 96px, color `#1A1A1A`
- "1 decisão." → Inter 700, 96px, color `#00B37E`
- Linha divisória → 1px solid `#D4D2CB`, largura 64px
- "Dexter Analyst" → Inter 600, 28px, color `#1A1A1A`
- "wealth.investing" → Inter 500, 22px, color `#6B6B6B`

### Fundo

- `#F7F6F3` sólido (off-white da marca)
- Zero gradiente, zero textura, zero decoração

### Comando de render

```bash
node scripts/render-reel-thumb.mjs \
  --title-1 "30 telas." \
  --title-2 "1 decisão." \
  --subtitle "Dexter Analyst" \
  --brand "wealth.investing" \
  --output reels-output/30telas/thumbnail.png
```

> Se o script `render-reel-thumb.mjs` não existir, pode aproveitar a infra de Puppeteer já usada em `scripts/preview-tracka-design.mjs` ou `scripts/preview-real-briefing.ts`.

## Horário de postagem (Brasil)

Conforme padrão do nicho de trading no BR:
- **Melhor janela:** terça ou quarta, 19h00 BRT (depois do fechamento de NY, antes do horário nobre da TV)
- **Segunda melhor:** sábado 10h00 BRT (público que estuda no fim de semana)
- **Evitar:** sexta 16h–22h (saturação social), domingo qualquer hora (engajamento baixo)

## Ações pós-publicação (primeiras 2h são críticas)

1. Postar o comentário com hashtags **dentro de 30 segundos** após publicar.
2. Compartilhar o Reel no story do perfil.
3. Responder os 5 primeiros comentários **com pergunta de volta** ("E você, opera EUR/USD ou prefere outro par?") — mais comentários encadeados = mais distribuição.
4. Cross-post no X/Twitter com link pro Reel.
5. Pedir 3 traders parceiros pra mandar o Reel nos respectivos grupos de WhatsApp (não pra repostar — só pra mandar).

## Atualizar log

Após publicar, adicionar linha em [[../Posts Publicados]]:

```
| 2026-05-XX | 30telas-1decisao-20260505 | Reel cinematográfico Dexter Analyst | likes/comments/saves |
```

E preencher engajamento depois de 7 dias.

## Links

- [[30telas-1decisao-20260505|Brief]]
- [[shotlist|Shotlist Higgs Field]]
- [[vo|VO script PT-BR]]
- [[../../../BRAND.md|BRAND.md]]
