# NeonPay — Assinaturas

Integração com gateway NeonPay para planos MONTHLY e ANNUAL.

## Variáveis de ambiente

| Variável | Obrigatório | Descrição |
|----------|-------------|-----------|
| `NEONPAY_API_KEY` | Sim | Chave da API NeonPay |
| `NEONPAY_WEBHOOK_SECRET` | Sim (webhook) | Secret para validar `x-neon-digest` |
| `NEONPAY_PRICE_ID_MONTHLY` | Recomendado | SKU/produto mensal (default: `mrkt-edge-monthly`) |
| `NEONPAY_PRICE_ID_ANNUAL` | Recomendado | SKU/produto anual (default: `mrkt-edge-annual`) |
| `NEONPAY_SUCCESS_URL_BASE` | Opcional | Base da URL de sucesso (ex: `https://app.example.com`) |
| `NEONPAY_CANCEL_URL_BASE` | Opcional | Base da URL de cancelamento |
| `NEONPAY_API_BASE` | Opcional | Base da API (default: `https://api.neonpay.com`) |

## Endpoints

- `POST /api/subscriptions` — body: `{ "plan": "MONTHLY"|"ANNUAL", "user_email": "..." }` → retorna `redirect_url`
- `GET /api/subscriptions/me` — header `X-User-Email` → retorna `{ subscription: { plan, status, current_period_end } }`
- `POST /api/subscriptions/cancel` — header `X-User-Email` → cancela assinatura atual
- `POST /webhooks/neonpay` — webhook NeonPay; validar `x-neon-digest` (HMAC-SHA256)

## Testes

Requer `pytest`. Na raiz do backend:

```bash
pip install pytest
python -m pytest tests/test_neonpay_subscriptions.py -v
```

Se qualquer teste falhar, a build deve falhar.
