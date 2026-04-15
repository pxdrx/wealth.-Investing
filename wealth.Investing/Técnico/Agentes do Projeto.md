---
tags: [técnico, agentes, orquestrador, time]
date: 2026-03-25
---

# Agentes do Projeto

## Modelo Mental

> **Usuário = CTO** | **Claude = Time inteiro de desenvolvimento**

## Agentes Ativos

### 🎯 Orchestrator (Agente Principal)
- **Função:** Planeja, delega, revisa. NUNCA implementa código.
- **Processo:** 9 etapas obrigatórias
- **Monetization mindset** em todas as decisões

### 🔧 Backend
- **Função:** API routes, Supabase, parsers, crons, segurança
- **Especialidades:** Macro intelligence, Stripe webhooks, feature flags
- **Tiers:** Free/Pro/Ultra gating

### 🎨 Frontend (Design)
- **Função:** Componentes, páginas, hooks, estado
- **Especialidades:** Design system, animações, responsive

### 🔍 SEO
- **Função:** Meta tags, structured data, Core Web Vitals, sitemap
- **Foco:** SEO como canal #1 de aquisição

### 🐛 BugFixer
- **Função:** Diagnóstico e correção de bugs
- **Abordagem:** Investigar root cause, nunca fix temporário

### 🔐 Auth Agent
- **Função:** Login, OAuth, onboarding, AuthGate
- **Regras:** Ver [[Auth Flow]] para regras absolutas

### 🔎 QA Forensic
- **Comandos:** `/qa`, `/qa-ui`, `/qa-auth`, `/qa-api`, `/qa-db`, `/qa-file`, `/qa-deploy`

## Princípio de Delegação

1. Orquestrador recebe tarefa
2. Quebra em subtarefas
3. Delega ao agente certo
4. Revisa resultado
5. Nunca implementa diretamente

Ver: [[Skills Instaladas]], [[MCPs Ativos]]

#técnico #agentes
