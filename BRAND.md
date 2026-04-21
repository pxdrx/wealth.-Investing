# BRAND.md — wealth.Investing

> Este arquivo é a fonte de verdade da identidade visual e de comunicação da marca wealth.Investing.
> O Claude Code deve ler e seguir este documento ao gerar qualquer conteúdo visual, copy, ou componente relacionado à marca.

---

## 1. Essência da marca

**Nome oficial:** wealth.Investing  
**Tagline:** *Ferramentas profissionais. Decisões precisas.*  
**Missão:** Dar ao trader ativo acesso a uma plataforma de análise e gestão de portfólio de nível institucional — limpa, rápida, sem ruído.

**Personalidade:**
- Preciso, não pedante
- Confiante, não arrogante
- Direto, não frio
- Sofisticado, não inacessível

**O que a marca NÃO é:**
- Não é "dica de investimento" para iniciantes
- Não é hype ou análise sensacionalista
- Não usa linguagem de coach financeiro ou motivacional
- Não usa emojis em excesso ou linguagem informal

---

## 2. Paleta de cores

### Cores principais

| Token | Hex | Uso |
|---|---|---|
| `--brand-black` | `#0A0A0A` | Fundos escuros, textos em contraste |
| `--brand-white` | `#FFFFFF` | Fundo principal (modo light) |
| `--brand-off-white` | `#F7F6F3` | Fundo de cards e superfícies |
| `--brand-accent` | `#1A1A1A` | Tipografia primária, bordas principais |
| `--brand-muted` | `#6B6B6B` | Texto secundário, labels, metadados |
| `--brand-subtle` | `#D4D2CB` | Bordas, divisores, backgrounds sutis |

### Cor de destaque (única cor vibrante da marca)

| Token | Hex | Uso |
|---|---|---|
| `--brand-green` | `#00B37E` | Variação positiva, lucro, CTAs, destaques |
| `--brand-green-light` | `#E6F9F3` | Background de badges positivos |
| `--brand-red` | `#E03E3E` | Variação negativa, perda, alertas |
| `--brand-red-light` | `#FDECEC` | Background de badges negativos |

### Regras de uso de cor
- O fundo padrão de qualquer post/slide é `#FFFFFF` ou `#F7F6F3`
- O verde (`#00B37E`) é reservado **somente** para dados financeiros positivos ou um único elemento CTA por composição
- Nunca usar gradientes decorativos — cores sólidas e flatvas apenas
- Máximo de 3 cores por composição visual
- Gráficos: `#1A1A1A` para linhas neutras, `#00B37E` para ganho, `#E03E3E` para perda

---

## 3. Tipografia

### Hierarquia tipográfica

| Nível | Fonte | Peso | Tamanho (Instagram 1080px) | Uso |
|---|---|---|---|---|
| Display | Inter | 700 | 72–96px | Números grandes, métricas principais |
| Heading 1 | Inter | 600 | 48–56px | Título do post/slide |
| Heading 2 | Inter | 500 | 32–36px | Subtítulo, seção |
| Body | Inter | 400 | 20–24px | Texto corrido, descrições |
| Caption | Inter | 400 | 16–18px | Labels, metadados, fontes |
| Tag/Badge | Inter | 500 | 14–16px | Labels de categoria, status |

### Regras tipográficas
- **Fonte principal:** Inter (Google Fonts) — fallback: `-apple-system, sans-serif`
- Sempre usar sentence case (nunca ALL CAPS em parágrafos, apenas em badges pequenos)
- Tracking (letter-spacing): `-0.02em` para headings, `0` para body
- Line-height: `1.2` para headings, `1.6` para body
- Nunca usar mais de 2 pesos tipográficos por composição

---

## 4. Grid e layout para Instagram (1080×1080px)

### Especificações base
- **Formato:** 1080×1080px (feed) e 1080×1350px (portrait feed)
- **Safe zone:** 80px de margem em todos os lados
- **Área útil feed:** 920×920px
- **Gutter interno:** 32px entre elementos

