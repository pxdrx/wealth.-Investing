# Relatório de Auditoria — Banco Real Supabase × Código

**Fase:** Auditoria exclusiva do banco real e compatibilidade schema/policies × código.  
**Regra:** Nenhuma alteração aplicada (nem banco, nem código, nem migration).

---

## 1. Resumo executivo

### 1.1 Objetivo da fase

Validar no banco real do Supabase tudo o que relatórios anteriores marcaram como **não confirmado** ou **risco de incompatibilidade**, antes de qualquer nova correção no app.

### 1.2 Limitação de execução

**Não foi possível executar queries diretamente no Supabase a partir deste ambiente.** Motivos:

- Não há ferramenta MCP (run_sql / get_schema) disponível para o projeto Supabase.
- Não há migrações ou dumps de schema no repositório.
- A conexão ao projeto Supabase (URL/anon key) é de uso em runtime do app, não exposta para execução de SQL de auditoria neste contexto.

Por isso, todos os itens que dependem de **leitura do schema real** estão marcados como **NÃO FOI POSSÍVEL VALIDAR** até que as queries de inspeção sejam executadas no Supabase (SQL Editor ou script local).

### 1.3 O que foi entregue

1. **Relatório completo** (este documento): estrutura tabela por tabela, colunas exigidas pelo código vs colunas a preencher com o real, constraints/índices, RLS/policies, incompatibilidades potenciais, prioridade e plano de ação.
2. **Script SQL de auditoria** (`docs/sql/audit-supabase-schema.sql`): queries prontas para rodar no **Supabase → SQL Editor**. Ao executar e colar os resultados (ou compartilhar o output), cada item pode ser marcado como **CONFIRMADO**, **INCOMPATÍVEL** ou **NÃO EXISTE** numa próxima passagem.

### 1.4 Status geral (pré-execução do SQL)

| Tabela            | Colunas/constraints | RLS/Policies | Status atual          |
|-------------------|---------------------|--------------|------------------------|
| profiles          | —                   | —            | NÃO FOI POSSÍVEL VALIDAR |
| accounts          | —                   | —            | NÃO FOI POSSÍVEL VALIDAR |
| prop_accounts     | —                   | —            | NÃO FOI POSSÍVEL VALIDAR |
| journal_trades    | —                   | —            | NÃO FOI POSSÍVEL VALIDAR |
| prop_payouts      | —                   | —            | NÃO FOI POSSÍVEL VALIDAR |
| wallet_transactions | —                 | —            | NÃO FOI POSSÍVEL VALIDAR |
| ingestion_logs    | —                   | —            | NÃO FOI POSSÍVEL VALIDAR |

---

## 2. Tabela por tabela

Para cada tabela: (A) colunas **exigidas pelo código** (select/insert/upsert/eq); (B) colunas **reais** (a preencher após rodar o SQL); (C) constraints/índices exigidos vs reais; (D) RLS/policies exigidas vs reais; (E) status por ponto crítico.

---

### 2.1 `profiles`

**Colunas exigidas pelo código**

| Coluna        | Uso no código                          | Obrigatório |
|---------------|----------------------------------------|-------------|
| id            | SELECT, UPSERT; onConflict: "id"        | Sim         |
| display_name  | SELECT, UPSERT                         | Sim (pode NULL) |

**Colunas reais (preencher após SQL)**  
*Aguardando execução do script de auditoria.*

**Constraints/índices exigidos**

- PK ou UNIQUE em `id` (para upsert por `id`).

**Constraints/índices reais**  
*Aguardando execução do script.*

**RLS / policies exigidas**

- SELECT: usuário autenticado pode ler linha onde `id = auth.uid()`.
- INSERT/UPDATE: usuário pode inserir/atualizar própria linha (`id = auth.uid()`).
- Sem isso: login/onboarding (leitura e upsert de display_name) podem falhar.

**RLS/policies reais**  
*Aguardando execução do script.*

**Pontos críticos a confirmar**

| Item                              | Status                   | Observação |
|-----------------------------------|--------------------------|------------|
| Existe coluna `id`                | NÃO FOI POSSÍVEL VALIDAR | —          |
| Existe coluna `display_name`      | NÃO FOI POSSÍVEL VALIDAR | —          |
| `id` é PK ou UNIQUE               | NÃO FOI POSSÍVEL VALIDAR | —          |
| Upsert por `id` funciona          | NÃO FOI POSSÍVEL VALIDAR | Depende de PK/UNIQUE em `id` |

