---
tags: [instagram, reels, dexter, ultra, brief, higgsfield]
slug: 30telas-1decisao-20260505
status: pre-produção
date: 2026-05-05
formato: 9:16 / 1080x1920 / 28s
feature: Dexter Analyst (Ultra)
canal: @owealth.investing
---

# Reel — "30 Telas → 1 Decisão"

## Pitch em uma linha

> Um trader soterrado por 30 monitores caóticos. Dexter percorre as telas, extrai um dado-chave de cada uma e colapsa tudo em **uma única decisão** — a mesma card que aparece dentro do app.

## Promessa do Reel

Não vendemos o produto. Mostramos a sensação que o produto entrega: **substituir overload por clareza cirúrgica**.

A frase final é uma observação ("Trinta telas. Uma decisão."), não uma promessa de lucro. Conforme [[../../../BRAND.md|BRAND.md §7]] — *dados antes de opinião*.

## Por que esse conceito

| Critério | Resposta |
|---|---|
| Inédito no nicho? | Sim. Trading content BR é 99% talking-head + cara apontando candle. Ninguém faz CGI cinematográfico minimalista — a ferramenta (Higgs Field) acabou de viabilizar. |
| Brand-fit? | Total. Paleta `#0A0A0A` / `#F7F6F3` / `#00B37E`, tipografia Inter, anti-sensacionalismo. |
| Top de funil? | Sim. Hook visual de 1.5s (silhueta + 30 telas piscando) interrompe scroll. Sem jargão, qualquer pessoa entende a metáfora "muitos → um". |
| Loop natural? | Sim. Termina em silêncio com 1 tela acesa → próximo loop reabre com o caos das 30, contraste fica ainda mais forte. |
| Reusável como linha editorial? | Sim. "Dexter cinematográfico" pode virar uma franquia: cada Reel troca o cenário (sala de guerra, tribunal, quarto vazio) mantendo o cursor esmeralda como marca registrada. |

## Audiência-alvo

Conforme [[../Estratégia de Conteúdo.md|Estratégia de Conteúdo]]:
- Traders BR (forex, índices, commodities), 22–40 anos
- Iniciantes a intermediários sentindo overload de informação
- Quem já tentou prop firm e travou no excesso de variáveis

## Pilar de conteúdo

Cruzamento de **Produto (20%)** + **Educação (30%)** — não é demo crua, é narrativa que *encarna* a feature.

## Estrutura narrativa (28s, 6 shots)

```
 0s ┌─────────────────────────────────────────────┐
    │ HOOK  — quarto escuro, 30 telas explodem     │ Shot 1 (5s)
 5s ├─────────────────────────────────────────────┤
    │ AUTORIDADE — cursor esmeralda escaneia       │ Shot 2 (5s)
10s ├─────────────────────────────────────────────┤
    │ TENSÃO  — fragmentos de dado orbitam trader  │ Shot 3 (5s)
15s ├─────────────────────────────────────────────┤
    │ SÍNTESE — fragmentos colapsam em UMA card    │ Shot 4 (5s)
20s ├─────────────────────────────────────────────┤
    │ PAYOFF — 29 telas apagam, 1 fica acesa       │ Shot 5 (4s)
24s ├─────────────────────────────────────────────┤
    │ CTA   — UI real do app + tagline             │ Shot 6 (4s)
28s └─────────────────────────────────────────────┘
```

## Mecânicas de funil orgânico

1. **Hook visual de 1.5s** (Shot 1, primeiros frames): silhueta + 30 telas piscando = interrupção de padrão. Trava o scroll antes do cérebro decidir deslizar.
2. **Save trigger** (Shot 2 + VO): "Fed. DXY. COT. Sentimento. Risco." é uma checklist utilitária. O espectador salva pra consultar depois.
3. **Comment bait** (caption): "Qual ativo você quer que o Dexter analise primeiro?" — pergunta de baixíssima fricção que gera comentários com tickers (sinal pro algoritmo + lead implícito).
4. **Share trigger** (Shot 4): o frame da síntese é printável — exatamente o tipo de imagem que trader manda no grupo do WhatsApp dizendo "olha esse app".
5. **Loop forte**: termina em silêncio com 1 tela acesa. Re-entrada no Reel reabre o caos das 30 telas com contraste ampliado → engagement time sobe → algoritmo distribui mais.

## Mood board / referências de linguagem visual

- *Severance* (Apple TV+) — austeridade fluorescente, simetria, frios
- *Dune Part Two* (Greig Fraser) — volumetria + silêncio
- Apple keynote product shots — fundo cremoso, parallax sutil
- Edward Hopper *Office at Night* — solitude clara
- Trailer do Bloomberg Terminal anos 80 — tickers como personagem

## Dependências

- [[shotlist|Shotlist com prompts Higgs Field]] (este reel)
- [[vo|Script VO PT-BR]] (este reel)
- [[caption|Caption + hashtags + thumbnail]] (este reel)
- `scripts/generate-reel-30telas.mjs` — wrapper Node sobre `higgsfield-cli`
- Screenshot real de `/app/dexter/analyst` rodando local com análise EURUSD válida (input para Shot 6)

## Validação pré-publicação

Checklist em cima de [[../../../BRAND.md|BRAND.md §10]] + específicos do Reel:

- [ ] Primeiros 1.5s sem logo nem texto — só visual disruptivo
- [ ] Cor `#00B37E` aparece em ≤ 3 momentos (cursor + accent bar + status pulse)
- [ ] Verdict card do Shot 4 usa **dados realistas** extraídos de uma análise EURUSD real do app — nada inventado
- [ ] VO PT-BR sem palavras proibidas (`incrível`, `chocante`, `garantido`, `explosivo`)
- [ ] Loop limpo: último frame corta no primeiro frame sem cut visível
- [ ] Caption ≤ 2.200 caracteres
- [ ] Hashtags só no 1º comentário, máx 8 (regra `BRAND.md` §7)
- [ ] Teste de mute: o Reel comunica sem som? Texto da Shot 4 (verdict card) carrega sozinho. ✅

## Métricas de sucesso (primeiros 7 dias)

| Métrica | Meta |
|---|---|
| Retention 0–3s | ≥ 60% |
| Save rate | ≥ 5% |
| Comentários com ticker | ≥ 30 |
| Share / view ratio | ≥ 1 / 50 |
| Cliques no link da bio | ≥ 200 |
| Trial Ultra atribuído | ≥ 8 |

## Links

- [[../Estratégia de Conteúdo|Estratégia de Conteúdo]]
- [[../Fórmula dos 6 Slides|Fórmula dos 6 Slides]] (referência pra carrosséis derivativos)
- [[../../Funcionalidades/Analista de Ativos|Feature: Dexter Analyst]]
- [[../Posts Publicados|Posts Publicados]]
