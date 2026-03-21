# ETAPA 7.2 — NOVO ARQUIVO (NÃO EXISTIA ANTES)
"""
MRKT Edge — Macro Analysis Database Models

Definição de schema de tabelas para análise institucional.

Responsabilidades:
- Definir estrutura da tabela macro_analysis_institutional
- Fornecer schema SQL puro (sem ORM específico)
- Documentar campos e índices
- Facilitar migração/criação de tabela

Nota sobre ORM:
- Este módulo fornece schema SQL puro
- Adapter (adapter.py) fará ponte com backend/database.py existente
- Sem assumir SQLAlchemy, Peewee ou outro ORM específico

Conformidade:
- Escopo macro-only (sem níveis de preço)
- Versionamento por week_start
- Mutabilidade via is_frozen
"""

from datetime import date, datetime
from typing import Dict, List


# ============================================================================
# TABLE SCHEMA (SQL PURO)
# ============================================================================

TABLE_NAME = "macro_analysis_institutional"

# Schema SQL para criação da tabela
CREATE_TABLE_SQL = f"""
CREATE TABLE IF NOT EXISTS {TABLE_NAME} (
    -- Chave primária auto-incrementada
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- Chave lógica de versionamento (única)
    week_start DATE NOT NULL UNIQUE,
    week_end DATE NOT NULL,
    
    -- Metadata
    generated_at DATE NOT NULL,
    analyst TEXT NOT NULL,
    source TEXT NOT NULL,
    
    -- Conteúdo (JSON serializado)
    regional_overview TEXT NOT NULL,  -- JSON: dict com 3 regiões
    narrative TEXT NOT NULL,          -- JSON: dict com 4 seções
    conclusion TEXT NOT NULL,         -- JSON: dict com 2 seções
    assets TEXT NOT NULL,             -- JSON: list com 6 ativos
    additional_notes TEXT,            -- Texto livre (nullable)
    
    -- Inteligência orientada a decisão (opcional)
    ativo_dominante_semana TEXT,      -- JSON: dict com ativo e justificativa (nullable)
    ativos_correlacionados_semana TEXT, -- JSON: list de dicts com ativo e justificativa (nullable, max 5)
    direcionamento_semanal TEXT,      -- Bullish, Bearish ou Neutro (nullable)
    interpretacao_narrativa_ativo TEXT, -- Texto livre (nullable)
    fluxo_risco TEXT,                 -- JSON: dict com classificacao, ativos_migracao e justificativa (nullable)
    -- Fase 3 - Controle Institucional (opcional)
    cenario_base TEXT,                -- JSON: dict com direcao, ativos_beneficiados e justificativa (nullable)
    cenario_alternativo TEXT,         -- JSON: dict com condicao_ativacao, ativos_beneficiados e justificativa (nullable)
    zona_ruido TEXT,                  -- JSON: dict com condicoes, ativos_evitar e justificativa (nullable)
    distribuicao_probabilidades TEXT, -- JSON: dict com cenario_base, cenario_alternativo e ruido (nullable)
    -- Fase 4 - Decisão Acionável (opcional)
    mapa_conviccao TEXT,              -- JSON: list de dicts com ativo, conviccao e motivo_resumido (nullable, max 10)
    condicoes_execucao TEXT,          -- JSON: dict com condicao_macro, condicao_de_preco e condicao_de_volatilidade (nullable)
    sizing_institucional TEXT,        -- JSON: list de dicts com ativo, sizing e justificativa (nullable, max 10)
    risco_primario TEXT,              -- JSON: dict com evento_de_risco, impacto_esperado, ativos_mais_afetados e janela_temporal (nullable)
    -- Fase 5 - Monitoramento Adaptativo (opcional)
    alertas_adaptativos TEXT,         -- JSON: list de dicts com tipo, severidade, descricao, ativos_afetados, gatilho_detectado e janela_temporal (nullable, max 3)
    monitoramento_cenario TEXT,       -- JSON: dict com status_cenario_base, motivo_resumido e ultimo_check (nullable)
    
    -- Controle de mutabilidade
    is_frozen BOOLEAN DEFAULT 0 NOT NULL,
    
    -- Timestamps automáticos
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
"""

