"""
Classificação determinística de regime de risco baseada em Fear & Greed Index e VIX Index.

Regras:
- Risk-Off: Fear & Greed ≤ 40 E VIX ≥ 20
- Risk-On: Fear & Greed ≥ 60 E VIX ≤ 18
- Transição: Qualquer outro cenário

Função pura, sem dependência de tempo, sem efeitos colaterais.
"""


def classify_risk_regime(fear_greed_value: float, vix_value: float) -> str:
    """
    Classifica o regime de risco baseado em Fear & Greed Index e VIX Index.
    
    Args:
        fear_greed_value: Valor do Fear & Greed Index (0-100)
        vix_value: Valor do VIX Index
    
    Returns:
        "Risk-Off" | "Risk-On" | "Transição"
    """
    # Validação defensiva
    if not isinstance(fear_greed_value, (int, float)) or not isinstance(vix_value, (int, float)):
        return "Transição"
    
    # Risk-Off: Fear ≤ 40 E VIX ≥ 20
    if fear_greed_value <= 40 and vix_value >= 20:
        return "Risk-Off"
    
    # Risk-On: Fear ≥ 60 E VIX ≤ 18
    if fear_greed_value >= 60 and vix_value <= 18:
        return "Risk-On"
    
    # Transição / Neutro: qualquer outro cenário
    return "Transição"
