"""
Tabela fixa institucional: eventos macro NÃO favorecem ativos absolutos.
Eles geram CONTEXTO DIRECIONAL RELATIVO por moeda ou classe.
Ativos são RELACIONAIS fixos, derivados por (event_type, currency_or_class).
Sem probabilidade. Sem inferência.
"""
from typing import Any, Dict, List, Tuple

# Símbolos FTMO — única fonte de ativos permitidos.
FTMO_SYMBOLS = frozenset({
    "DXY", "EURUSD", "GBPUSD", "USDJPY", "USDCHF", "AUDUSD", "USDCAD",
    "XAUUSD", "XAGUSD", "US30", "NAS100", "SPX500", "BTCUSD",
    "EURJPY", "GBPJPY", "EURAUD", "AUDJPY",
})

# (event_type, currency) -> derived_assets[] (apenas FTMO). Ordem: mais relevante primeiro.
# Regra: com currency, PELO MENOS 1 ativo relacionado.
_TABLE: List[Tuple[str, str, List[str]]] = [
    ("inflação", "USD", ["DXY", "EURUSD", "XAUUSD", "SPX500"]),
    ("inflação", "EUR", ["EURUSD", "DXY", "XAUUSD", "EURJPY"]),
    ("inflação", "GBP", ["GBPUSD", "DXY", "XAUUSD", "GBPJPY"]),
    ("inflação", "JPY", ["USDJPY", "DXY", "XAUUSD", "EURJPY"]),
    ("inflação", "AUD", ["AUDUSD", "AUDJPY", "EURAUD", "XAUUSD"]),
    ("inflação", "CAD", ["USDCAD", "AUDUSD", "DXY", "XAUUSD"]),
    ("inflação", "CHF", ["USDCHF", "DXY", "EURUSD", "XAUUSD"]),
    ("emprego", "USD", ["DXY", "US30", "NAS100", "EURUSD", "XAUUSD"]),
    ("emprego", "EUR", ["EURUSD", "DXY", "XAUUSD", "EURJPY"]),
    ("emprego", "GBP", ["GBPUSD", "DXY", "EURUSD", "XAUUSD"]),
    ("emprego", "JPY", ["USDJPY", "DXY", "XAUUSD", "US30"]),
    ("emprego", "AUD", ["AUDUSD", "AUDJPY", "DXY", "XAUUSD"]),
    ("emprego", "CAD", ["USDCAD", "DXY", "AUDUSD", "XAUUSD"]),
    ("emprego", "CHF", ["USDCHF", "DXY", "EURUSD", "XAUUSD"]),
    ("atividade", "USD", ["US30", "SPX500", "NAS100", "DXY", "EURUSD"]),
    ("atividade", "EUR", ["EURUSD", "DXY", "XAUUSD", "EURJPY"]),
    ("atividade", "GBP", ["GBPUSD", "DXY", "EURUSD", "XAUUSD"]),
    ("atividade", "JPY", ["USDJPY", "DXY", "XAUUSD", "US30"]),
    ("atividade", "AUD", ["AUDUSD", "EURAUD", "AUDJPY", "XAUUSD"]),
    ("atividade", "CAD", ["USDCAD", "DXY", "AUDUSD", "XAUUSD"]),
    ("atividade", "CHF", ["USDCHF", "EURUSD", "DXY", "XAUUSD"]),
    ("bc", "USD", ["DXY", "EURUSD", "XAUUSD", "US30"]),
    ("bc", "EUR", ["EURUSD", "DXY", "XAUUSD", "GBPUSD"]),
    ("bc", "GBP", ["GBPUSD", "DXY", "EURUSD", "XAUUSD"]),
    ("bc", "JPY", ["USDJPY", "DXY", "XAUUSD", "US30"]),
    ("bc", "AUD", ["AUDUSD", "AUDJPY", "EURAUD", "DXY"]),
    ("bc", "CAD", ["USDCAD", "DXY", "AUDUSD", "XAUUSD"]),
    ("bc", "CHF", ["USDCHF", "EURUSD", "DXY", "XAUUSD"]),
]

