"""
Matriz determinística fixa de impacto de eventos.
Regras baseadas APENAS em actual vs forecast e direction (above/below).
Não é inferência — é aplicação de regras institucionais fixas.
"""
from typing import Dict, List, Tuple, Any

# Símbolos FTMO — única fonte de ativos permitidos.
FTMO_SYMBOLS = frozenset({
    "DXY", "EURUSD", "GBPUSD", "USDJPY", "USDCHF", "AUDUSD", "USDCAD",
    "XAUUSD", "XAGUSD", "US30", "NAS100", "SPX500", "BTCUSD",
    "EURJPY", "GBPJPY", "EURAUD", "AUDJPY",
})

# Constantes: (contexto 3–4 linhas, ativos {símbolo: prob}).
# actual > forecast = above; actual < forecast = below; actual == forecast = inline.
_EVENT_IMPACT_MATRIX: Dict[str, Dict[str, Dict[str, Any]]] = {
    "inflação": {
        "above": {
            "context": (
                "Resultado acima da previsão. Inflação acima do esperado tende a elevar expectativas de juros. "
                "Mercado reavalia política monetária. Ativos sensíveis: DXY, ouro, índices conforme regra fixa."
            ),
            "ativos": {"DXY": 0.92, "XAUUSD": 0.86, "SPX500": 0.81, "EURUSD": 0.78, "US30": 0.76},
        },
        "below": {
            "context": (
                "Resultado abaixo da previsão. Inflação mais baixa alivia pressão por alta de juros. "
                "Mercado reavalia horizonte de política. Ativos sensíveis conforme regra fixa."
            ),
            "ativos": {"XAUUSD": 0.88, "NAS100": 0.84, "SPX500": 0.82, "EURUSD": 0.79, "US30": 0.77},
        },
        "inline": {
            "context": (
                "Resultado em linha com a previsão. Sem surpresa; impacto limitado ao ambiente informativo. "
                "Ativos historicamente sensíveis a esse tipo de release mantêm relevância estatística."
            ),
            "ativos": {"DXY": 0.75, "XAUUSD": 0.74, "SPX500": 0.72},
        },
    },
    "emprego": {
        "above": {
            "context": (
                "Resultado acima da previsão. Emprego forte reforça expectativas de juros mais altos por mais tempo. "
                "Dólar e índices US costumam reagir conforme regra fixa."
            ),
            "ativos": {"DXY": 0.91, "US30": 0.85, "NAS100": 0.83, "EURUSD": 0.80, "XAUUSD": 0.78},
        },
        "below": {
            "context": (
                "Resultado abaixo da previsão. Emprego mais fraco tende a reduzir expectativas de alta de juros. "
                "Mercado reavalia ciclo; ativos sensíveis conforme regra fixa."
            ),
            "ativos": {"XAUUSD": 0.87, "EURUSD": 0.84, "NAS100": 0.82, "SPX500": 0.80, "DXY": 0.77},
        },
        "inline": {
            "context": (
                "Resultado em linha com a previsão. Sem surpresa de emprego; impacto limitado. "
                "Ativos sensíveis a employment mantêm relevância estatística."
            ),
            "ativos": {"DXY": 0.76, "US30": 0.74, "XAUUSD": 0.73},
        },
    },
    "atividade": {
        "above": {
            "context": (
                "Resultado acima da previsão. Atividade mais forte sustenta expectativas de crescimento e juros. "
                "Índices e DXY costumam reagir conforme regra fixa."
            ),
            "ativos": {"US30": 0.88, "SPX500": 0.86, "NAS100": 0.84, "DXY": 0.82, "EURUSD": 0.79},
        },
        "below": {
            "context": (
                "Resultado abaixo da previsão. Atividade mais fraca alimenta expectativas de cortes. "
                "Mercado reavalia crescimento; ativos sensíveis conforme regra fixa."
            ),
            "ativos": {"XAUUSD": 0.85, "EURUSD": 0.82, "DXY": 0.78, "US30": 0.76, "SPX500": 0.74},
        },
        "inline": {
            "context": (
                "Resultado em linha com a previsão. Sem surpresa de atividade; impacto limitado. "
                "Ativos sensíveis a dados de atividade mantêm relevância."
            ),
            "ativos": {"US30": 0.75, "DXY": 0.73, "XAUUSD": 0.72},
        },
    },
    "bc": {
        "above": {
            "context": (
                "Comunicação/ decisão mais hawkish do que o esperado. Mercado reavalia trajetória de juros. "
                "DXY e pares da moeda costumam reagir conforme regra fixa."
            ),
            "ativos": {"DXY": 0.90, "EURUSD": 0.85, "XAUUSD": 0.82, "US30": 0.80, "GBPUSD": 0.78},
        },
        "below": {
            "context": (
                "Comunicação/ decisão mais dove do que o esperado. Mercado antecipa juros menores por mais tempo. "
                "Ativos sensíveis a política monetária conforme regra fixa."
            ),
            "ativos": {"XAUUSD": 0.88, "EURUSD": 0.85, "NAS100": 0.83, "DXY": 0.79, "SPX500": 0.78},
        },
        "inline": {
            "context": (
                "Comunicação em linha com o esperado. Sem surpresa de BC; impacto limitado ao ambiente informativo. "
                "Ativos sensíveis a decisões de BC mantêm relevância."
            ),
            "ativos": {"DXY": 0.76, "XAUUSD": 0.75, "EURUSD": 0.74},
        },
    },
}