### Sistema de grid
```
┌─────────────────────────────────┐
│  ←80px→                  ←80px→│
│                                 │
│  ┌─────────────────────────┐    │
│  │   ÁREA ÚTIL 920×920     │    │
│  │                         │    │
│  │                         │    │
│  └─────────────────────────┘    │
│                                 │
└─────────────────────────────────┘
```

### Logo placement
- Sempre no canto superior esquerdo da safe zone
- Tamanho: 120px de largura máxima
- Versão texto: "wealth.Investing" em Inter 500, 18px, cor `#1A1A1A`
- Separado do conteúdo por pelo menos 32px

---

## 5. Componentes visuais recorrentes

### Card de métrica
```
┌──────────────────────────┐
│  LABEL (caption)         │
│  +12.4%  (display, green)│
│  Descrição (body)        │
└──────────────────────────┘
- Fundo: #FFFFFF
- Borda: 1px solid #D4D2CB
- Border-radius: 12px
- Padding: 24px
```

### Badge de categoria
```
[ ANÁLISE TÉCNICA ]
- Fundo: #1A1A1A
- Texto: #FFFFFF
- Font: Inter 500, 13px, uppercase
- Border-radius: 4px
- Padding: 4px 10px
```

### Linha de separação
```
────────────────────
- Cor: #D4D2CB
- Espessura: 1px
- Nunca usar como decoração — apenas como divisor funcional
```

### Gráfico de linha (sparkline)
- Stroke: 2px
- Cor positiva: `#00B37E`
- Cor negativa: `#E03E3E`
- Fundo: transparente ou `#F7F6F3`
- Sem eixos visíveis em posts (apenas em componentes de app)
- Área sob a curva: fill com 10% de opacidade da cor da linha

---

## 6. Templates de posts para Instagram

### Template A — Métrica/Dado único
```
[Logo]                    [Badge categoria]
 
 
       NÚMERO GRANDE / HEADLINE
 
       Descrição curta em uma linha
 
 
[Data ou fonte]
```

### Template B — Carrossel educativo (slide 1 = capa)
```
[Logo]
 
 
  TÍTULO DO CARROSSEL
  (max 6 palavras)
 
  Subtítulo em uma linha
 
 
  ● ○ ○ ○ ○  (indicador de slides)
```

### Template C — Carrossel educativo (slides internos)
```
[n/N]                    [Logo pequeno]
 
  Heading do ponto
 
  Body text — máximo 3 linhas
  por slide. Conciso e direto.
 
  [ Dado ou visual de suporte ]
```

### Template D — Slide de conclusão/CTA
```
[Logo]
 
 
  Key takeaway em uma linha
 
  ─────────────────────────
 
  Siga para mais análises
  @wealth.investing
 
 
```

---

## 7. Tom de voz e copy

### Princípios gerais
- **Dados antes de opinião** — toda afirmação deve ser sustentada por um número ou contexto
- **Direto ao ponto** — a primeira frase já entrega o valor; zero preâmbulo
- **Sem sensacionalismo** — não usar palavras como "INCRÍVEL", "CHOCANTE", "você não vai acreditar"
- **Autoridade pela precisão** — mostrar que se domina o tema sendo específico, não usando jargões desnecessários

### Estrutura padrão de copy

**Headline:** afirmação ou dado diretamente relevante para o trader ativo  
**Corpo:** contexto, dados de suporte, mecanismo (o "porquê")  
**Encerramento:** takeaway claro ou próximo passo

### Exemplos de tom

❌ **Não usar:**
> "O mercado EXPLODIU hoje! Você precisa ver isso! 🚀🚀"

✅ **Usar:**
> "Bitcoin +8,4% nas últimas 24h. Volume 40% acima da média de 30 dias — sinal de liquidez institucional entrando."

---

