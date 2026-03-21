<!-- ETAPA 7.2 — NOVO ARQUIVO (NÃO EXISTIA ANTES) -->

# MRKT Edge — Macro Analysis Integration

Documentação operacional de integração do módulo `macro_analysis`.

---

## Ponto de Entrada Oficial
```python
from macro_analysis.integration import MacroAnalysisIntegration

integration = MacroAnalysisIntegration()
success, result_info = integration.process_analysis(markdown_path, force_update=False)
```

---

## Fluxo de Execução (End-to-End)

### Ordem de Execução

1. **Recebimento do markdown institucional** (gerado pela ETAPA 4)
2. **Execução do `InstitutionalAnalysisPipeline`** (ETAPA 5, sem modificações)
   - Parse markdown → estrutura Python
   - Validação via schema Pydantic existente
3. **Persistência via `MacroAnalysisRepository`**
   - Verifica duplicatas (chave: `week_start`)
   - INSERT se novo, UPDATE se `force_update=True`
   - Aplica regra de mutabilidade (`is_frozen`)
4. **Geração de JSON** em `backend/outputs/macro_analysis/`
   - Formato: `institutional_analysis_YYYYMMDD.json`
5. **Retorno de status estruturado** (`result_info`)

### Diagrama do Fluxo
```
markdown (*.md)
    ↓
InstitutionalAnalysisPipeline (ETAPA 5)
    ↓ validated_analysis
MacroAnalysisIntegration
    ↓
MacroAnalysisRepository
    ↓
Database (SQLite)
    ↓
JSON output (backend/outputs/macro_analysis/)
    ↓
result_info (Dict)
```

---

## Regra Temporal (CRÍTICO)

**Definição de Semana Institucional:**

- **week_start:** Sempre **DOMINGO** (início da semana)
- **week_end:** Sempre **SÁBADO** (fim da semana)
- **Período:** DOMINGO → SÁBADO (7 dias)

**Exemplo:**
```python
from datetime import date

# Semana de 04/01/2026 (domingo) - 10/01/2026 (sábado)
week_start = date(2026, 1, 4)   # DOMINGO
week_end = date(2026, 1, 10)    # SÁBADO
```

**Mutabilidade:**

- **Mutável:** `date.today() <= week_end` (durante a semana)
- **Imutável:** `date.today() > week_end` (após sábado)

---

## Uso Básico

### CLI
```bash
# Processar análise
python -m macro_analysis.integration institutional_analysis_week_20260104.md

# Forçar atualização (sobrescrever existente)
python -m macro_analysis.integration institutional_analysis_week_20260104.md --force
```

### Python
```python
from macro_analysis.integration import get_integration
from datetime import date

# Criar integration
integration = get_integration()

# Processar análise
success, result = integration.process_analysis(
    markdown_path="institutional_analysis_week_20260104.md",
    force_update=False  # True = sobrescrever se existir
)

# Verificar resultado
if success:
    print(f"✅ Week: {result['week_start']}")
    print(f"   ID: {result['record_id']}")
    print(f"   JSON: {result['output_file']}")
else:
    print(f"❌ Erros: {result['errors']}")
```

### Processar a partir de String
```python
markdown_content = """
## ANÁLISE INSTITUCIONAL SEMANAL — MRKT EDGE
...
"""

success, result = integration.process_from_markdown_content(
    markdown_content=markdown_content,
    week_start=date(2026, 1, 4),
    force_update=False
)
```

---

## Estrutura de Retorno (`result_info`)

### Sucesso
```json
{
  "success": true,
  "markdown_path": "institutional_analysis_week_20260104.md",
  "steps_completed": [
    "parse_and_validate",
    "persist_database",
    "generate_json"
  ],
  "errors": [],
  "record_id": 1,
  "output_file": "/path/to/backend/outputs/macro_analysis/institutional_analysis_20260104.json",
  "week_start": "2026-01-04",
  "week_end": "2026-01-10"
}
```

### Falha
```json
{
  "success": false,
  "markdown_path": "institutional_analysis_week_20260104.md",
  "steps_completed": ["parse_and_validate"],
  "errors": [
    "DuplicateAnalysisError: Análise já existe para week_start=2026-01-04"
  ],
  "record_id": null,
  "output_file": null
}
```

---

## Erros Comuns

