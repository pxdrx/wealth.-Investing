# ETAPA 7.2 — NOVO ARQUIVO (NÃO EXISTIA ANTES)
"""
MRKT Edge — Macro Analysis API Layer

Camada de acesso abstrata para frontend (stack-agnostic).

Componentes:
- interface.py: Protocol/ABC definindo contrato de API
- handlers.py: Implementação concreta de acesso a dados

Responsabilidades:
- Fornecer interface abstrata para acesso a análises
- Desacoplar frontend de implementação de backend
- Permitir múltiplas implementações (REST, GraphQL, JSON files, etc)
- Garantir acesso read-only para frontend

Abstração de Stack:
- Interface define contrato (protocol/ABC)
- Handlers implementam lógica concreta
- Frontend consome via interface, desconhece stack

Operações Principais:
- get_analysis(week_start): Recuperar análise de semana específica
- get_latest(): Recuperar análise mais recente
- list_analyses(limit): Listar análises disponíveis
- is_frozen(week_start): Verificar mutabilidade

Conformidade:
- Frontend mode: Read-only (ETAPA 6)
- Stack neutra (sem assumir FastAPI/Flask)
- Cláusula de Preservação de Código (ATIVA)
"""

# Imports serão adicionados conforme implementação dos módulos
# Nota: imports comentados até que os módulos sejam implementados

# from .interface import MacroAnalysisAPI
# from .handlers import MacroAnalysisHandler


# Exports públicos (será populado conforme implementação)
__all__ = [
    # Será preenchido incrementalmente
    # "MacroAnalysisAPI",
    # "MacroAnalysisHandler",
]


# Metadata da camada de API
API_INFO = {
    "mode": "read-only",
    "frontend_access": True,
    "authentication": False,  # A ser definido conforme necessidade
    "stack": "agnostic",  # Não assume FastAPI/Flask/outro
    "operations": [
        "get_analysis",
        "get_latest",
        "list_analyses",
        "is_frozen",
    ],
    "response_format": "dict (JSON-serializable)",
    "error_handling": "Exceptions com mensagens claras",
}


def get_api_info() -> dict:
    """
    Retorna informações sobre a camada de API.
    
    Returns:
        dict: Metadata da camada de API
    """
    return API_INFO.copy()