---

### 2.2 `accounts`

**Colunas exigidas pelo código**

| Coluna     | Uso no código                    | Obrigatório |
|------------|----------------------------------|-------------|
| id         | SELECT (retorno), não no INSERT  | Sim (gerado) |
| user_id    | SELECT/INSERT, filtro em todos   | Sim         |
| name       | SELECT, INSERT                  | Sim         |
| kind       | SELECT, INSERT; valores prop/personal/crypto | Sim |
| is_active  | SELECT, INSERT                  | Sim         |
| created_at | SELECT (ordenação em lib/accounts) | Sim      |

**Colunas reais (preencher após SQL)**  
*Aguardando execução do script.*

**Constraints/índices exigidos**

- PK em `id`.
- Nenhuma UNIQUE assumida pelo código (múltiplas contas com mesmo nome por user são aceitas).

**RLS exigida**

- SELECT/INSERT: usuário só acessa linhas com `user_id = auth.uid()`.

**Pontos críticos a confirmar**

| Item                                      | Status                   |
|-------------------------------------------|--------------------------|
| Existem `id`, `user_id`, `name`, `kind`, `is_active`, `created_at` | NÃO FOI POSSÍVEL VALIDAR |
| `kind` aceita prop, personal, crypto       | NÃO FOI POSSÍVEL VALIDAR |
| Queries por `user_id` e ordenação por `created_at` válidas | NÃO FOI POSSÍVEL VALIDAR |

---

### 2.3 `prop_accounts`

**Colunas exigidas pelo código**

| Coluna                    | Uso no código              | Obrigatório |
|---------------------------|----------------------------|-------------|
| id                        | SELECT (import, prop-stats); FK em prop_payouts | Sim |
| account_id                | SELECT, INSERT; filtro    | Sim         |
| user_id                   | INSERT (bootstrap); filtro (import, prop-stats) | Sim |
| firm_name                 | SELECT, INSERT            | Sim         |
| phase                     | SELECT, INSERT             | Sim         |
| starting_balance_usd      | SELECT, INSERT             | Sim         |
| profit_target_percent     | SELECT, INSERT             | Sim         |
| max_daily_loss_percent    | SELECT, INSERT             | Sim         |
| max_overall_loss_percent  | SELECT, INSERT             | Sim         |
| reset_timezone            | SELECT, INSERT             | Sim         |
| reset_rule                | SELECT, INSERT             | Sim         |

**Colunas reais (preencher após SQL)**  
*Aguardando execução do script.*

**Pontos críticos a confirmar**

| Item                              | Status                   |
|-----------------------------------|--------------------------|
| Existe `user_id`                  | NÃO FOI POSSÍVEL VALIDAR |
| Existem `account_id`, `id`, `firm_name`, `phase` | NÃO FOI POSSÍVEL VALIDAR |
| Demais campos do bootstrap       | NÃO FOI POSSÍVEL VALIDAR |
| Modelagem suporta filtros import e prop-stats | NÃO FOI POSSÍVEL VALIDAR |

---

### 2.4 `journal_trades`

**Colunas exigidas pelo código**

| Coluna          | Uso no código                          | Obrigatório |
|-----------------|----------------------------------------|-------------|
| id              | SELECT (existência, listagem)          | Sim         |
| user_id         | SELECT, INSERT                        | Sim         |
| account_id      | SELECT, INSERT                        | Sim         |
| symbol          | SELECT, INSERT                        | Sim         |
| category        | SELECT, INSERT                        | Sim         |
| direction       | SELECT, INSERT                        | Sim         |
| opened_at       | SELECT, INSERT                        | Sim         |
| closed_at       | SELECT, INSERT                        | Sim         |
| pnl_usd         | SELECT, INSERT                        | Sim         |
| fees_usd        | SELECT, INSERT                        | Sim         |
| net_pnl_usd     | SELECT apenas; insert não envia        | Sim (gerado ou preenchido) |
| external_source | SELECT, INSERT                        | Sim         |
| external_id     | SELECT, INSERT                        | Sim         |

**Constraints exigidas**

- UNIQUE (user_id, account_id, external_source, external_id) para deduplicação segura.

**Colunas reais (preencher após SQL)**  
*Aguardando execução do script.*

**Pontos críticos a confirmar**

