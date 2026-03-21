# ETAPA 7.2 — NOVO ARQUIVO (NÃO EXISTIA ANTES)
"""
MRKT Edge — Macro Analysis API Interface

Interface abstrata (Protocol/ABC) para acesso a análises institucionais.

Responsabilidades:
- Definir contrato de API (métodos e assinaturas)
- Desacoplar frontend de implementação concreta
- Permitir múltiplas implementações (REST, GraphQL, JSON files, etc)
- Fornecer documentação clara de operações disponíveis

Padrão de Design:
- Interface abstrata (Protocol do Python 3.8+)
- Handlers concretos implementam esta interface
- Frontend depende apenas da interface, não da implementação

Operações Disponíveis:
- get_analysis(): Recuperar análise de semana específica
- get_latest(): Recuperar análise mais recente
- list_analyses(): Listar análises disponíveis
- is_frozen(): Verificar mutabilidade de análise

Conformidade:
- Frontend mode: Read-only (ETAPA 6)
- Stack neutra (não assume REST/GraphQL)
- Zero dependências externas pesadas
"""

from typing import Protocol, Dict, List, Optional
from datetime import date


# ============================================================================
# API INTERFACE (PROTOCOL)
# ============================================================================

class MacroAnalysisAPI(Protocol):
    """
    Interface abstrata para acesso a análises macroeconômicas.
    
    Define contrato que handlers concretos devem implementar.
    Frontend consome via esta interface, desconhecendo implementação.
    
    Todas as operações são read-only (conformidade ETAPA 6).
    """
    
    def get_analysis(self, week_start: date) -> Optional[Dict]:
        """
        Recupera análise institucional de semana específica.
        
        Args:
            week_start: Data de início da semana (YYYY-MM-DD)
        
        Returns:
            Dict: Análise completa estruturada, ou None se não encontrada
        
        Structure:
            {
                "metadata": {
                    "week_start": "2026-01-04",
                    "week_end": "2026-01-10",
                    "generated_at": "2026-01-07",
                    "analyst": "Sistema MRKT Edge",
                    "source": "Trading Economics",
                    "is_frozen": bool,
                },
                "panorama_macro": {
                    "Américas": "...",
                    "Europa": "...",
                    "Ásia-Pacífico": "...",
                },
                "interpretacao_narrativa": {
                    "politica_monetaria": "...",
                    "crescimento_economico": "...",
                    "inflacao_pressoes": "...",
                    "risco_apetite": "...",
                },
                "conclusao_operacional": {
                    "sintese_semana": "...",
                    "precificacao_mercado": "...",
                },
                "ativos": [
                    {
                        "name": "DXY",
                        "scenario_base": "Lateral",
                        "driver_macro": "...",
                        "probability": {
                            "alta": "Média",
                            "lateral": "Alta",
                            "baixa": "Baixa",
                        }
                    },
                    # ... 5 ativos restantes
                ],
                "notas_adicionais": "..." or None,
            }
        
        Example:
            >>> api.get_analysis(date(2026, 1, 4))
            {"metadata": {...}, "panorama_macro": {...}, ...}
        """
        ...
    
    def get_latest(self) -> Optional[Dict]:
        """
        Recupera análise institucional mais recente.
        
        Returns:
            Dict: Análise completa (mesma estrutura de get_analysis)
                  ou None se não houver análises
        
        Example:
            >>> api.get_latest()
            {"metadata": {"week_start": "2026-01-04", ...}, ...}
        """
        ...
    
    def list_analyses(
        self, 
        limit: int = 10, 
        offset: int = 0
    ) -> List[Dict]:
        """
        Lista análises disponíveis (metadata apenas, sem conteúdo completo).
        
        Args:
            limit: Número máximo de resultados (padrão: 10)
            offset: Offset para paginação (padrão: 0)
        
        Returns:
            List[Dict]: Lista de metadata de análises
        
        Structure (cada item):
            {
                "week_start": "2026-01-04",
                "week_end": "2026-01-10",
                "generated_at": "2026-01-07",
                "analyst": "Sistema MRKT Edge",
                "is_frozen": bool,
            }
        
        Example:
            >>> api.list_analyses(limit=5)
            [
                {"week_start": "2026-01-04", ...},
                {"week_start": "2025-12-28", ...},
                ...
            ]
        """
        ...
    
    def is_frozen(self, week_start: date) -> bool:
        """
        Verifica se análise está congelada (imutável).
        
        Args:
            week_start: Data de início da semana
        
        Returns:
            bool: True se congelada (imutável), False se mutável
        
        Raises:
            ValueError: Se análise não existir
        
        Example:
            >>> api.is_frozen(date(2026, 1, 4))
            False  # Semana em andamento
            
            >>> api.is_frozen(date(2025, 12, 28))
            True   # Semana já passou
        """
        ...
    
    def get_summary(self) -> Dict:
        """
        Retorna resumo estatístico do sistema.
        
        Returns:
            Dict: Estatísticas e metadata
        
        Structure:
            {
                "total_analyses": int,
                "latest_week_start": "YYYY-MM-DD" or None,
                "oldest_week_start": "YYYY-MM-DD" or None,
                "frozen_count": int,
                "mutable_count": int,
            }
        
        Example:
            >>> api.get_summary()
            {
                "total_analyses": 12,
                "latest_week_start": "2026-01-04",
                "oldest_week_start": "2025-10-06",
                "frozen_count": 11,
                "mutable_count": 1,
            }
        """
        ...


