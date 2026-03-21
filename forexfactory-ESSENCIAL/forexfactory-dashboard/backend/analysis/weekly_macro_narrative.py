"""
Narrativa Macro Semanal — temas dominantes e ativos em destaque.
Sistema descreve contexto, não sinal. Sem probabilidades. Sem forecasts.
Ativos derivados por temas dominantes e classes favorecidas.
Sempre retorna ≥1 ativo em destaque.
"""
from typing import Any, Dict, List

# Símbolos FTMO — única fonte de ativos permitidos.
FTMO_SYMBOLS = frozenset({
    "DXY", "EURUSD", "GBPUSD", "USDJPY", "USDCHF", "AUDUSD", "USDCAD",
    "XAUUSD", "XAGUSD", "US30", "NAS100", "SPX500", "BTCUSD",
    "EURJPY", "GBPJPY", "EURAUD", "AUDJPY",
})

# Temas dominantes → classes favorecidas → ativos relacionados.
# Estrutura: (tema_dominante, classe_favorecida, ativos[])
_THEME_CLASS_ASSETS: List[tuple] = [
    # Política monetária hawkish → moedas fortes, índices sensíveis
    ("política monetária hawkish", "moedas fortes", ["DXY", "EURUSD", "GBPUSD", "USDJPY"]),
    ("política monetária hawkish", "índices sensíveis", ["US30", "SPX500", "NAS100"]),
    # Política monetária dovish → metais, moedas fracas
    ("política monetária dovish", "metais", ["XAUUSD", "XAGUSD"]),
    ("política monetária dovish", "moedas fracas", ["EURUSD", "GBPUSD", "AUDUSD"]),
    # Inflação alta → metais, moedas fortes
    ("inflação alta", "metais", ["XAUUSD", "XAGUSD"]),
    ("inflação alta", "moedas fortes", ["DXY", "USDJPY", "USDCHF"]),
    # Inflação baixa → índices, moedas de risco
    ("inflação baixa", "índices", ["US30", "SPX500", "NAS100"]),
    ("inflação baixa", "moedas de risco", ["AUDUSD", "EURAUD", "AUDJPY"]),
    # Crescimento forte → índices, moedas de risco
    ("crescimento forte", "índices", ["US30", "SPX500", "NAS100"]),
    ("crescimento forte", "moedas de risco", ["AUDUSD", "EURAUD", "AUDJPY"]),
    # Crescimento fraco → metais, moedas seguras
    ("crescimento fraco", "metais", ["XAUUSD", "XAGUSD"]),
    ("crescimento fraco", "moedas seguras", ["USDJPY", "USDCHF", "DXY"]),
    # Risco global alto → metais, moedas seguras
    ("risco global alto", "metais", ["XAUUSD", "XAGUSD"]),
    ("risco global alto", "moedas seguras", ["USDJPY", "USDCHF", "DXY"]),
    # Risco global baixo → índices, moedas de risco
    ("risco global baixo", "índices", ["US30", "SPX500", "NAS100"]),
    ("risco global baixo", "moedas de risco", ["AUDUSD", "EURAUD", "AUDJPY"]),
]

# Mapeamento simplificado: tema → ativos (agregação de classes).
_THEME_TO_ASSETS: Dict[str, List[str]] = {
    "política monetária hawkish": ["DXY", "EURUSD", "GBPUSD", "US30", "SPX500"],
    "política monetária dovish": ["XAUUSD", "XAGUSD", "EURUSD", "GBPUSD"],
    "inflação alta": ["XAUUSD", "XAGUSD", "DXY", "USDJPY"],
    "inflação baixa": ["US30", "SPX500", "NAS100", "AUDUSD"],
    "crescimento forte": ["US30", "SPX500", "NAS100", "AUDUSD", "EURAUD"],
    "crescimento fraco": ["XAUUSD", "XAGUSD", "USDJPY", "USDCHF"],
    "risco global alto": ["XAUUSD", "XAGUSD", "USDJPY", "USDCHF"],
    "risco global baixo": ["US30", "SPX500", "NAS100", "AUDUSD"],
}

# Fallback genérico: sempre retorna lista não vazia.
_DEFAULT_HIGHLIGHTED_ASSETS = ["DXY", "EURUSD", "XAUUSD", "US30", "SPX500"]

# Ativos defensivos (metais) que devem ter precedência em regime DEFENSIVE.
_DEFENSIVE_ASSETS = ["XAUUSD", "XAGUSD"]


def identify_macro_regime(dominant_themes: List[str], narrative_text: str = "") -> str:
    """
    DEPRECATED: Esta função viola princípio print-driven (inferência disfarçada).
    Use config.week_regime_config.get_regime_for_week() para regime manual/editorial.
    
    Mantida apenas para compatibilidade temporária. Será removida.
    Retorna sempre "NEUTRAL" para não violar regras institucionais.
    """
    # Não inferir regime automaticamente - viola princípio print-driven
    # Regime deve vir de configuração manual/editorial
    return "NEUTRAL"