# Índices para otimização de queries
CREATE_INDEXES_SQL = [
    # Índice único em week_start (chave lógica)
    f"CREATE UNIQUE INDEX IF NOT EXISTS idx_{TABLE_NAME}_week_start ON {TABLE_NAME}(week_start);",
    
    # Índice em created_at (ordenação cronológica)
    f"CREATE INDEX IF NOT EXISTS idx_{TABLE_NAME}_created_at ON {TABLE_NAME}(created_at DESC);",
    
    # Índice em is_frozen (filtro de mutabilidade)
    f"CREATE INDEX IF NOT EXISTS idx_{TABLE_NAME}_is_frozen ON {TABLE_NAME}(is_frozen);",
    
    # Índice composto para queries comuns (frozen + date)
    f"CREATE INDEX IF NOT EXISTS idx_{TABLE_NAME}_frozen_date ON {TABLE_NAME}(is_frozen, week_start DESC);",
]

# Trigger para atualizar updated_at automaticamente
CREATE_TRIGGER_SQL = f"""
CREATE TRIGGER IF NOT EXISTS update_{TABLE_NAME}_timestamp 
AFTER UPDATE ON {TABLE_NAME}
FOR EACH ROW
BEGIN
    UPDATE {TABLE_NAME} 
    SET updated_at = CURRENT_TIMESTAMP 
    WHERE id = NEW.id;
END;
"""


# ============================================================================
# FIELD DEFINITIONS
# ============================================================================

FIELDS = {
    "id": {
        "type": "INTEGER",
        "nullable": False,
        "primary_key": True,
        "auto_increment": True,
        "description": "Chave primária auto-incrementada",
    },
    "week_start": {
        "type": "DATE",
        "nullable": False,
        "unique": True,
        "description": "Data de início da semana (chave lógica de versionamento)",
        "format": "YYYY-MM-DD",
        "example": "2026-01-04",
    },
    "week_end": {
        "type": "DATE",
        "nullable": False,
        "description": "Data de fim da semana",
        "format": "YYYY-MM-DD",
        "example": "2026-01-10",
    },
    "generated_at": {
        "type": "DATE",
        "nullable": False,
        "description": "Data de geração da análise",
        "format": "YYYY-MM-DD",
    },
    "analyst": {
        "type": "TEXT",
        "nullable": False,
        "description": "Nome do analista ou sistema responsável",
        "example": "Sistema MRKT Edge (Orquestração Autônoma)",
    },
    "source": {
        "type": "TEXT",
        "nullable": False,
        "description": "Fonte principal dos dados",
        "example": "Trading Economics",
    },
    "regional_overview": {
        "type": "TEXT",
        "nullable": False,
        "description": "Panorama macro das 3 regiões (JSON serializado)",
        "json_structure": {
            "Américas": "string (max 5 linhas)",
            "Europa": "string (max 5 linhas)",
            "Ásia-Pacífico": "string (max 5 linhas)",
        },
    },
    "narrative": {
        "type": "TEXT",
        "nullable": False,
        "description": "Interpretação da narrativa macro (JSON serializado)",
        "json_structure": {
            "politica_monetaria": "string",
            "crescimento_economico": "string",
            "inflacao_pressoes": "string",
            "risco_apetite": "string",
        },
    },
    "conclusion": {
        "type": "TEXT",
        "nullable": False,
        "description": "Conclusão operacional (JSON serializado)",
        "json_structure": {
            "sintese_semana": "string",
            "precificacao_mercado": "string",
        },
    },
    "assets": {
        "type": "TEXT",
        "nullable": False,
        "description": "Análise dos 6 ativos obrigatórios (JSON serializado)",
        "json_structure": [
            {
                "name": "string (DXY, XAUUSD, S&P 500, Nasdaq, EURUSD, Bitcoin)",
                "scenario_base": "string (Alta, Lateral, Baixa)",
                "driver_macro": "string",
                "probability": {
                    "alta": "string (Alta, Média, Baixa)",
                    "lateral": "string (Alta, Média, Baixa)",
                    "baixa": "string (Alta, Média, Baixa)",
                },
            }
        ],
    },
    "additional_notes": {
        "type": "TEXT",
        "nullable": True,
        "description": "Notas adicionais (tail risks, calendário crítico, etc)",
    },
    "is_frozen": {
        "type": "BOOLEAN",
        "nullable": False,
        "default": 0,
        "description": "Flag de mutabilidade (0=mutável, 1=imutável/congelado)",
        "rule": "Congela automaticamente quando date.today() > week_end",
    },
    "created_at": {
        "type": "TIMESTAMP",
        "nullable": False,
        "default": "CURRENT_TIMESTAMP",
        "description": "Timestamp de criação do registro",
    },
    "updated_at": {
        "type": "TIMESTAMP",
        "nullable": False,
        "default": "CURRENT_TIMESTAMP",
        "description": "Timestamp da última atualização (auto-atualizado via trigger)",
    },
}


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def get_create_table_sql() -> str:
    """
    Retorna SQL de criação da tabela.
    
    Returns:
        str: Statement SQL CREATE TABLE
    """
    return CREATE_TABLE_SQL


