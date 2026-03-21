"""
MRKT Edge — FTMO Official Tradable Assets Universe

Lista oficial e centralizada de ativos negociáveis na mesa proprietária FTMO.
Este arquivo define o universo de ativos permitidos para análise macro institucional.

Responsabilidades:
- Definir universo oficial de ativos FTMO
- Categorizar ativos por classe (Forex Major, Forex Minor, etc.)
- Fornecer funções de validação e busca
- Garantir que apenas ativos FTMO sejam utilizados na análise

Conformidade:
- Baseado na lista oficial FTMO (https://ftmo.com/en/symbols/)
- Atualizado conforme mudanças na mesa proprietária
- Sem ativos inventados ou não negociáveis
"""

from typing import Dict, List, Optional, Set
from dataclasses import dataclass


@dataclass
class FTMOAsset:
    """Representa um ativo negociável na FTMO."""
    symbol: str
    category: str
    description: Optional[str] = None


# ============================================================================
# FOREX MAJORS (7 pares principais)
# ============================================================================

FOREX_MAJORS = [
    FTMOAsset("EURUSD", "Forex Major", "Euro vs US Dollar"),
    FTMOAsset("GBPUSD", "Forex Major", "British Pound vs US Dollar"),
    FTMOAsset("USDJPY", "Forex Major", "US Dollar vs Japanese Yen"),
    FTMOAsset("USDCHF", "Forex Major", "US Dollar vs Swiss Franc"),
    FTMOAsset("AUDUSD", "Forex Major", "Australian Dollar vs US Dollar"),
    FTMOAsset("USDCAD", "Forex Major", "US Dollar vs Canadian Dollar"),
    FTMOAsset("NZDUSD", "Forex Major", "New Zealand Dollar vs US Dollar"),
]

# ============================================================================
# FOREX MINORS (Crosses principais)
# ============================================================================

FOREX_MINORS = [
    FTMOAsset("EURGBP", "Forex Minor", "Euro vs British Pound"),
    FTMOAsset("EURJPY", "Forex Minor", "Euro vs Japanese Yen"),
    FTMOAsset("EURCHF", "Forex Minor", "Euro vs Swiss Franc"),
    FTMOAsset("EURAUD", "Forex Minor", "Euro vs Australian Dollar"),
    FTMOAsset("EURCAD", "Forex Minor", "Euro vs Canadian Dollar"),
    FTMOAsset("GBPJPY", "Forex Minor", "British Pound vs Japanese Yen"),
    FTMOAsset("GBPCHF", "Forex Minor", "British Pound vs Swiss Franc"),
    FTMOAsset("GBPAUD", "Forex Minor", "British Pound vs Australian Dollar"),
    FTMOAsset("AUDJPY", "Forex Minor", "Australian Dollar vs Japanese Yen"),
    FTMOAsset("AUDNZD", "Forex Minor", "Australian Dollar vs New Zealand Dollar"),
    FTMOAsset("NZDJPY", "Forex Minor", "New Zealand Dollar vs Japanese Yen"),
    FTMOAsset("CADJPY", "Forex Minor", "Canadian Dollar vs Japanese Yen"),
    FTMOAsset("CHFJPY", "Forex Minor", "Swiss Franc vs Japanese Yen"),
]

# ============================================================================
# FOREX EXÓTICOS (Principais exóticos negociáveis)
# ============================================================================

FOREX_EXOTICS = [
    FTMOAsset("USDZAR", "Forex Exotic", "US Dollar vs South African Rand"),
    FTMOAsset("USDTRY", "Forex Exotic", "US Dollar vs Turkish Lira"),
    FTMOAsset("USDSEK", "Forex Exotic", "US Dollar vs Swedish Krona"),
    FTMOAsset("USDNOK", "Forex Exotic", "US Dollar vs Norwegian Krone"),
    FTMOAsset("USDMXN", "Forex Exotic", "US Dollar vs Mexican Peso"),
    FTMOAsset("EURTRY", "Forex Exotic", "Euro vs Turkish Lira"),
    FTMOAsset("EURZAR", "Forex Exotic", "Euro vs South African Rand"),
]

# ============================================================================
# ÍNDICES (Principais índices globais)
# ============================================================================

INDICES = [
    FTMOAsset("SPX500", "Index", "S&P 500 Index"),
    FTMOAsset("NAS100", "Index", "NASDAQ 100 Index"),
    FTMOAsset("US30", "Index", "Dow Jones Industrial Average"),
    FTMOAsset("UK100", "Index", "FTSE 100 Index"),
    FTMOAsset("GER40", "Index", "DAX 40 Index"),
    FTMOAsset("FRA40", "Index", "CAC 40 Index"),
    FTMOAsset("EU50", "Index", "Euro Stoxx 50"),
    FTMOAsset("JPN225", "Index", "Nikkei 225 Index"),
    FTMOAsset("AUS200", "Index", "ASX 200 Index"),
    FTMOAsset("HK50", "Index", "Hang Seng Index"),
    FTMOAsset("DXY", "Index", "US Dollar Index"),
]

