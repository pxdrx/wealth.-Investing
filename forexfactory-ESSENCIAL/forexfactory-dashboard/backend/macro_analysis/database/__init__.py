# ETAPA 7.2 — NOVO ARQUIVO (NÃO EXISTIA ANTES)
"""
MRKT Edge — Macro Analysis Database Layer

Camada de persistência para análise macroeconômica institucional.

Componentes:
- models.py: Definição de schema de tabelas
- repository.py: CRUD operations (Create, Read, Update)
- adapter.py: Interface com backend/database.py existente

Responsabilidades:
- Persistir análises institucionais semanais
- Gerenciar versionamento (chave: week_start)
- Aplicar regras de mutabilidade (mutável durante semana, imutável após)
- Fornecer acesso estruturado aos dados

Integração:
- Usa backend/database.py via import (sem modificá-lo)
- Adiciona tabela específica: macro_analysis_institutional
- Respeita convenções do sistema existente

Conformidade:
- Zero modificação em código existente
- Integração via adapter pattern
- Cláusula de Preservação de Código (ATIVA)
"""

# Imports serão adicionados conforme implementação dos módulos
# Nota: imports comentados até que os módulos sejam implementados

# from .models import InstitutionalAnalysisModel, get_table_schema
# from .repository import MacroAnalysisRepository
# from .adapter import DatabaseAdapter


# Exports públicos (será populado conforme implementação)
__all__ = [
    # Será preenchido incrementalmente
    # "InstitutionalAnalysisModel",
    # "MacroAnalysisRepository",
    # "DatabaseAdapter",
    # "get_table_schema",
]


# Metadata da camada de database
DATABASE_INFO = {
    "table_name": "macro_analysis_institutional",
    "primary_key": "id",
    "logical_key": "week_start",
    "unique_constraint": "week_start",
    "indexes": [
        "week_start",
        "created_at",
        "is_frozen",
    ],
    "json_fields": [
        "regional_overview",
        "narrative",
        "conclusion",
        "assets",
    ],
    "mutability_field": "is_frozen",
    "mutability_rule": "Mutável se date.today() <= week_end, imutável após",
}


def get_database_info() -> dict:
    """
    Retorna informações sobre a estrutura de database.
    
    Returns:
        dict: Metadata da camada de database
    """
    return DATABASE_INFO.copy()