# Cache (event_type, currency) -> lista filtrada FTMO
_CACHE: Dict[Tuple[str, str], List[str]] = {}


def _build_cache() -> None:
    for event_type, currency, assets in _TABLE:
        key = (event_type, currency.upper())
        filtered = [a for a in assets if a in FTMO_SYMBOLS]
        if filtered:
            _CACHE[key] = filtered


_build_cache()

# Fallback genérico por tipo (quando currency não está na tabela).
_DEFAULT_BY_TYPE: Dict[str, List[str]] = {
    "inflação": ["DXY", "EURUSD", "XAUUSD", "SPX500"],
    "emprego": ["DXY", "US30", "NAS100", "EURUSD", "XAUUSD"],
    "atividade": ["US30", "SPX500", "NAS100", "DXY", "EURUSD"],
    "bc": ["DXY", "EURUSD", "XAUUSD", "US30"],
}

# Fallback por moeda (quando tipo não está na tabela): ativos relacionados à moeda.
_DEFAULT_BY_CURRENCY: Dict[str, List[str]] = {
    "USD": ["DXY", "EURUSD", "US30", "SPX500", "XAUUSD"],
    "EUR": ["EURUSD", "DXY", "EURJPY", "XAUUSD"],
    "GBP": ["GBPUSD", "DXY", "EURUSD", "GBPJPY"],
    "JPY": ["USDJPY", "DXY", "EURJPY", "XAUUSD"],
    "AUD": ["AUDUSD", "AUDJPY", "EURAUD", "DXY"],
    "CAD": ["USDCAD", "AUDUSD", "DXY", "XAUUSD"],
    "CHF": ["USDCHF", "EURUSD", "DXY", "XAUUSD"],
}

# =========================================================
# CONTRATO INSTITUCIONAL: Ativos favorecidos por evento
#
# - Eventos NUNCA podem retornar lista vazia de ativos se tiverem currency.
# - Proibido condicionar ativos ao resultado (actual).
# - Fallback final NUNCA vazio (com currency).
# =========================================================

# Lookup por tipo de evento (somente FTMO). Ordem: mais relevante primeiro.
EVENT_TYPE_TO_ASSETS: Dict[str, List[str]] = dict(_DEFAULT_BY_TYPE)

# Fallback por moeda (OBRIGATÓRIO) quando tipo não mapear.
DEFAULT_ASSETS_BY_CURRENCY: Dict[str, List[str]] = dict(_DEFAULT_BY_CURRENCY)

# Fallback final institucional (NUNCA vazio quando há currency).
GLOBAL_FALLBACK_ASSETS: List[str] = ["DXY", "XAUUSD"]

# Fallback por moeda (um ativo por moeda) — regra absoluta. Nunca array vazio.
CURRENCY_PRIMARY_ASSET: Dict[str, str] = {
    "EUR": "EURUSD",
    "USD": "DXY",
    "GBP": "GBPUSD",
    "AUD": "AUDUSD",
    "CAD": "USDCAD",
    "JPY": "USDJPY",
    "CHF": "USDCHF",
}


def _filter_ftmo_unique(items: List[str]) -> List[str]:
    out: List[str] = []
    for a in (items or []):
        s = str(a).strip()
        if not s:
            continue
        if s not in FTMO_SYMBOLS:
            continue
        if s not in out:
            out.append(s)
    return out


def normalize_event_type(event_type: str) -> str:
    """Normaliza event_type para lookup na tabela."""
    if not event_type:
        return "atividade"
    t = event_type.lower().strip()
    # Suporte defensivo: quando recebe "title" (ex: CPI/NFP/PMI/FOMC), inferir tipo determinístico.
    # (Não usa dados externos; apenas palavras-chave fixas.)
    if any(x in t for x in ["cpi", "pce", "inflation", "inflação", "inflacao", "pci", "ppi"]):
        return "inflação"
    if any(x in t for x in ["employment", "nfp", "jobless", "unemployment", "emprego", "payroll", "jolts"]):
        return "emprego"
    if any(x in t for x in ["gdp", "pmi", "industrial", "retail", "manufacturing", "activity", "atividade"]):
        return "atividade"
    if any(x in t for x in ["rate", "fomc", "ecb", "boe", "boj", "central bank", "bc", "decision", "decisão"]):
        return "bc"
    if t in ("inflação", "inflacao", "inflation"):
        return "inflação"
    if t in ("emprego", "employment"):
        return "emprego"
    if t in ("bc", "banco central", "central bank"):
        return "bc"
    if t in ("atividade", "activity"):
        return "atividade"
    return "atividade"


