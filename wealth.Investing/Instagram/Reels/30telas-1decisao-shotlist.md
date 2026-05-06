---
tags: [instagram, reels, shotlist, higgsfield, dexter]
slug: 30telas-1decisao-20260505
date: 2026-05-05
modelo: Higgs Field — Mix-1 / DoP-1 (text-to-video + image-to-video)
saida_por_shot: 1080x1920, 5s, 24fps, mp4 H.264
---

# Shotlist — "30 Telas → 1 Decisão"

> Cole cada bloco abaixo direto no `higgsfield-cli` (ou rode `node scripts/generate-reel-30telas.mjs` que envia todos em sequência). Prompts em **inglês** (input nativo do modelo). Estilo travado para garantir continuidade visual entre shots.

## Estilo global (sempre incluir como sufixo do prompt)

```
cinematic, anamorphic 35mm, shallow depth of field, volumetric haze,
24fps, color grade: cool teal shadows + warm desaturated highlights,
Kodak Vision3 500T film stock, no on-screen text unless specified,
no captions, no watermark, photoreal, no cartoon, no illustration
```

## Negative prompt global (rejeitar artefatos comuns)

```
text overlay, captions, subtitle, logo watermark, generated text artifacts,
warped hands, extra fingers, distorted face, oversaturated, neon arcade,
sci-fi spaceship, futuristic helmet, cyberpunk, motion blur smear,
plastic skin, uncanny valley
```

---

## Shot 1 — HOOK (0–5s) · text-to-video

**Câmera:** dolly push-in lento, low angle, atrás do trader.
**Mood:** sublime, sagrado, opressivo.
**Duração:** 5s.

```
A lone male trader silhouette in his late 30s sits in a dim home office,
back to camera, facing a curved wall of 30 stacked monitors arranged in
a 6x5 grid. Each screen flickers with chaotic financial data: candlestick
charts, scrolling Bloomberg-style news tickers, heat maps pulsing red and
green, a central bank press conference paused mid-frame, an economic
calendar with multiple rows highlighted, oil price graphs spiking. The
room is otherwise dark. Volumetric haze diffuses the screen glow. A single
warm desk lamp throws a soft amber halo on the trader's shoulders.
Camera: slow dolly push-in from behind, low angle. No on-screen text.
[GLOBAL STYLE]
```

**Aceite:** Se o modelo render uma sala futurista / sci-fi / cyberpunk, **rejeitar** e regenerar com mais ênfase em "home office, modest, realistic, contemporary 2026".

---

## Shot 2 — AUTORIDADE (5–10s) · text-to-video

**Câmera:** lateral tracking shot lento (esquerda → direita), seguindo o cursor.
**Mood:** cirúrgico, preciso, calmo.
**Duração:** 5s.

```
Continuing the same scene: same trader, same monitor wall. A single thin
emerald-green cursor (hex #00B37E, 2px stroke, no glow halo) appears in
the corner of the upper-left monitor and begins to glide screen to screen
with surgical precision, jumping diagonally across the grid. As the cursor
passes each monitor it briefly underlines one specific data point — a Fed
dot plot value, a DXY level reading "104.32", a COT positioning bar, an
RSI divergence on a candlestick chart — and that data point lights up
white and lifts off the screen as a small luminous particle, the size of
a firefly. The chaotic background data continues underneath but slightly
dimmed. Camera: slow lateral tracking shot following the cursor's path.
[GLOBAL STYLE]
```

**Aceite:** O cursor deve ser **fino e silencioso**, não um laser pulsante. Se o modelo desenhar um "scanner ray" tipo Tron, regenerar.

---

## Shot 3 — TENSÃO (10–15s) · text-to-video

**Câmera:** orbit 90° anti-horário ao redor do trader.
**Mood:** suspensa, contemplativa.
**Duração:** 5s.

```
Continuing the same scene: dozens of luminous white particles of data
extracted from the screens drift through the air toward the trader,
forming a slow-orbiting constellation around his head and upper torso.
Each particle is a tiny floating fragment of text or number, barely
legible. The 30 monitors continue to flicker chaotically in the background,
slightly out of focus. The emerald-green cursor (#00B37E) pulses at the
center of the constellation like a slow heartbeat. Camera: smooth orbit
90 degrees counter-clockwise around the trader, finally revealing his
face for the first time — calm, attentive, no fear, eyes tracking a
particle. Volumetric god rays through the haze.
[GLOBAL STYLE]
```

**Aceite:** Rosto do trader deve estar **calmo, NÃO impressionado**. Se o modelo render expressão de "uau" ou medo, regenerar com "neutral expression, slight micro-smile, professional composure".

---

## Shot 4 — SÍNTESE (15–20s) · text-to-video

**Câmera:** push-in rápido no monitor central até preencher o frame.
**Mood:** resolução, silêncio depois da tempestade.
**Duração:** 5s.

