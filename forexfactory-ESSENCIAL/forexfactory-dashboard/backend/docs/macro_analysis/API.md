<!-- ETAPA 7.2 — NOVO ARQUIVO (NÃO EXISTIA ANTES) -->

# MRKT Edge — Macro Analysis API

Documentação da camada de acesso para análises macroeconômicas institucionais.

---

## Interface Oficial
```python
from macro_analysis.api.handlers import get_macro_analysis_handler

handler = get_macro_analysis_handler()
```

---

## Operações Disponíveis

### 1. `get_analysis(week_start)`

Recupera análise de semana específica.

**Assinatura:**
```python
def get_analysis(week_start: date) -> Optional[Dict]
```

**Parâmetros:**
- `week_start` (date): Data de início da semana (DOMINGO)

**Retorno:**
- `Dict`: Análise completa estruturada
- `None`: Se análise não existir

**Exemplo:**
```python
from datetime import date

analysis = handler.get_analysis(date(2026, 1, 4))

if analysis:
    print(f"Semana: {analysis['metadata']['week_start']}")
    print(f"Frozen: {analysis['metadata']['is_frozen']}")
else:
    print("Análise não encontrada")
```

**Estrutura de Retorno:** Ver seção [Estrutura de Resposta](#estrutura-de-resposta)

---

### 2. `get_latest()`

Recupera análise mais recente (maior `week_start`).

**Assinatura:**
```python
def get_latest() -> Optional[Dict]
```

**Retorno:**
- `Dict`: Análise completa estruturada
- `None`: Se não houver análises

**Exemplo:**
```python
latest = handler.get_latest()

if latest:
    print(f"Semana mais recente: {latest['metadata']['week_start']}")
else:
    print("Nenhuma análise disponível")
```

---

### 3. `list_analyses(limit, offset)`

Lista análises disponíveis (metadata apenas, sem conteúdo completo).

**Assinatura:**
```python
def list_analyses(limit: int = 10, offset: int = 0) -> List[Dict]
```

**Parâmetros:**
- `limit` (int): Número máximo de resultados (1-100, padrão: 10)
- `offset` (int): Offset para paginação (padrão: 0)

**Retorno:**
- `List[Dict]`: Lista de metadata (ordenada por `week_start` DESC)

**Exemplo:**
```python
# Primeira página (10 mais recentes)
analyses = handler.list_analyses(limit=10, offset=0)

for a in analyses:
    print(f"{a['week_start']} - {a['analyst']} - Frozen: {a['is_frozen']}")

# Segunda página
analyses_page2 = handler.list_analyses(limit=10, offset=10)
```

**Estrutura de Item:**
```json
{
  "week_start": "2026-01-04",
  "week_end": "2026-01-10",
  "generated_at": "2026-01-07",
  "analyst": "Sistema MRKT Edge",
  "source": "Trading Economics",
  "is_frozen": false
}
```

---

### 4. `is_frozen(week_start)`

Verifica se análise está congelada (imutável).

**Assinatura:**
```python
def is_frozen(week_start: date) -> bool
```

**Parâmetros:**
- `week_start` (date): Data de início da semana

**Retorno:**
- `bool`: `True` se congelada, `False` se mutável

**Raises:**
- `ValueError`: Se análise não existir

**Exemplo:**
```python
from datetime import date

try:
    frozen = handler.is_frozen(date(2026, 1, 4))
    print(f"Análise congelada: {frozen}")
except ValueError as e:
    print(f"Erro: {e}")
```

---

### 5. `get_summary()`

Retorna resumo estatístico do sistema.

**Assinatura:**
```python
def get_summary() -> Dict
```

**Retorno:**
- `Dict`: Estatísticas gerais

**Exemplo:**
```python
summary = handler.get_summary()

print(f"Total de análises: {summary['total_analyses']}")
print(f"Mais recente: {summary['latest_week_start']}")
print(f"Mais antiga: {summary['oldest_week_start']}")
print(f"Congeladas: {summary['frozen_count']}")
print(f"Mutáveis: {summary['mutable_count']}")
```

**Estrutura de Retorno:**
```json
{
  "total_analyses": 12,
  "latest_week_start": "2026-01-04",
  "oldest_week_start": "2025-10-06",
  "frozen_count": 11,
  "mutable_count": 1
}
```

---

## Estrutura de Resposta

### Análise Completa (`get_analysis`, `get_latest`)
```json
{
  "metadata": {
    "week_start": "2026-01-04",
    "week_end": "2026-01-10",
    "generated_at": "2026-01-07",
    "analyst": "Sistema MRKT Edge",
    "source": "Trading Economics",
    "is_frozen": false,
    "created_at": "2026-01-07T10:30:00",
    "updated_at": "2026-01-07T10:30:00"
  },
  "panorama_macro": {
    "Américas": "Texto regional (max 5 linhas)",
    "Europa": "Texto regional (max 5 linhas)",
    "Ásia-Pacífico": "Texto regional (max 5 linhas)"
  },
  "interpretacao_narrativa": {
    "politica_monetaria": "Análise de política monetária global",
    "crescimento_economico": "Análise de crescimento econômico",
    "inflacao_pressoes": "Análise de inflação e pressões de preços",
    "risco_apetite": "Análise de risco e apetite de mercado"
  },
  "conclusao_operacional": {
    "sintese_semana": "Síntese da semana",
    "precificacao_mercado": "O que o mercado tende a precificar"
  },
  "ativos": [
    {
      "name": "DXY",
      "scenario_base": "Lateral",
      "driver_macro": "Fundamentação macroeconômica institucional",
      "probability": {
        "alta": "Média",
        "lateral": "Alta",
        "baixa": "Baixa"
      }
    },
    {
      "name": "XAUUSD",
      "scenario_base": "Alta",
      "driver_macro": "...",
      "probability": {
        "alta": "Alta",
        "lateral": "Média",
        "baixa": "Baixa"
      }
    },
    {
      "name": "S&P 500",
      "scenario_base": "Lateral",
      "driver_macro": "...",
      "probability": {
        "alta": "Baixa",
        "lateral": "Alta",
        "baixa": "Média"
      }
    },
    {
      "name": "Nasdaq",
      "scenario_base": "Baixa",
      "driver_macro": "...",
      "probability": {
        "alta": "Baixa",
        "lateral": "Média",
        "baixa": "Alta"
      }
    },
    {
      "name": "EURUSD",
      "scenario_base": "Baixa",
      "driver_macro": "...",
      "probability": {
        "alta": "Baixa",
        "lateral": "Média",
        "baixa": "Alta"
      }
    },
    {
      "name": "Bitcoin",
      "scenario_base": "Lateral",
      "driver_macro": "...",
      "probability": {
        "alta": "Média",
        "lateral": "Alta",
        "baixa": "Baixa"
      }
    }
  ],
  "notas_adicionais": "Tail risks, calendário crítico, etc (opcional)"
}
```

### Validações de Estrutura

**Ativos:**
- Total: Exatamente 6 ativos obrigatórios
- Nomes: `DXY`, `XAUUSD`, `S&P 500`, `Nasdaq`, `EURUSD`, `Bitcoin`
- Cenário Base: `Alta` | `Lateral` | `Baixa`
- Probabilidades: `Alta` | `Média` | `Baixa`
- Restrição: Apenas UM cenário pode ter probabilidade `Alta` por ativo

**Regiões:**
- Total: Exatamente 3 regiões obrigatórias
- Nomes: `Américas`, `Europa`, `Ásia-Pacífico`
- Limite: Máximo 5 linhas por região

---

## Tratamento de Erros

### Erros Comuns

| Erro | Quando Ocorre | Como Tratar |
|------|---------------|-------------|
| `ValueError` | `week_start` inválido ou análise não existe | Verificar data e existência |
| `TypeError` | Parâmetro com tipo incorreto | Passar `date` object, não string |
| `None` retornado | Análise não encontrada | Verificar `if analysis is not None` |

### Exemplo de Tratamento
```python
from datetime import date

try:
    analysis = handler.get_analysis(date(2026, 1, 4))
    
    if analysis is None:
        print("Análise não encontrada para essa semana")
    else:
        print(f"Análise encontrada: {analysis['metadata']['week_start']}")
        
except ValueError as e:
    print(f"Erro de validação: {e}")
except TypeError as e:
    print(f"Erro de tipo: {e}")
```

---

## Uso com Frontend

### React Example (Fetch Latest)
```javascript
// Assumindo backend expõe endpoint REST (a ser implementado)
async function getLatestAnalysis() {
  try {
    const response = await fetch('/api/macro-analysis/latest');
    const data = await response.json();
    
    if (data) {
      console.log('Week:', data.metadata.week_start);
      console.log('Assets:', data.ativos.length);
    }
  } catch (error) {
    console.error('Error fetching analysis:', error);
  }
}
```

### React Example (List Analyses)
```javascript
async function listAnalyses(limit = 10, offset = 0) {
  try {
    const response = await fetch(
      `/api/macro-analysis/list?limit=${limit}&offset=${offset}`
    );
    const analyses = await response.json();
    
    analyses.forEach(a => {
      console.log(`${a.week_start} - Frozen: ${a.is_frozen}`);
    });
  } catch (error) {
    console.error('Error listing analyses:', error);
  }
}
```

---

## Convenience Functions

### Atalhos para Uso Rápido
```python
from macro_analysis.api.handlers import (
    get_latest_analysis,
    get_analysis_for_week,
    list_all_analyses
)

# Análise mais recente
latest = get_latest_analysis()

# Análise de semana específica
analysis = get_analysis_for_week(date(2026, 1, 4))

# Listar análises
analyses = list_all_analyses(limit=10)
```

---

## Conformidade

### Modo Read-Only (ETAPA 6)

✅ **Todas as operações são read-only**  
❌ **Nenhuma operação de escrita via API**  
✅ **Persistência exclusivamente via repository (não API)**

### Escopo Macro-Only

✅ **Apenas dados macroeconômicos**  
❌ **Zero níveis de preço**  
❌ **Zero análise técnica**

### Regra Temporal

✅ **week_start = DOMINGO**  
✅ **week_end = SÁBADO**  
✅ **Semana = DOMINGO → SÁBADO (7 dias)**

---

## Próximos Passos (Implementação Backend REST - Opcional)

Se necessário expor via REST:

1. Criar endpoints em `macro_analysis/api/endpoints.py`
2. Usar FastAPI ou Flask
3. Mapear operações do handler para rotas HTTP
4. Adicionar CORS se frontend separado
5. Documentar endpoints com OpenAPI/Swagger

**Exemplo de Estrutura:**
```
GET  /api/macro-analysis/latest
GET  /api/macro-analysis/{week_start}
GET  /api/macro-analysis/list?limit=10&offset=0
GET  /api/macro-analysis/{week_start}/is-frozen
GET  /api/macro-analysis/summary
```

---

**Versão:** 1.0.0  
**Última Atualização:** 2026-01-08  
**Módulo:** macro_analysis
```

---

## ✅ CONSOLIDAÇÃO FINAL CONCLUÍDA

---

### **RESUMO COMPLETO DA ENTREGA**
```
╔═══════════════════════════════════════════════════════════╗
║              CONSOLIDAÇÃO FINAL — COMPLETA                ║
╠═══════════════════════════════════════════════════════════╣
║                                                           ║
║  Total de Arquivos: 12/12                                 ║
║  Arquivos Python: 10                                      ║
║  Arquivos Markdown: 2                                     ║
║  Linhas de Código: ~3500                                  ║
║                                                           ║
║  Status: PRONTO PARA IMPLEMENTAÇÃO                        ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