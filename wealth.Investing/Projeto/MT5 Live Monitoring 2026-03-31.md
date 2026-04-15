# MT5 Live Monitoring

**Data:** 2026-03-31
**Status:** ✅ Completo
**Tier:** Ultra only (contas prop)

## O que foi feito

### 1. Fix Loading Infinito na Conexão MT5
- Deploy route retornava `ok: true` mesmo em erros → corrigido para `ok: false`
- Modal de conexão ficava em loop silencioso → agora falha imediatamente
- Timeouts reduzidos: DEPLOYING 2min, broker disconnect 90s, global 3min
- Auto-cleanup de conexões stuck: 10min → 3min

### 2. Sincronização de Trades (Paridade com Import Manual)
- Novo endpoint `POST /api/metaapi/sync-trades`
- Busca histórico de deals via MetaAPI Trading API
- Reconstrói trades pareando deals IN+OUT por positionId
- Salva em `journal_trades` no **exato mesmo formato** do import manual
- `external_source = "metaapi"` (import manual usa `"mt5"`)
- Dedup 3 camadas (cutoff date + bulk ID + constraint DB)
- Sync automático: após conexão + a cada 5min + botão manual
- Nova coluna: `metaapi_connections.last_trade_sync_at`

### 3. Dashboard ao Vivo
- Badge "Ao vivo" pulsante no seletor de contas
- Dashboard auto-refresh a cada 60s quando conta live ativa
- Badge "LIVE" verde em trades sincronizados no Journal
- Botão de sync manual + feedback no LiveMonitoringWidget

## Arquitetura

```
Frontend                          Backend                         MetaAPI
─────────                         ───────                         ───────
ConnectMetaApiModal ──POST──→ /api/metaapi/connect ──REST──→ Provisioning API
  │ polling 10s                                                    (criar conta)
  └──POST──→ /api/metaapi/deploy ──REST──→ Provisioning API
                                                                   (checar status)
  │ on success
  └──POST──→ /api/metaapi/sync-trades ──REST──→ Trading API
                                                                   (history deals)
                                  ↓ insert
                            journal_trades (Supabase)
                                  ↓ read
            Dashboard, Journal, Calendar, KPIs, Reports
```

## Tabelas Supabase
- `metaapi_connections` — lifecycle da conexão + `last_trade_sync_at`
- `live_equity_snapshots` — leituras periódicas
- `live_alert_configs` — thresholds de DD
- `live_alerts_log` — alertas (Realtime habilitado)
- `journal_trades` — trades sincronizados (mesma tabela do import manual)

## Commits
- `7cbbd59` fix: resolve infinite loading in MT5 connection flow
- `52283fc` feat: sync live MT5 trades to journal_trades via MetaAPI Trading API
- `f1da747` feat: live dashboard indicators and auto-refresh
- `43f0ce5` fix: batch bugfixes — connect/disconnect, account limits, paywall, pricing

## Links
- [[Roadmap]] — Fase 2.8
- [[Arquitetura]] — MetaAPI integration
- [[Audit Forense 2026-03-28]] — auditoria anterior