def apply_defensive_precedence(assets: List[str]) -> List[str]:
    """
    Aplica precedência de ativos defensivos (metais) quando regime é DEFENSIVE.
    Promove XAUUSD e XAGUSD para o início da lista, se estiverem presentes.
    Não remove nenhum ativo. Apenas reordena.
    """
    if not assets:
        return assets
    
    defensive_found = []
    other_assets = []
    
    for asset in assets:
        if asset in _DEFENSIVE_ASSETS:
            defensive_found.append(asset)
        else:
            other_assets.append(asset)
    
    # Reordenar: defensivos primeiro, depois os demais
    return defensive_found + other_assets


def normalize_theme(theme: str) -> str:
    """Normaliza tema dominante para lookup na tabela."""
    if not theme:
        return ""
    t = theme.lower().strip()
    # Mapeamentos comuns
    if any(x in t for x in ["hawkish", "alta de juros", "tightening", "apertamento"]):
        return "política monetária hawkish"
    if any(x in t for x in ["dovish", "corte de juros", "easing", "afrouxamento"]):
        return "política monetária dovish"
    if any(x in t for x in ["inflação alta", "inflation high", "pressão inflacionária"]):
        return "inflação alta"
    if any(x in t for x in ["inflação baixa", "inflation low", "desinflação"]):
        return "inflação baixa"
    if any(x in t for x in ["crescimento forte", "growth strong", "expansão"]):
        return "crescimento forte"
    if any(x in t for x in ["crescimento fraco", "growth weak", "recessão", "contração"]):
        return "crescimento fraco"
    if any(x in t for x in ["risco alto", "risk high", "aversion", "aversão"]):
        return "risco global alto"
    if any(x in t for x in ["risco baixo", "risk low", "appetite", "apetite"]):
        return "risco global baixo"
    return t


def get_highlighted_assets_for_narrative(
    dominant_themes: List[str],
    narrative_text: str = ""
) -> List[str]:
    """
    Retorna ativos em destaque baseado em temas dominantes da narrativa semanal.
    Sempre retorna ≥1 ativo. Sem probabilidade. Sem percentual.
    """
    if not dominant_themes:
        # Fallback: extrair tema do texto narrativo se disponível
        if narrative_text:
            normalized = normalize_theme(narrative_text[:200])
            if normalized in _THEME_TO_ASSETS:
                filtered = [a for a in _THEME_TO_ASSETS[normalized] if a in FTMO_SYMBOLS]
                if filtered:
                    return filtered[:5]
        return [a for a in _DEFAULT_HIGHLIGHTED_ASSETS if a in FTMO_SYMBOLS][:5]
    
    # Agregar ativos de todos os temas dominantes
    all_assets = []
    for theme in dominant_themes:
        normalized = normalize_theme(theme)
        if normalized in _THEME_TO_ASSETS:
            for asset in _THEME_TO_ASSETS[normalized]:
                if asset in FTMO_SYMBOLS and asset not in all_assets:
                    all_assets.append(asset)
    
    if all_assets:
        return all_assets[:8]
    
    return [a for a in _DEFAULT_HIGHLIGHTED_ASSETS if a in FTMO_SYMBOLS][:5]


def generate_weekly_narrative_assets(
    narrative_text: str = "",
    regional_overview: List[Dict] = None,
    dominant_themes: List[str] = None
) -> Dict[str, Any]:
    """
    Gera ativos em destaque para narrativa macro semanal.
    Retorna { ativos_em_destaque: List[str], macro_regime: str } com ≥1 ativo.
    Aplica precedência de ativos defensivos quando regime é DEFENSIVE.
    """
    themes = dominant_themes or []
    
    # Se não há temas explícitos, tentar extrair do texto narrativo
    if not themes and narrative_text:
        # Buscar palavras-chave que indicam temas
        text_lower = narrative_text.lower()
        if any(x in text_lower for x in ["hawkish", "alta de juros", "tightening"]):
            themes.append("política monetária hawkish")
        elif any(x in text_lower for x in ["dovish", "corte", "easing"]):
            themes.append("política monetária dovish")
        if any(x in text_lower for x in ["inflação", "inflation", "preços"]):
            if any(x in text_lower for x in ["alta", "high", "pressão"]):
                themes.append("inflação alta")
            else:
                themes.append("inflação baixa")
        if any(x in text_lower for x in ["crescimento", "growth", "expansão"]):
            if any(x in text_lower for x in ["forte", "strong", "robusto"]):
                themes.append("crescimento forte")
            else:
                themes.append("crescimento fraco")
    
    assets = get_highlighted_assets_for_narrative(themes, narrative_text)
    
    # Garantir ≥1 ativo
    if not assets:
        assets = ["DXY"]
    
    # Regime macro removido - violava princípio print-driven
    # Precedência defensiva removida - violava princípio print-driven
    # Retornar apenas ativos e temas, sem inferência de regime
    
    return {
        "ativos_em_destaque": assets,
        "temas_dominantes": themes[:3] if themes else [],
        # macro_regime removido - não inferir automaticamente
    }
