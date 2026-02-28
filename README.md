# Trading Dashboard

Projeto Next.js (App Router) com TypeScript, Tailwind e shadcn/ui. Estética minimalista “Apple-like”: neutra, muito espaçamento, bordas e sombras sutis, tema claro/escuro.

## Como rodar

```bash
npm install
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

- **Landing:** `/` — headline, subtítulo e 2 CTAs (Dashboard e Aviso de risco).
- **Aviso de risco:** `/risk-disclaimer` — texto curto.
- **App:** `/app` — Dashboard (Trading Dashboard); `/app/alerts`, `/app/news`, `/app/journal`, `/app/settings` — placeholders.

## Estrutura

- `app/` — rotas e páginas (layout raiz + rotas do app).
- `components/` — `ui/` (Button, Card, Badge, Table, Separator, Dropdown) e `layout/` (Header).
- `lib/` — `utils.ts` (cn).

## Layout

- Header fixo: nome “Trading Dashboard” à esquerda; links Dashboard, Alerts, News, Journal, Settings à direita; toggle de tema (claro/escuro/sistema).
- Responsivo: grid 12 colunas no desktop, 1 coluna no mobile. Menu hambúrguer no mobile.

## Dashboard (/app)

Trading Dashboard em cards:

1. **Alertas recentes** — lista mock (5 itens + badges Ativo/Disparado/Pendente) + “Ver tudo”.
2. **Watchlist** — tabela mock (6 ativos com variação diária %) + “Ver tudo”.
3. **News** — lista mock (6 manchetes com fonte e horário) + “Ver tudo”.
4. **Resumo do Journal** — KPIs mock (Winrate, Payoff, Expectativa, # Trades) + “Ver tudo”.
5. **Calendário** — placeholder “Heatmap em breve”.

## Scripts

- `npm run dev` — desenvolvimento.
- `npm run build` — build de produção.
- `npm run lint` — ESLint.
- `npm start` — servir build de produção.