# ============================================================================
# COMMODITIES (Energias e soft commodities)
# ============================================================================

COMMODITIES = [
    FTMOAsset("XTIUSD", "Commodity", "WTI Crude Oil"),
    FTMOAsset("XBRUSD", "Commodity", "Brent Crude Oil"),
    FTMOAsset("NATGAS", "Commodity", "Natural Gas"),
    FTMOAsset("COPPER", "Commodity", "Copper"),
    FTMOAsset("WHEAT", "Commodity", "Wheat"),
    FTMOAsset("CORN", "Commodity", "Corn"),
    FTMOAsset("SUGAR", "Commodity", "Sugar"),
]

# ============================================================================
# METALS (Metais preciosos)
# ============================================================================

METALS = [
    FTMOAsset("XAUUSD", "Metal", "Gold vs US Dollar"),
    FTMOAsset("XAGUSD", "Metal", "Silver vs US Dollar"),
    FTMOAsset("XPDUSD", "Metal", "Palladium vs US Dollar"),
    FTMOAsset("XPTUSD", "Metal", "Platinum vs US Dollar"),
]

# ============================================================================
# CRYPTO (Criptomoedas principais)
# ============================================================================

CRYPTO = [
    FTMOAsset("BTCUSD", "Crypto", "Bitcoin vs US Dollar"),
    FTMOAsset("ETHUSD", "Crypto", "Ethereum vs US Dollar"),
    FTMOAsset("LTCUSD", "Crypto", "Litecoin vs US Dollar"),
    FTMOAsset("XRPUSD", "Crypto", "Ripple vs US Dollar"),
    FTMOAsset("BCHUSD", "Crypto", "Bitcoin Cash vs US Dollar"),
]

# ============================================================================
# STOCKS (Principais ações - se disponível na FTMO)
# ============================================================================

STOCKS = [
    FTMOAsset("AAPL", "Stock", "Apple Inc."),
    FTMOAsset("MSFT", "Stock", "Microsoft Corporation"),
    FTMOAsset("GOOGL", "Stock", "Alphabet Inc."),
    FTMOAsset("AMZN", "Stock", "Amazon.com Inc."),
    FTMOAsset("TSLA", "Stock", "Tesla Inc."),
    FTMOAsset("META", "Stock", "Meta Platforms Inc."),
    FTMOAsset("NVDA", "Stock", "NVIDIA Corporation"),
]

# ============================================================================
# UNIVERSE COMPLETO
# ============================================================================

ALL_FTMO_ASSETS: List[FTMOAsset] = (
    FOREX_MAJORS +
    FOREX_MINORS +
    FOREX_EXOTICS +
    INDICES +
    COMMODITIES +
    METALS +
    CRYPTO +
    STOCKS
)

# Dicionário para busca rápida por símbolo
FTMO_ASSETS_DICT: Dict[str, FTMOAsset] = {
    asset.symbol: asset for asset in ALL_FTMO_ASSETS
}

# Set de símbolos para validação rápida
FTMO_SYMBOLS: Set[str] = {asset.symbol for asset in ALL_FTMO_ASSETS}

# Mapeamento de categorias para listas de ativos
CATEGORY_MAP: Dict[str, List[FTMOAsset]] = {
    "Forex Major": FOREX_MAJORS,
    "Forex Minor": FOREX_MINORS,
    "Forex Exotic": FOREX_EXOTICS,
    "Index": INDICES,
    "Commodity": COMMODITIES,
    "Metal": METALS,
    "Crypto": CRYPTO,
    "Stock": STOCKS,
}

# ============================================================================
# FUNÇÕES DE VALIDAÇÃO E BUSCA
# ============================================================================

def is_ftmo_asset(symbol: str) -> bool:
    """
    Verifica se um símbolo é um ativo FTMO válido.
    
    Args:
        symbol: Símbolo do ativo (ex: "EURUSD", "XAUUSD")
    
    Returns:
        bool: True se o ativo é negociável na FTMO
    """
    return symbol.upper() in FTMO_SYMBOLS


def get_ftmo_asset(symbol: str) -> Optional[FTMOAsset]:
    """
    Retorna informações de um ativo FTMO.
    
    Args:
        symbol: Símbolo do ativo
    
    Returns:
        FTMOAsset: Objeto do ativo ou None se não encontrado
    """
    return FTMO_ASSETS_DICT.get(symbol.upper())


def get_assets_by_category(category: str) -> List[FTMOAsset]:
    """
    Retorna lista de ativos de uma categoria específica.
    
    Args:
        category: Categoria (ex: "Forex Major", "Metal", "Index")
    
    Returns:
        List[FTMOAsset]: Lista de ativos da categoria
    """
    return CATEGORY_MAP.get(category, [])