def get_derived_assets_for_event(event_type: str, currency: str) -> List[str]:
    """
    Retorna ativos RELACIONAIS fixos por (event_type, currency).
    Normaliza event_type antes do lookup. Fallback por moeda se tipo não encontrado.
    Com currency: PELO MENOS 1 ativo. PROIBIDO retornar array vazio.
    """
    normalized_type = normalize_event_type(event_type)
    cc = (currency or "USD").upper()
    key = (normalized_type, cc)
    
    # Lookup na tabela principal
    if key in _CACHE:
        result = list(_CACHE[key])
        if result:
            return result
    
    # Fallback 1: por tipo (usando USD como moeda padrão)
    fallback_type = _DEFAULT_BY_TYPE.get(normalized_type, _DEFAULT_BY_TYPE["atividade"])
    filtered_type = [a for a in fallback_type if a in FTMO_SYMBOLS]
    if filtered_type:
        return filtered_type
    
    # Fallback 2: por moeda (quando tipo não encontrado)
    fallback_currency = _DEFAULT_BY_CURRENCY.get(cc, _DEFAULT_BY_CURRENCY["USD"])
    filtered_currency = [a for a in fallback_currency if a in FTMO_SYMBOLS]
    if filtered_currency:
        return filtered_currency
    
    # Fallback final: sempre retornar ≥1 ativo
    return ["DXY"]


def get_favored_assets(event: Dict[str, Any]) -> List[str]:
    """
    Regra institucional (DEFINITIVA):
    - Se houver currency, retornar SEMPRE ≥1 ativo (nunca lista vazia).
    - Ativos NÃO dependem de actual/resultado.
    - Ordem de fallback:
      1) Normalização defensiva (currency + tipo a partir do title/event)
      2) Lookup por tipo de evento (EVENT_TYPE_TO_ASSETS)
      3) Fallback por moeda (DEFAULT_ASSETS_BY_CURRENCY) — OBRIGATÓRIO
      4) Fallback final institucional (GLOBAL_FALLBACK_ASSETS) — NUNCA vazio
    """
    if not isinstance(event, dict):
        return []

    currency = event.get("currency")
    if not currency or not str(currency).strip():
        return []
    cc = str(currency).strip().upper()

    title = event.get("title") or event.get("event") or event.get("name") or ""
    event_type = normalize_event_type(str(title))

    assets = EVENT_TYPE_TO_ASSETS.get(event_type)
    assets_list = _filter_ftmo_unique(list(assets or []))

    if not assets_list:
        assets_list = _filter_ftmo_unique(list(DEFAULT_ASSETS_BY_CURRENCY.get(cc, []) or []))

    if not assets_list:
        assets_list = _filter_ftmo_unique(list(GLOBAL_FALLBACK_ASSETS))

    # Fallback por moeda (um ativo): EUR→EURUSD, USD→DXY, GBP→GBPUSD, etc.
    if not assets_list:
        primary = CURRENCY_PRIMARY_ASSET.get(cc)
        if primary and primary in FTMO_SYMBOLS:
            return [primary]
    # Garantia final: com currency, nunca vazio (mesmo se FTMO_SYMBOLS mudar no futuro)
    if not assets_list:
        return ["DXY"]
    return assets_list


def to_principal_secundarios(assets: List[str]) -> Dict[str, Any]:
    """Converte lista de ativos em { principal, secundarios } para o contrato da API."""
    if not assets:
        return {"principal": "DXY", "secundarios": []}
    return {"principal": assets[0], "secundarios": list(assets[1:5])}