❌ **Não usar:**
> "5 dicas INCRÍVEIS para você lucrar mais nos seus trades!"

✅ **Usar:**
> "5 métricas que traders profissionais monitoram antes de entrar em qualquer posição."

---

### Hashtags (Instagram)
Máximo 8 hashtags por post. Sempre no primeiro comentário, nunca na legenda.

**Pool de hashtags da marca:**
```
#trading #investimentos #mercadofinanceiro #trader #analisetecnica 
#forex #cripto #bolsadevalores #gestaoderisco #wealthinvesting
```

---

## 8. Regras de geração de conteúdo para o Claude Code

Quando o CC for gerar qualquer ativo visual ou copy para a wealth.Investing:

1. **Sempre importar este arquivo** como contexto antes de gerar qualquer HTML/CSS de slide
2. **Usar as variáveis CSS** definidas na seção 2 — nunca hardcodar cores
3. **Dimensões padrão** para posts: `1080px × 1080px` com `80px de padding`
4. **Fonte:** Inter via Google Fonts (`https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap`)
5. **Nunca gerar** conteúdo de "dica rápida para enriquecer" — apenas análise, ferramentas, métricas
6. **Para carrosséis:** gerar cada slide como um `<div>` separado de 1080×1080px dentro de um wrapper; o Puppeteer faz o screenshot de cada um individualmente
7. **Screenshot via Puppeteer:** usar `deviceScaleFactor: 2` para output 2x (2160×2160px) — mais nítido para Instagram

---

## 9. Identidade em código (CSS variables)

Adicionar ao topo de qualquer HTML gerado para posts:

```css
:root {
  --brand-black: #0A0A0A;
  --brand-white: #FFFFFF;
  --brand-off-white: #F7F6F3;
  --brand-accent: #1A1A1A;
  --brand-muted: #6B6B6B;
  --brand-subtle: #D4D2CB;
  --brand-green: #00B37E;
  --brand-green-light: #E6F9F3;
  --brand-red: #E03E3E;
  --brand-red-light: #FDECEC;

  --font-primary: 'Inter', -apple-system, sans-serif;

  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 20px;

  --slide-size: 1080px;
  --slide-padding: 80px;
  --gutter: 32px;
}
```

---

## 10. Checklist de aprovação antes de postar

Antes de publicar qualquer conteúdo no Instagram da wealth.Investing:

- [ ] Logo presente e legível
- [ ] Dados/números verificados e com fonte
- [ ] Máximo 3 cores por composição
- [ ] Tipografia usa apenas Inter (400, 500, 600 ou 700)
- [ ] Sem gradientes decorativos
- [ ] Copy direto — sem sensacionalismo
- [ ] Hashtags no comentário, não na legenda
- [ ] Imagem exportada em 2× (mínimo 1080×1080px)

---

## Dexter — mascote

Dexter é o mascote pixel-art da wealth.Investing. Blob 16×16 em tons de esmeralda (paleta Terminal de A-01), com expressões discretas que traduzem o estado do produto sem virar emoji.

**Componente:** `import { Dexter } from "@/components/brand"` — uso: `<Dexter mood="thinking" size={32} animated />`.

**Moods (7):**

| mood | quando usar |
|---|---|
| `default` | estado padrão / avatar idle |
| `thinking` | loading de análise, "Dexter está lendo seu trade…" |
| `analyzing` | processamento pesado, cálculo de risco, backtests |
| `celebrating` | trade vencedor, meta batida, milestone de prop firm |
| `alert` | aviso crítico, drawdown próximo do limite, regra violada |
| `sleeping` | área offline, feriado de mercado, sem dados do dia |
| `offline` | conta desconectada, corretora fora do ar, estado desabilitado |

**Tamanhos:** 16 (inline com texto), 24 (chips), 32 (avatar padrão), 48 (header/empty state). SVGs são gerados em grid 16×16 — sempre manter múltiplos inteiros e `imageRendering: pixelated` (o componente já aplica) para evitar blur.

