"""
MRKT Edge — FTMO Assets Module

Módulo contendo o universo oficial de ativos negociáveis na FTMO.
"""

from macro_analysis.assets.ftmo_assets import (
    FTMOAsset,
    ALL_FTMO_ASSETS,
    FTMO_SYMBOLS,
    FTMO_ASSETS_DICT,
    is_ftmo_asset,
    get_ftmo_asset,
    get_assets_by_category,
    get_correlated_assets,
    normalize_symbol,
    validate_and_normalize,
    FOREX_MAJORS,
    FOREX_MINORS,
    FOREX_EXOTICS,
    INDICES,
    COMMODITIES,
    METALS,
    CRYPTO,
    STOCKS,
)

__all__ = [
    "FTMOAsset",
    "ALL_FTMO_ASSETS",
    "FTMO_SYMBOLS",
    "FTMO_ASSETS_DICT",
    "is_ftmo_asset",
    "get_ftmo_asset",
    "get_assets_by_category",
    "get_correlated_assets",
    "normalize_symbol",
    "validate_and_normalize",
    "FOREX_MAJORS",
    "FOREX_MINORS",
    "FOREX_EXOTICS",
    "INDICES",
    "COMMODITIES",
    "METALS",
    "CRYPTO",
    "STOCKS",
]