| Item                                                                 | Status                   |
|----------------------------------------------------------------------|--------------------------|
| Existência de todas as colunas listadas acima                        | NÃO FOI POSSÍVEL VALIDAR |
| `net_pnl_usd`: generated / trigger / ou coluna comum                 | NÃO FOI POSSÍVEL VALIDAR |
| UNIQUE (user_id, account_id, external_source, external_id) existe    | NÃO FOI POSSÍVEL VALIDAR |

---

### 2.5 `prop_payouts`

**Colunas exigidas pelo código**

| Coluna           | Uso no código   | Obrigatório |
|------------------|-----------------|-------------|
| id               | SELECT          | Sim         |
| user_id          | INSERT          | Sim         |
| prop_account_id  | SELECT, INSERT  | Sim         |
| paid_at          | SELECT, INSERT  | Sim         |
| amount_usd       | SELECT, INSERT  | Sim         |
| external_source  | SELECT, INSERT  | Sim         |
| external_id      | SELECT, INSERT  | Sim         |

**Pontos críticos a confirmar**

| Item   | Status                   |
|--------|--------------------------|
| Todas as colunas acima existem e tipos compatíveis | NÃO FOI POSSÍVEL VALIDAR |

---

### 2.6 `wallet_transactions`

**Colunas exigidas pelo código**

| Coluna      | Uso no código | Obrigatório |
|-------------|----------------|-------------|
| user_id     | INSERT         | Sim         |
| account_id  | INSERT         | Sim         |
| tx_type     | INSERT         | Sim         |
| amount_usd  | INSERT         | Sim         |
| notes       | INSERT         | Sim         |

**Pontos críticos a confirmar**

| Item   | Status                   |
|--------|--------------------------|
| Todas as colunas acima existem | NÃO FOI POSSÍVEL VALIDAR |

---

### 2.7 `ingestion_logs`

**Colunas exigidas pelo código**

| Coluna       | Uso no código | Obrigatório |
|--------------|----------------|-------------|
| user_id      | INSERT         | Sim         |
| status       | INSERT         | Sim         |
| source       | INSERT         | Sim         |
| items_count  | INSERT         | Sim         |
| duration_ms  | INSERT         | Sim         |
| message      | INSERT         | Sim         |
| meta         | INSERT (objeto)| Sim (jsonb compatível) |

**Pontos críticos a confirmar**

| Item   | Status                   |
|--------|--------------------------|
| Todas as colunas existem; `meta` é jsonb (ou json) compatível com objeto | NÃO FOI POSSÍVEL VALIDAR |

---

## 3. Colunas exigidas pelo código vs colunas reais

Resumo para preenchimento após rodar o SQL (exemplo de formato).

| Tabela               | Coluna exigida   | Existe? (Y/N) | Tipo real | Compatível? |
|----------------------|------------------|---------------|-----------|-------------|
| profiles             | id               | —             | —         | —           |
| profiles             | display_name     | —             | —         | —           |
| accounts             | id               | —             | —         | —           |
| accounts             | user_id          | —             | —         | —           |
| …                    | …                | …             | …         | …           |

*(Preencher com o resultado do script de auditoria.)*

---

## 4. Constraints e índices exigidos vs reais

| Tabela          | Exigido pelo código                         | Existe no banco? |
|-----------------|---------------------------------------------|------------------|
| profiles        | PK ou UNIQUE em `id`                        | NÃO FOI POSSÍVEL VALIDAR |
| journal_trades  | UNIQUE (user_id, account_id, external_source, external_id) | NÃO FOI POSSÍVEL VALIDAR |
| Demais          | PK em `id` onde há insert + select id       | NÃO FOI POSSÍVEL VALIDAR |

---

## 5. RLS / policies exigidas vs reais

| Tabela               | Fluxo do app                    | Policy exigida (resumo)           | Status  |
|----------------------|----------------------------------|-----------------------------------|---------|
| profiles             | Login, onboarding, upsert        | SELECT/INSERT/UPDATE onde id = auth.uid() | NÃO FOI POSSÍVEL VALIDAR |
| accounts             | Listagem, bootstrap, import      | SELECT/INSERT onde user_id = auth.uid()   | NÃO FOI POSSÍVEL VALIDAR |
| prop_accounts        | Listagem, bootstrap, import, prop-stats | SELECT/INSERT (donos)             | NÃO FOI POSSÍVEL VALIDAR |
| journal_trades       | Import, journal, dashboard      | SELECT/INSERT onde user_id = auth.uid()   | NÃO FOI POSSÍVEL VALIDAR |
| prop_payouts         | Import, prop-stats              | SELECT/INSERT (donos)             | NÃO FOI POSSÍVEL VALIDAR |
| wallet_transactions  | Import (depósito payout)        | INSERT (donos)                    | NÃO FOI POSSÍVEL VALIDAR |
| ingestion_logs       | Import (log ok/erro)            | INSERT (donos)                    | NÃO FOI POSSÍVEL VALIDAR |