**Animação:** opcional via `animated` — bob vertical de 6% a cada 2.4s. Respeita `prefers-reduced-motion`. Use só em estados ativos (loading, celebrating); evite em listas longas.

**Geração:** `node scripts/generate-dexter.mjs` lê os grids no topo do arquivo e reescreve `public/dexter/*.svg`. Não editar SVGs à mão; ajustar grids e rodar o script.

**Paleta (do script):** `#0B0E0C` void • `#064E3B` emerald-900 • `#047857` emerald-700 • `#10B981` emerald-500 • `#6EE7B7` emerald-300 • `#F0C000` amber (só `alert`).

---

## Ultra primitives — `<UltraBadge />` e `<UltraLock active />`

Primitivos visuais de marca para sinalizar superfícies Ultra. **Puro visual, sem contexto de subscription.** O consumidor decide *quando* aplicar — os componentes só pintam a marca.

Para **gating ciente do tier** (lê `SubscriptionContext`, bloqueia com base no plano do usuário), continue usando `components/billing/PaywallGate.tsx` e `components/billing/SubscriptionBadge.tsx`. Esses dois ficam na camada de dados; os primitivos aqui estão na camada de marca.

### `<UltraBadge />`

Marca "ULTRA" inline — tipografia mono (brutalist), `uppercase`, `tracking-wider`, cantos retos.

```tsx
import { UltraBadge } from "@/components/brand";

<UltraBadge />                                      // solid / md (padrão)
<UltraBadge variant="outline" size="sm" />           // para nav items
<UltraBadge variant="ghost" size="lg" />             // para hero/pricing
<UltraBadge icon={null} label="ULTRA ONLY" />        // sem ícone, label custom
```

**Props:** `size` (`sm` | `md` | `lg`), `variant` (`solid` | `outline` | `ghost`), `label`, `icon` (`LucideIcon` | `null`), `className`.

**Quando usar:** ao lado do nome de uma feature que exige Ultra (sidebar, cards de pricing, título de uma página bloqueada). Não use dentro de frases corridas — é um rótulo, não uma palavra.

**Do / Don't:**
- ✅ Use `outline` em sidebar nav para não competir com hover/selected.
- ✅ Use `solid` em hero/pricing para afirmar o tier.
- ❌ Não pinte com cores de PnL (`--pnl-positive/negative`) — Ultra não é sobre resultado.
- ❌ Não anime o badge. Estático. Quem precisa de movimento é o `<Dexter />`.

### `<UltraLock active />`

Wrapper que cobre os filhos com uma camada dashed brutalist + ícone de cadeado + `<UltraBadge variant="outline" />` + hint opcional + CTA opcional. Quando `active={false}`, não renderiza overlay (zero overhead de DOM).

```tsx
import { UltraLock } from "@/components/brand";

// Bloqueando um card inteiro
<UltraLock active={!isUltra} cta={{ label: "Ver planos", href: "/pricing" }}>
  <AdvancedReportsCard />
</UltraLock>

// Com labels custom
<UltraLock
  active
  label="MT5 Live"
  hint="Streaming em tempo real é Ultra."
  cta={{ label: "Desbloquear", onClick: handleUpgrade }}
>
  <MT5LiveWidget />
</UltraLock>

// Passthrough quando não está ativo — sem wrapper visível
<UltraLock active={false}>
  <FreeFeature />
</UltraLock>
```

**Props:** `active` (boolean, obrigatório), `children`, `label`, `hint`, `cta` (`{ label, href?, onClick? }`), `blur` (`sm` | `md` | `lg`), `className`.

**Anatomia do overlay:**
```
┌─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┐
│   [✨ ULTRA]                  │   ← <UltraBadge size="sm" outline />
│       🔒                      │   ← Lock icon, 28px, cor primary
│   ULTRA                       │   ← label (mono, uppercase)
│   Desbloqueie com o plano     │   ← hint (muted-foreground)
│                               │
│     [ Ver planos ]            │   ← CTA opcional
└─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┘
```

