---
tags: [técnico, mcp, ferramentas]
date: 2026-03-25
---

# MCPs Ativos

## Quando Usar Cada MCP

### context7 (`mcp__context7__*`)
- **Quando:** SEMPRE — automaticamente antes de implementar com qualquer lib
- **Para quê:** Buscar docs atualizados e exemplos reais
- **Regra:** Usar ANTES de implementar, não depois de errar

### github (`mcp__github__*`)
- **Quando:** Criar PR, abrir issue, revisar PR, buscar código
- **Para quê:** Gerenciamento do repositório no GitHub

### playwright (`mcp__playwright__*`)
- **Quando:** Testar fluxos no browser (auth, navegação, UI)
- **Para quê:** QA automatizado, screenshots, validação visual

### supabase (read-only)
- **Quando:** Inspecionar schema, tabelas, dados, verificar RLS
- **Para quê:** Debugging de queries, confirmar estrutura
- **Limitação:** Read-only — não executa mutations

### greptile (`mcp__greptile__*`)
- **Quando:** Code review de PRs com IA
- **Para quê:** Revisão semântica antes de merge

### serena (`mcp__serena__*`)
- **Quando:** Refactoring complexo, navegação inteligente
- **Para quê:** Entender dependências antes de refatorar

### figma (`mcp__figma__*`)
- **Quando:** Receber specs de design do Figma
- **Para quê:** Extrair tokens, layouts, componentes

### claude-mem (`mcp__plugin_claude-mem__*`)
- **Quando:** Buscar contexto de sessões anteriores
- **Para quê:** Não repetir erros, recuperar contexto

### slack (`mcp__slack__*`)
- **Quando:** Notificações de deploy, alertas

### linear (`mcp__linear__*`)
- **Quando:** Gerenciar tasks, issues, sprints

### tradingview (`mcp__tradingview__*`)
- **Quando:** Screener de crypto, análise de mercado
- **Para quê:** Top gainers/losers, volume analysis

### apify (`mcp__apify__*`)
- **Quando:** Web scraping, extração de dados
- **Para quê:** Scraping de sites para dados macro

### telegram (`mcp__plugin_telegram__*`)
- **Quando:** Comunicação com usuário via Telegram
- **Para quê:** Notificações, respostas a mensagens

### n8n (`mcp__n8n-mcp__*`)
- **Quando:** Automações, workflows
- **Para quê:** Templates de automação, validação

Ver: [[Skills Instaladas]], [[Agentes do Projeto]]

#técnico #mcp #ferramentas
