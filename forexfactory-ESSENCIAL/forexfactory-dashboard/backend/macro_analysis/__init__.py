# ETAPA 7.2 — NOVO ARQUIVO (NÃO EXISTIA ANTES)
"""
MRKT Edge — Macro Analysis Module

Módulo de análise macroeconômica institucional semanal.
Escopo: exclusivamente macro (sem níveis de preço, sem análise técnica).

Exports principais:
- InstitutionalAnalysis: Schema de análise institucional
- MacroAnalysisIntegration: Orquestrador de integração
- MacroAnalysisAPI: Interface de acesso para frontend

Estrutura:
- database/: Persistência e CRUD operations
- api/: Camada de acesso abstrata
- integration.py: Orquestração com pipeline existente
- config.py: Configurações do módulo

Versionamento:
- 1 análise por semana (chave: week_start)
- Mutável durante a semana, imutável após week_end

Conformidade:
- ETAPA 6: Escopo & Integração (CONGELADO)
- Cláusula de Preservação de Código (ATIVA)
"""

__version__ = "1.0.0"
__author__ = "MRKT Edge System"

# Imports principais (serão adicionados conforme módulos são criados)
# Nota: imports comentados até que os módulos sejam implementados

# from backend.schemas.institutional_analysis_schema import (
#     InstitutionalAnalysis,
#     AssetAnalysis,
#     ProbabilityScenarios,
#     RegionalOverview,
#     NarrativeInterpretation,
#     OperationalConclusion,
# )

# from .integration import MacroAnalysisIntegration

# from .api.interface import MacroAnalysisAPI
# from .api.handlers import MacroAnalysisHandler

# from .database.repository import MacroAnalysisRepository
# from .database.models import InstitutionalAnalysisModel

# from .config import MacroAnalysisConfig


# Exports públicos (será populado conforme implementação)
__all__ = [
    # Será preenchido incrementalmente
    "__version__",
]


# Metadata do módulo
MODULE_INFO = {
    "name": "macro_analysis",
    "version": __version__,
    "scope": "Análise Macroeconômica Institucional",
    "frequency": "Semanal",
    "versionamento": "week_start (YYYY-MM-DD)",
    "mutabilidade": "Mutável durante semana, imutável após week_end",
    "frontend_mode": "Read-only",
    "technical_analysis": False,  # Escopo macro-only
}


def get_module_info() -> dict:
    """
    Retorna informações sobre o módulo macro_analysis.
    
    Returns:
        dict: Metadata do módulo
    """
    return MODULE_INFO.copy()