**A11y:**
- Filhos recebem `aria-hidden` + `inert` quando `active` — foco por tab não entra no conteúdo borrado.
- Overlay tem `role="status"` + `aria-live="polite"` + `aria-label` consolidado.
- Animação de entrada só em `motion-safe` (respeita `prefers-reduced-motion`).

**Do / Don't:**
- ✅ Envolva apenas o conteúdo gated, não a página inteira.
- ✅ Use `blur="sm"` para cards pequenos, `md` padrão, `lg` para áreas grandes.
- ❌ Não aninhe `<UltraLock>` dentro de `<UltraLock>`.
- ❌ Não use para paywalls que exigem lógica de negócio — use `PaywallGate` da camada billing.

**Textos padrão:** vêm de `lib/brand/voice.ts` (`voice.upgrade.ultraBadge` / `ultraLocked` / `ultraLockedHint`). Bilíngue (pt/en) — o componente usa `pt` por padrão; passe `label`/`hint` se quiser outra coisa.

---

## ThemeToggle — 3 estados: Light / Terminal / System

`<ThemeToggle />` é o seletor de tema de marca. Três estados: **Light**, **Terminal** (o dark brutalist de A-01) e **System** (segue OS).

"Terminal" é o nome brand do tema escuro — internamente mapeia para `setTheme("dark")` no `ThemeProvider` existente em `components/theme-provider.tsx`. Nenhum provider novo, nenhuma migração.

```tsx
import { ThemeToggle } from "@/components/brand";

<ThemeToggle />                          // segmented (padrão) — pt
<ThemeToggle variant="icon" />           // dropdown compacto pra navbar
<ThemeToggle locale="en" />              // labels em inglês
```

**Props:** `variant` (`"segmented"` | `"icon"`, padrão `"segmented"`), `locale` (`"pt"` | `"en"`, padrão `"pt"`), `className`.

**Variantes visuais:**
- `segmented` — 3 botões lado a lado dentro de um container com border. Use em páginas de configuração, forms de preferência, onde há espaço horizontal.
- `icon` — um botão ícone no `DropdownMenu`. Use em topbar/navbar.

**Estilo brutalist:**
- Tipografia mono, `uppercase`, `tracking-wider`, tamanho `text-[11px]`
- Cantos retos (`rounded-sm`), sem pills
- Ícones lucide: `Sun` (Light), `Terminal` (Terminal), `Monitor` (System)
- Estado ativo: fundo `--background`, sombra sutil; inativo: `--muted-foreground`

**A11y:**
- `role="radiogroup"` + `aria-label` no container; `role="radio"` + `aria-checked` em cada opção (variante segmented)
- `aria-label` + `sr-only` no trigger (variante icon); `aria-pressed` em cada item do menu
- Foco visível via `focus-visible:ring-2`

**Do / Don't:**
- ✅ Use `variant="icon"` em topbars densas.
- ✅ Use `variant="segmented"` em `/settings` ou onboarding, onde o usuário está escolhendo ativamente.
- ❌ Não adicione um 4º estado (ex.: "Dark" separado de "Terminal"). Terminal é o dark da marca.
- ❌ Não chame `setTheme("terminal")` direto no provider — o mapeamento é responsabilidade do `<ThemeToggle />`.

**Coexistência com `components/theme-toggle.tsx`:** esse componente legado continua funcionando (labels "Claro/Escuro/Sistema"). Consumidores (Tracks B/C) podem migrar para `@/components/brand#ThemeToggle` quando quiserem a linguagem de marca. Nenhum breaking change.

**Textos padrão:** `lib/brand/voice.ts` → `voice.theme.{label,light,terminal,system}` (pt+en).

---

*Última atualização: Abril 2026*  
*Mantenha este arquivo atualizado conforme a marca evolui.*