FALLBACK_CONTEXT = "Evento sem impacto macro direto mapeado."


def _direction(actual: float, forecast: float) -> str:
    if actual > forecast:
        return "above"
    if actual < forecast:
        return "below"
    return "inline"


def get_context_for_rule(event_type: str, direction: str) -> str:
    """Retorna o texto de contexto (3–4 linhas) da regra. Nunca retorna 'análise indisponível'."""
    if event_type not in _EVENT_IMPACT_MATRIX:
        return FALLBACK_CONTEXT
    by_dir = _EVENT_IMPACT_MATRIX[event_type]
    if direction not in by_dir:
        return FALLBACK_CONTEXT
    ctx = by_dir[direction].get("context")
    return ctx if ctx else FALLBACK_CONTEXT


def get_ativos_for_rule(
    event_type: str,
    direction: str,
    min_prob: float = 0.80,
    fallback_min: float = 0.70,
    top_n: int = 3,
) -> List[Tuple[str, float]]:
    """
    Retorna ativos da regra: primeiro os com prob >= min_prob (0.80);
    se nenhum, os TOP top_n com prob >= fallback_min (0.70).
    Só símbolos FTMO. Nunca retorna lista vazia se houver regra aplicada.
    """
    if event_type not in _EVENT_IMPACT_MATRIX or direction not in _EVENT_IMPACT_MATRIX[event_type]:
        return []
    ativos_raw: Dict[str, float] = _EVENT_IMPACT_MATRIX[event_type][direction].get("ativos") or {}
    # Filtrar só FTMO e normalizar
    filtered = [
        (s, p) for s, p in ativos_raw.items()
        if s in FTMO_SYMBOLS and isinstance(p, (int, float)) and 0 <= p <= 1
    ]
    if not filtered:
        return []

    acima = [(s, p) for s, p in filtered if p >= min_prob]
    if acima:
        return sorted(acima, key=lambda x: -x[1])

    fallback = [(s, p) for s, p in filtered if p >= fallback_min]
    fallback.sort(key=lambda x: -x[1])
    return fallback[:top_n]


def principal_secundarios_from_ativos(ativos: List[Tuple[str, float]]) -> Dict[str, Any]:
    """Converte lista (símbolo, prob) em { principal, secundarios } para o contrato da API."""
    if not ativos:
        return {"principal": "DXY", "secundarios": []}
    principal = ativos[0][0]
    secundarios = [s for s, _ in ativos[1:]]
    return {"principal": principal, "secundarios": secundarios[:4]}
