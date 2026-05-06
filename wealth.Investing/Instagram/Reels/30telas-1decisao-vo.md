---
tags: [instagram, reels, vo, audio, ptbr, dexter]
slug: 30telas-1decisao-20260505
date: 2026-05-05
duracao_total: 28s
idioma: pt-BR
---

# Voice-over + Sound Design — "30 Telas → 1 Decisão"

## Direção de voz

- **Gênero:** masculino, grave (faixa 80–110 Hz fundamental)
- **Estilo:** sussurro confiante, perto do mic (proximidade ≈ 5 cm)
- **Referência:** voz de trailer do Vince Gilligan, voz de cold open de *True Detective* S1
- **Sotaque:** PT-BR neutro (carioca/paulista de São Paulo zona sul, sem regionalismo forte)
- **Andamento:** lento. ≈ 2 palavras por segundo. Cada frase respira antes da próxima.
- **Intenção:** observação, não venda. O narrador não está te convencendo — está te descrevendo o que ele já sabe.

## Opção A — Voz humana

Gravar local em ambiente tratado. Mic dinâmico (Shure SM7B / Rode Procaster) com pop filter, compressor leve (3:1, threshold -18dB). Exportar 6 stems WAV 48kHz/24-bit, um por linha.

## Opção B — ElevenLabs (recomendado pra primeira versão)

| Parâmetro | Valor |
|---|---|
| Voice | "Antoni" (Multilingual v2) ou voz custom PT-BR low-end |
| Stability | 0.45 |
| Similarity boost | 0.85 |
| Style exaggeration | 0.15 |
| Speaker boost | on |
| Output format | WAV 48kHz |

Gerar cada linha como arquivo separado pra controle fino na timeline.

## Script (com timing exato)

| # | Timestamp | Linha (PT-BR) | Direção |
|---|---|---|---|
| 1 | 00:00.5 → 00:04.5 | "Mercados se movem com trinta forças ao mesmo tempo." | Observação. Pausa breve depois de "trinta". |
| 2 | 00:05.5 → 00:09.5 | "Você sente. Dexter cruza." | Dois beats separados. Pausa de 0.4s entre as duas frases. "Cruza" levemente acentuado. |
| 3 | 00:10.5 → 00:14.5 | "Fed. DXY. COT. Sentimento. Risco." | **Lista cadenciada**. ≈ 0.6s por palavra, com micro-pausa entre cada. |
| 4 | 00:15.5 → 00:19.5 | *(silêncio absoluto)* | Sem VO. Só o impacto sonoro da síntese. |
| 5 | 00:20.5 → 00:23.5 | "Trinta telas. Uma decisão." | A frase-âncora. Pausa entre as duas metades. |
| 6 | 00:24.0 → 00:27.5 | "wealth.investing. Dexter Analyst." | Quase sussurrado. Marca + feature. Sem energia comercial. |

**Total de palavras:** 22. **Total de fala:** ≈ 18s. **Espaço respirado:** ≈ 10s. Densidade controlada de propósito.

## Sound design (overlay sobre o VO)

| Tempo | Camada | Descrição |
|---|---|---|
| 00:00 → 00:05 | Ambient | Ruído branco filtrado low-pass, -28 LUFS. Cliques de teclado mecânico distantes. Beeps de ticker raros (1–2 no shot). |
| 00:05 → 00:10 | Transição | Ruído começa a "colapsar" via high-pass sweep ascendente (200Hz → 2kHz em 5s). Surge **sub-bass drone** em Lá grave (A1, 55 Hz). |
| 00:10 → 00:15 | Sustentação | Drone sustenta. Particle "shimmer": synth bell pad em A4 com reverb longo (decay 6s), trigger sutil a cada extração de partícula. |
| 00:15 → 00:17 | Impacto | **Um único impacto cinematográfico** no segundo 16.5: sub-boom (30 Hz fundamental) + transient white noise burst + tail de reverb em piano hammered string. Mistura -8 LUFS pico. |
| 00:17 → 00:20 | Vácuo | **Silêncio absoluto** por 3s. Zero som. Esse vazio é o herói emocional do Reel. |
| 00:20 → 00:24 | Retorno | Drone reaparece -36 LUFS, quase imperceptível. Som de respiração leve do trader sincronizada com Shot 5. |
| 00:24 → 00:28 | Fade | Drone fade-out exponencial em 4s. Último 0.3s = silêncio puro pra preparar o loop. |

## Master / mix final

- VO bus: comp 4:1 + de-esser + EQ low-shelf +2dB @ 100Hz, high-shelf -1dB @ 8kHz
- Sound design bus: -6 LUFS abaixo do VO
- Master: limiter brick-wall em -1 dBFS true peak, target integrated **-14 LUFS** (padrão Instagram/Reels)
- Stereo: VO mono center. Drone leve estéreo (Haas 12ms). Particle shimmers panning sutil L/R.

## Test before publishing

1. Headphones + telefone speaker — VO precisa estar inteligível em ambos.
2. Mute completo — Reel ainda comunica? (Sim, via Shot 4 + caption.)
3. Loop test: o silêncio do segundo 28 deve emendar suavemente no ruído branco do segundo 0.

## Linha proibida (NÃO usar)

Conforme [[../../../BRAND.md|BRAND.md §7]]:

- ❌ "Mude sua vida"
- ❌ "Lucros incríveis"
- ❌ "O que ninguém te conta"
- ❌ "Você não vai acreditar"
- ❌ "Garantido"
- ❌ "Explosivo / explodiu"
- ❌ Qualquer adjetivo superlativo emocional

## Links

- [[30telas-1decisao-20260505|Brief]]
- [[shotlist|Shotlist Higgs Field]]
- [[caption|Caption + hashtags]]