def get_create_indexes_sql() -> List[str]:
    """
    Retorna lista de SQLs de criação de índices.
    
    Returns:
        List[str]: Lista de statements SQL CREATE INDEX
    """
    return CREATE_INDEXES_SQL.copy()


def get_create_trigger_sql() -> str:
    """
    Retorna SQL de criação do trigger de updated_at.
    
    Returns:
        str: Statement SQL CREATE TRIGGER
    """
    return CREATE_TRIGGER_SQL


def get_all_setup_sql() -> List[str]:
    """
    Retorna todos os SQLs necessários para setup completo.
    
    Returns:
        List[str]: Lista com CREATE TABLE + CREATE INDEXES + CREATE TRIGGER
    """
    return [
        CREATE_TABLE_SQL,
        *CREATE_INDEXES_SQL,
        CREATE_TRIGGER_SQL,
    ]


def get_field_info(field_name: str) -> Dict:
    """
    Retorna informações sobre um campo específico.
    
    Args:
        field_name: Nome do campo
    
    Returns:
        Dict: Metadata do campo
    
    Raises:
        KeyError: Se campo não existir
    """
    return FIELDS[field_name].copy()


def get_all_fields() -> Dict:
    """
    Retorna metadata de todos os campos.
    
    Returns:
        Dict: Dicionário com todos os campos e suas definições
    """
    return FIELDS.copy()


def get_table_schema() -> Dict:
    """
    Retorna schema completo da tabela.
    
    Returns:
        Dict: Schema completo incluindo table name, fields, indexes
    """
    return {
        "table_name": TABLE_NAME,
        "fields": FIELDS,
        "indexes": [
            "idx_macro_analysis_institutional_week_start (UNIQUE)",
            "idx_macro_analysis_institutional_created_at",
            "idx_macro_analysis_institutional_is_frozen",
            "idx_macro_analysis_institutional_frozen_date",
        ],
        "trigger": "update_macro_analysis_institutional_timestamp",
        "constraints": {
            "primary_key": "id",
            "unique": ["week_start"],
            "not_null": [
                "week_start",
                "week_end",
                "generated_at",
                "analyst",
                "source",
                "regional_overview",
                "narrative",
                "conclusion",
                "assets",
                "is_frozen",
            ],
        },
    }


# ============================================================================
# VALIDATION HELPERS
# ============================================================================

def validate_week_start(week_start_value: date) -> bool:
    """
    Valida se week_start é uma data válida.
    
    Args:
        week_start_value: Valor de week_start
    
    Returns:
        bool: True se válido
    """
    if not isinstance(week_start_value, date):
        return False
    
    # Week_start deve ser no passado ou presente (não futuro distante)
    today = date.today()
    max_future = today.replace(year=today.year + 1)
    
    return week_start_value <= max_future


def validate_is_frozen(week_end_value: date, is_frozen_value: bool) -> bool:
    """
    Valida consistência entre week_end e is_frozen.
    
    Regra: Se today > week_end, is_frozen DEVE ser True
    
    Args:
        week_end_value: Valor de week_end
        is_frozen_value: Valor de is_frozen
    
    Returns:
        bool: True se consistente
    """
    today = date.today()
    
    if today > week_end_value:
        # Semana passou, DEVE estar congelada
        return is_frozen_value is True
    
    # Semana em andamento, pode estar mutável ou congelada
    return True