---

## 6. Incompatibilidades encontradas

Enquanto o SQL não for executado, não há incompatibilidades **confirmadas**. As abaixo são **potenciais**, com base no contrato do código; devem ser confirmadas ou descartadas após preencher o relatório com o output do script.

| ID  | Descrição                                      | Impacto no app              | Severidade | Ajuste ideal      |
|-----|-------------------------------------------------|-----------------------------|------------|-------------------|
| I1  | `prop_accounts.user_id` ausente                 | Import 500; prop-stats vazio; bootstrap pode falhar | Alta   | Banco (adicionar coluna) |
| I2  | `journal_trades.net_pnl_usd` não gerado        | NULL em novos trades; app usa fallback   | Média  | Banco (generated/trigger) ou código (enviar valor) |
| I3  | Falta UNIQUE em journal_trades (user_id, account_id, external_source, external_id) | Risco de duplicatas        | Alta       | Banco (constraint) |
| I4  | RLS bloqueando SELECT/INSERT                    | Login, import, journal, etc. falham     | Alta       | Banco (policies)  |
| I5  | `profiles.id` sem PK/UNIQUE                     | Upsert de display_name falha            | Média      | Banco             |
| I6  | `ingestion_logs.meta` ausente ou tipo errado   | Insert de log falha                      | Média      | Banco ou código   |
| I7  | `accounts.created_at` ausente                  | Query de contas falha                   | Baixa      | Banco             |

Para cada incompatibilidade confirmada após o SQL: preencher impacto, severidade e se o ajuste ideal é no banco, no código ou em ambos.

---

## 7. Prioridade de correção (recomendada)

1. **Alta:** RLS/policies (fluxos de auth e dados); `prop_accounts.user_id`; UNIQUE em `journal_trades`.
2. **Média:** `journal_trades.net_pnl_usd`; `profiles` PK/UNIQUE; `ingestion_logs.meta`; colunas do bootstrap em `prop_accounts`.
3. **Baixa:** `accounts.created_at`; tipos e nullability restantes.

---

## 8. Plano de ação faseado

**Fase A — Validação (esta fase)**  
- [x] Relatório estruturado (este documento).  
- [ ] Executar `docs/sql/audit-supabase-schema.sql` no Supabase (SQL Editor).  
- [ ] Preencher “colunas reais”, “constraints reais”, “RLS/policies reais” e marcar cada item como CONFIRMADO / INCOMPATÍVEL / NÃO EXISTE.  
- [ ] Atualizar a tabela de incompatibilidades com base no resultado.

**Fase B — Correções no banco (após validação)**  
- [ ] Ajustar schema (colunas, tipos, defaults, generated columns, constraints, índices) conforme incompatibilidades confirmadas.  
- [ ] Ajustar RLS/policies para permitir exatamente os fluxos do app.  
- [ ] Nenhuma migration criada até aprovação.

**Fase C — Ajustes no código (se necessário)**  
- [ ] Alterar apenas onde o schema real for diferente do esperado e o ajuste ideal for “código” ou “ambos”.  
- [ ] Manter compatibilidade com o schema já corrigido.

**Fase D — Regressão**  
- [ ] Testar login, onboarding, bootstrap, import MT5, journal, dashboard, prop-stats, payouts e logs.

---

## 9. Nenhuma mudança aplicada

- Nenhuma alteração foi feita no banco.  
- Nenhuma migration foi criada.  
- Nenhuma alteração foi feita no código do app.  
- Apenas documentação e script SQL de auditoria foram adicionados para você executar no Supabase e preencher o relatório.

---

## 10. Próximo passo

1. Abra o **Supabase Dashboard** do projeto → **SQL Editor**.  
2. Cole e execute o conteúdo de `docs/sql/audit-supabase-schema.sql`.  
3. Guarde o resultado (ou cole no projeto).  
4. Com o output, preencha as seções “colunas reais”, “constraints reais” e “RLS/policies reais” neste relatório e marque cada ponto crítico como **CONFIRMADO**, **INCOMPATÍVEL** ou **NÃO EXISTE**.  
5. A partir daí, aplicar o plano de ação (Fases B e C) conforme prioridade acima.