# ============================================================================
# TYPE ALIASES (para melhor documentação)
# ============================================================================

AnalysisDict = Dict
"""
Tipo: Análise completa estruturada

Structure:
    - metadata: Dict com week_start, week_end, etc
    - panorama_macro: Dict com 3 regiões
    - interpretacao_narrativa: Dict com 4 seções
    - conclusao_operacional: Dict com 2 seções
    - ativos: List[Dict] com 6 ativos
    - notas_adicionais: str ou None
"""

AnalysisMetadata = Dict
"""
Tipo: Metadata de análise (sem conteúdo completo)

Structure:
    - week_start: str (ISO date)
    - week_end: str (ISO date)
    - generated_at: str (ISO date)
    - analyst: str
    - is_frozen: bool
"""

SummaryDict = Dict
"""
Tipo: Resumo estatístico

Structure:
    - total_analyses: int
    - latest_week_start: str ou None
    - oldest_week_start: str ou None
    - frozen_count: int
    - mutable_count: int
"""


# ============================================================================
# RESPONSE HELPERS (opcional, para padronização)
# ============================================================================

def format_success_response(data: any, message: str = "Success") -> Dict:
    """
    Formata resposta de sucesso padronizada.
    
    Args:
        data: Dados a retornar
        message: Mensagem de sucesso
    
    Returns:
        Dict: Resposta formatada
    
    Example:
        >>> format_success_response({"week_start": "2026-01-04"})
        {
            "success": True,
            "message": "Success",
            "data": {"week_start": "2026-01-04"}
        }
    """
    return {
        "success": True,
        "message": message,
        "data": data,
    }


def format_error_response(error: str, details: Optional[str] = None) -> Dict:
    """
    Formata resposta de erro padronizada.
    
    Args:
        error: Mensagem de erro
        details: Detalhes adicionais (opcional)
    
    Returns:
        Dict: Resposta de erro formatada
    
    Example:
        >>> format_error_response("Análise não encontrada", "week_start=2026-01-04")
        {
            "success": False,
            "error": "Análise não encontrada",
            "details": "week_start=2026-01-04"
        }
    """
    response = {
        "success": False,
        "error": error,
    }
    
    if details:
        response["details"] = details
    
    return response


# ============================================================================
# VALIDATION HELPERS
# ============================================================================

def validate_week_start(week_start: any) -> bool:
    """
    Valida se week_start é um objeto date válido.
    
    Args:
        week_start: Valor a validar
    
    Returns:
        bool: True se válido
    """
    return isinstance(week_start, date)


def validate_limit(limit: int, max_limit: int = 100) -> bool:
    """
    Valida se limit está dentro do range permitido.
    
    Args:
        limit: Valor de limit
        max_limit: Limite máximo permitido
    
    Returns:
        bool: True se válido
    """
    return isinstance(limit, int) and 1 <= limit <= max_limit


def validate_offset(offset: int) -> bool:
    """
    Valida se offset é um valor não-negativo.
    
    Args:
        offset: Valor de offset
    
    Returns:
        bool: True se válido
    """
    return isinstance(offset, int) and offset >= 0