```
The orbiting particles suddenly accelerate inward and converge into the
single central monitor. The chaotic data on that one screen wipes clean
to pure white (#FFFFFF) and is replaced by a minimalist Apple-style
verdict card. The card layout, top to bottom:

  - small uppercase tag "TRADING" in black on light gray pill
  - large heading "EURUSD" in Inter 600, 72px, color #1A1A1A
  - thin emerald accent bar (#00B37E) on the left edge, full card height
  - three monospaced lines:
      "Entry  1.0850"
      "Stop   1.0820"
      "Target 1.0920"
  - subtle wordmark "wealth.investing" in Inter 500, 18px,
    color #6B6B6B, bottom-right corner

The 29 surrounding monitors begin to dim. Camera: fast push-in onto the
central monitor until the verdict card fills the entire frame. The
transition from chaos to card happens at the 1.5s mark of the shot.
Mood: resolution, the silence after a storm.
[GLOBAL STYLE]
```

**Aceite crítico:** O texto da card precisa estar **legível e sem garbled letters** (modelos de vídeo IA são notoriamente ruins com texto). Se sair ilegível, **plano B**: gerar a card como still PNG fora do Higgs Field (HTML+screenshot) e compor por cima do output em pós-produção.

---

## Shot 5 — PAYOFF (20–24s) · text-to-video

**Câmera:** locked, leve rack focus do monitor pra face do trader.
**Mood:** quietude, peso liberado.
**Duração:** 4s.

```
Reverse wide shot from inside the monitor wall looking back at the trader,
who is seated in his chair in three-quarter profile. 29 of the 30 monitors
fade to black one by one in a wave pattern, starting from the periphery
and moving inward. Only the central monitor remains lit, displaying the
clean verdict card from the previous shot, now visible from behind so its
glow rim-lights the back of the trader's head and shoulders with a soft
white halo. The trader leans back slowly in his chair and exhales. The
room is now dim and silent. Camera: locked off, slight rack focus pulling
from the screen to the trader's face at the 2.5s mark.
[GLOBAL STYLE]
```

**Aceite:** O fade dos monitores deve ser **wave-like**, não simultâneo. Se sair tudo apagando junto, regenerar.

---

## Shot 6 — CTA (24–28s) · image-to-video

**Câmera:** parallax push-in muito sutil.
**Mood:** product-shot Apple-keynote.
**Duração:** 4s.
**Modo:** image-to-video (input = screenshot real do app).

### Como gerar a imagem de input

1. Subir o app local (`npm run dev`).
2. Logar com conta Ultra ou Mentor.
3. Ir em `/app/dexter/analyst`, digitar `EURUSD`, rodar análise (≈ 30s).
4. No DevTools, modo responsivo 1080×1920.
5. Screenshot do bloco "Veredito" + "Ideia de Trade" + "Níveis Chave" (Verdict + Trade Idea + Key Levels do `ReportDisplay`), recortado em proporção 9:16, fundo `#F7F6F3`.
6. Salvar em `reels-output/30telas/inputs/shot6-verdict-card.png`.

### Prompt

```
INPUT IMAGE: reels-output/30telas/inputs/shot6-verdict-card.png

PROMPT:
Subtle parallax push-in on the report card UI. The emerald status pulse
(small dot, top-left of the verdict block, color #00B37E) animates one
single soft pulse at the 1.5s mark of the shot. The card sits centered on
a soft cream background (#F7F6F3). Hold steady for 2s. At the 2.5s mark,
the wealth.investing wordmark fades in below the card in Inter 500 at
20px, color #1A1A1A, with a thin emerald (#00B37E) underline that draws
itself left to right over 0.4s. No motion blur, no zoom past 1.05x.
Clean product-shot energy, like an Apple keynote close.
[GLOBAL STYLE — but override with: photoreal UI, no film grain]
```

**Aceite:** Texto da UI **não pode ser regenerado** pelo modelo — se ele tentar reescrever os labels, ativar modo "preserve_text=true" no CLI (ou similar) ou diminuir motion strength.

---

## Pós-produção (CapCut / DaVinci)

1. Importar `shot-1.mp4` … `shot-6.mp4` na timeline 28s.
2. Ajustar in/out points pra encaixar exatamente no shape de [[30telas-1decisao-20260505|brief]].
3. Aplicar transições **cut seco** entre shots — zero crossfade, zero whoosh visual.
4. Importar VO stems de [[vo|VO script]] e alinhar nos timestamps.
5. Sound design conforme [[vo|VO script §sound design]].
6. Color grade final: leve crush nos pretos, saturação -10, vinheta sutil (apenas se necessário).
7. Texto Shot 4 (verdict card): se sair garbled do Higgs, sobrepor PNG estático com mask animada.
8. Loop test: comparar último frame de Shot 5 com primeiro frame de Shot 1 — ajustar fade-out de 4 frames se cortar feio.
9. Export: H.264, 1080×1920, 30fps (Reels prefere 30 mesmo gravando em 24), bitrate 12 Mbps, ≤ 30 MB.

## Plano B (se Higgs Field não entregar qualidade)

- **Shot 1, 2, 3, 5:** trocar Higgs por Veo 3 ou Sora 2 — mesmos prompts.
- **Shot 4:** sempre composição PNG + after-effects, nunca confiar texto cru no modelo.
- **Shot 6:** screen recording real da UI com easing CSS aplicado é alternativa zero-IA.

## Links

- [[30telas-1decisao-20260505|Brief]]
- [[vo|VO script PT-BR]]
- [[caption|Caption + hashtags]]
- `scripts/generate-reel-30telas.mjs`