| Erro | Causa | Solução |
|------|-------|---------|
| `DuplicateAnalysisError` | Análise já existe para `week_start` | Usar `force_update=True` |
| `AnalysisFrozenError` | Tentativa de modificar análise congelada | Criar análise para nova semana |
| `ValidationError` | Markdown não conforme schema | Verificar estrutura do markdown |
| `FileNotFoundError` | Markdown não encontrado | Verificar caminho do arquivo |
| `sqlite3.OperationalError` | Tabela não existe | Executar script de criação da tabela ou validar inicialização do adapter |

---

## Acesso a Análises (API Read-Only)

### Handler
```python
from macro_analysis.api.handlers import get_macro_analysis_handler
from datetime import date

handler = get_macro_analysis_handler()

# Análise mais recente
latest = handler.get_latest()

# Análise específica
analysis = handler.get_analysis(date(2026, 1, 4))

# Listar análises
analyses = handler.list_analyses(limit=10, offset=0)

# Verificar mutabilidade
is_frozen = handler.is_frozen(date(2026, 1, 4))

# Resumo estatístico
summary = handler.get_summary()
```

### Estrutura de Resposta (API)
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
    "Américas": "...",
    "Europa": "...",
    "Ásia-Pacífico": "..."
  },
  "interpretacao_narrativa": {
    "politica_monetaria": "...",
    "crescimento_economico": "...",
    "inflacao_pressoes": "...",
    "risco_apetite": "..."
  },
  "conclusao_operacional": {
    "sintese_semana": "...",
    "precificacao_mercado": "..."
  },
  "ativos": [
    {
      "name": "DXY",
      "scenario_base": "Lateral",
      "driver_macro": "...",
      "probability": {
        "alta": "Média",
        "lateral": "Alta",
        "baixa": "Baixa"
      }
    }
  ],
  "notas_adicionais": "..."
}
```

---

## CRUD via Repository (Direto)

> ⚠️ Uso interno / administrativo.  
> Não faz parte do fluxo padrão de integração descrito neste documento.
```python
from macro_analysis.database.repository import MacroAnalysisRepository
from macro_analysis.database.adapter import get_database_adapter
from datetime import date

adapter = get_database_adapter()
repo = MacroAnalysisRepository(db_adapter=adapter)

# CREATE
analysis_data = {
    "week_start": date(2026, 1, 4),
    "week_end": date(2026, 1, 10),
    "generated_at": date.today(),
    "analyst": "Sistema MRKT Edge",
    "source": "Trading Economics",
    "regional_overview": {...},
    "narrative": {...},
    "conclusion": {...},
    "assets": [...],
    "additional_notes": "...",
}
record_id = repo.create(analysis_data)

# READ
analysis = repo.get_by_week_start(date(2026, 1, 4))
latest = repo.get_latest()
analyses = repo.list_analyses(limit=10)

# UPDATE (apenas se não congelada)
repo.update(
    week_start=date(2026, 1, 4),
    update_data={"analyst": "Leonardo Castro"}
)

# MUTABILITY
is_frozen = repo.is_frozen(date(2026, 1, 4))
repo.freeze(date(2026, 1, 4))  # Congelar manualmente
```

---

## Verificação de Saúde
```python
from macro_analysis.database.adapter import get_database_adapter

adapter = get_database_adapter()

# Status da conexão
print(adapter.is_healthy())  # True/False

# Info da tabela
info = adapter.get_table_info()
print(f"Tabela: {info['table_name']}")
print(f"Registros: {info['total_records']}")
print(f"Colunas: {len(info['columns'])}")
```

---

## Conformidade

### Cláusula de Preservação de Código

✅ **Pipeline existente (`InstitutionalAnalysisPipeline`) não modificado**  
✅ **Integração exclusivamente via import**  
✅ **Zero alterações em arquivos existentes**

### Escopo Macro-Only (ETAPA 6)

✅ **Apenas análise macroeconômica**  
✅ **Zero níveis de preço**  
✅ **Zero análise técnica**

### Operações Permitidas

✅ **Leitura via API (read-only)**  
✅ **Persistência via repository**  
❌ **Escrita via API (não permitido)**

### Regra Temporal

✅ **week_start = DOMINGO**  
✅ **week_end = SÁBADO**  
✅ **Semana = DOMINGO → SÁBADO**

---

## Arquivos Gerados
```
backend/outputs/macro_analysis/
└── institutional_analysis_20260104.json
└── institutional_analysis_20260111.json
└── ...

backend/mrkt_edge.db
├── macro_analysis_institutional (tabela)
```

---

**Versão:** 1.0.0  
**Última Atualização:** 2026-01-08  
**Módulo:** macro_analysis