def get_correlated_assets(symbol: str) -> List[str]:
    """
    Retorna lista de símbolos correlacionados a um ativo.
    
    Baseado em clusters macro:
    - Forex: pares com mesma moeda base ou cotação
    - Metais: outros metais preciosos
    - Índices: índices da mesma região
    - Commodities: outras commodities da mesma classe
    
    Args:
        symbol: Símbolo do ativo
    
    Returns:
        List[str]: Lista de símbolos correlacionados
    """
    symbol_upper = symbol.upper()
    correlated = []
    
    asset = get_ftmo_asset(symbol_upper)
    if not asset:
        return []
    
    # Clusters Forex
    if asset.category in ["Forex Major", "Forex Minor", "Forex Exotic"]:
        # Pares com mesma moeda base
        base_currency = symbol_upper[:3]
        quote_currency = symbol_upper[3:]
        
        for other_asset in FOREX_MAJORS + FOREX_MINORS + FOREX_EXOTICS:
            if other_asset.symbol != symbol_upper:
                if (other_asset.symbol.startswith(base_currency) or 
                    other_asset.symbol.endswith(base_currency) or
                    other_asset.symbol.startswith(quote_currency) or
                    other_asset.symbol.endswith(quote_currency)):
                    correlated.append(other_asset.symbol)
    
    # Clusters Metais
    elif asset.category == "Metal":
        for metal in METALS:
            if metal.symbol != symbol_upper:
                correlated.append(metal.symbol)
    
    # Clusters Índices
    elif asset.category == "Index":
        # Índices US
        if symbol_upper in ["SPX500", "NAS100", "US30", "DXY"]:
            for idx in ["SPX500", "NAS100", "US30", "DXY"]:
                if idx != symbol_upper:
                    correlated.append(idx)
        # Índices Europeus
        elif symbol_upper in ["UK100", "GER40", "FRA40", "EU50"]:
            for idx in ["UK100", "GER40", "FRA40", "EU50"]:
                if idx != symbol_upper:
                    correlated.append(idx)
        # Índices Asiáticos
        elif symbol_upper in ["JPN225", "AUS200", "HK50"]:
            for idx in ["JPN225", "AUS200", "HK50"]:
                if idx != symbol_upper:
                    correlated.append(idx)
    
    # Clusters Commodities
    elif asset.category == "Commodity":
        # Energias
        if symbol_upper in ["XTIUSD", "XBRUSD", "NATGAS"]:
            for comm in ["XTIUSD", "XBRUSD", "NATGAS"]:
                if comm != symbol_upper:
                    correlated.append(comm)
        # Soft commodities
        elif symbol_upper in ["WHEAT", "CORN", "SUGAR"]:
            for comm in ["WHEAT", "CORN", "SUGAR"]:
                if comm != symbol_upper:
                    correlated.append(comm)
    
    # Clusters Crypto
    elif asset.category == "Crypto":
        for crypto in CRYPTO:
            if crypto.symbol != symbol_upper:
                correlated.append(crypto.symbol)
    
    return correlated[:10]  # Limitar a 10 para performance


def normalize_symbol(symbol: str) -> Optional[str]:
    """
    Normaliza símbolo para formato FTMO padrão.
    
    Converte variações comuns:
    - "S&P 500" → "SPX500"
    - "Nasdaq" → "NAS100"
    - "Gold" → "XAUUSD"
    - "Bitcoin" → "BTCUSD"
    
    Args:
        symbol: Símbolo a normalizar
    
    Returns:
        str: Símbolo normalizado ou None se não encontrado
    """
    # Mapeamento de variações comuns
    normalization_map = {
        "S&P 500": "SPX500",
        "S&P500": "SPX500",
        "SPX": "SPX500",
        "Nasdaq": "NAS100",
        "NASDAQ": "NAS100",
        "NDX": "NAS100",
        "Dow": "US30",
        "DJIA": "US30",
        "DXY": "DXY",
        "USDX": "DXY",
        "XAUUSD": "XAUUSD",
        "Gold": "XAUUSD",
        "GOLD": "XAUUSD",
        "XAGUSD": "XAGUSD",
        "Silver": "XAGUSD",
        "SILVER": "XAGUSD",
        "Bitcoin": "BTCUSD",
        "BTC": "BTCUSD",
        "BTC/USD": "BTCUSD",
        "Ethereum": "ETHUSD",
        "ETH": "ETHUSD",
        "ETH/USD": "ETHUSD",
        "OIL": "XTIUSD",
        "WTI": "XTIUSD",
        "Crude Oil": "XTIUSD",
    }
    
    # Tentar normalização direta
    normalized = normalization_map.get(symbol)
    if normalized and is_ftmo_asset(normalized):
        return normalized
    
    # Tentar busca case-insensitive
    symbol_upper = symbol.upper()
    if is_ftmo_asset(symbol_upper):
        return symbol_upper
    
    # Tentar busca parcial
    for ftmo_symbol in FTMO_SYMBOLS:
        if symbol_upper in ftmo_symbol or ftmo_symbol in symbol_upper:
            return ftmo_symbol
    
    return None


def validate_and_normalize(symbol: str) -> Optional[str]:
    """
    Valida e normaliza um símbolo para formato FTMO.
    
    Args:
        symbol: Símbolo a validar/normalizar
    
    Returns:
        str: Símbolo FTMO válido ou None se inválido
    """
    normalized = normalize_symbol(symbol)
    if normalized and is_ftmo_asset(normalized):
        return normalized
    return None
