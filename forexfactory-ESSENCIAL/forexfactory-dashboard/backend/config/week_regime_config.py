"""
Configuração manual/editorial de regime macro por semana.
Fonte rastreável e auditável. Sem inferência automática.
"""
from typing import Dict, Optional

# Configuração manual por week_key (formato: "YYYY-MM-DD_to_YYYY-MM-DD")
# Se semana não estiver aqui, regime é None (não exibido)
_WEEK_REGIME_MANUAL: Dict[str, str] = {
    # Exemplo para semana fixa 25-31 Jan 2026
    # "2026-01-25_to_2026-01-31": "RISK_OFF",
    # Adicionar semanas conforme necessário, preenchido manualmente por humano
}

# Fonte editorial (para rastreabilidade)
_REGIME_SOURCE = "MANUAL_EDITORIAL"


def get_regime_for_week(week_key: str) -> Optional[str]:
    """
    Retorna regime macro manual para semana específica.
    
    Args:
        week_key: Chave da semana (formato: "YYYY-MM-DD_to_YYYY-MM-DD")
    
    Returns:
        "RISK_OFF" | "RISK_ON" | None (se não configurado)
    """
    return _WEEK_REGIME_MANUAL.get(week_key)


def get_regime_source() -> str:
    """Retorna fonte do regime (para rastreabilidade)."""
    return _REGIME_SOURCE
