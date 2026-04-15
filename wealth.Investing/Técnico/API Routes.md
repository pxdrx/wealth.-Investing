---
tags: [técnico, api, rotas, endpoints]
date: 2026-03-25
---

# API Routes

## Endpoints

### News/Macro
| Rota | Método | Auth | Função |
|------|--------|------|--------|
| `/api/news` | GET | — | News proxy (ISR, 5min revalidate) |
| `/api/macro/calendar` | GET | Bearer | Eventos econômicos |
| `/api/macro/rates` | GET | Bearer | Taxas de juros |
| `/api/macro/headlines` | GET | Bearer | Headlines ao vivo |
| `/api/macro/briefing` | GET/POST | Bearer | Briefing semanal |

### Journal
| Rota | Método | Auth | Função |
|------|--------|------|--------|
| `/api/journal/import-mt5` | POST | Bearer | Import MT5 (XLSX/HTML) |

### Webhooks
| Rota | Método | Auth | Função |
|------|--------|------|--------|
| `/api/webhooks/tradingview` | POST | timing-safe secret | TradingView alerts |
| `/api/webhooks/stripe` | POST | Stripe signature | Billing events |

### AI
| Rota | Método | Auth | Função |
|------|--------|------|--------|
| `/api/ai-coach` | POST | Bearer + tier check | AI Coach SSE |

### Billing
| Rota | Método | Auth | Função |
|------|--------|------|--------|
| `/api/stripe/checkout` | POST | Bearer | Criar checkout session |
| `/api/stripe/portal` | POST | Bearer | Customer portal redirect |

## Auth Pattern

```typescript
// Extrair Bearer token
const token = req.headers.get("Authorization")?.replace("Bearer ", "");
// Criar client autenticado
const supabase = createSupabaseClientForUser(token);
```

## Response Pattern

```json
{ "ok": true, "data": {...} }
{ "ok": false, "error": "mensagem" }
```

## Webhook Security

- TradingView: `crypto.timingSafeEqual()` para comparação de secret
- Stripe: Verificação de assinatura do webhook

Ver: [[Supabase Schema]], [[Auth Flow]]

#técnico #api #rotas


## Analista Dexter
- `POST /api/analyst/run` — SSE streaming, análise completa de ativo
- `GET /api/analyst/history` — histórico de análises do user
- `DELETE /api/analyst/history?id=` — excluir análise

Ver [[Funcionalidades/Analista de Ativos|Analista Dexter]] para detalhes.