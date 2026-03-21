"""
Testes obrigatórios — Cursor da semana e contratos de eventos.

Regras:
- Ordem da semana (Mon < Tue < Wed < Thu < Fri) é consistente em todo o código.
- Todo evento com currency retorna ≥1 ativo favorecido → build falha se vazio.
- NOTA: actual NÃO é bloqueado por cursor. Se Forex Factory divulgou, o sistema exibe.
"""

import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.week_cursor import WEEKDAY_ORDER, is_event_future
from analysis.event_currency_bias import get_favored_assets, CURRENCY_PRIMARY_ASSET


# ---- test_week_order_consistency ----

def test_week_order_consistency():
    """Ordem fixa da semana: Mon < Tue < Wed < Thu < Fri. Mesma ordem em todo o código."""
    assert WEEKDAY_ORDER["Monday"] == 0
    assert WEEKDAY_ORDER["Tuesday"] == 1
    assert WEEKDAY_ORDER["Wednesday"] == 2
    assert WEEKDAY_ORDER["Thursday"] == 3
    assert WEEKDAY_ORDER["Friday"] == 4
    assert WEEKDAY_ORDER["Monday"] < WEEKDAY_ORDER["Tuesday"] < WEEKDAY_ORDER["Wednesday"] < WEEKDAY_ORDER["Thursday"] < WEEKDAY_ORDER["Friday"]
    # Fim de semana após sexta
    assert WEEKDAY_ORDER["Friday"] < WEEKDAY_ORDER.get("Saturday", 5)
    assert WEEKDAY_ORDER["Friday"] < WEEKDAY_ORDER.get("Sunday", 6)


# ---- test_is_event_future (utilitário) ----

def test_is_event_future_past_event_returns_false():
    """Evento no passado em relação ao cursor → não é futuro."""
    # Cursor Wednesday 14:00 = (2, 840)
    assert is_event_future("Monday", 600, "Wednesday", 840) is False
    assert is_event_future("Tuesday", 0, "Wednesday", 840) is False
    assert is_event_future("Wednesday", 839, "Wednesday", 840) is False
    assert is_event_future("Wednesday", 840, "Wednesday", 840) is False  # mesmo instante = já ocorreu


def test_is_event_future_future_event_returns_true():
    """Evento após o cursor → é futuro."""
    # Cursor Wednesday 14:00 = (2, 840)
    assert is_event_future("Wednesday", 841, "Wednesday", 840) is True
    assert is_event_future("Thursday", 0, "Wednesday", 840) is True
    assert is_event_future("Friday", 0, "Wednesday", 840) is True


# ---- test_event_assets_never_empty ----

@pytest.mark.parametrize("currency", list(CURRENCY_PRIMARY_ASSET.keys()))
def test_event_assets_never_empty_for_each_currency(currency):
    """Todo evento com currency retorna ≥1 ativo. Nunca array vazio."""
    event = {"title": "Any Event", "currency": currency, "actual": None}
    assets = get_favored_assets(event)
    assert isinstance(assets, list)
    assert len(assets) >= 1, (
        f"VIOLAÇÃO INSTITUCIONAL: evento com currency={currency!r} retornou assets vazio: {assets}. Build deve falhar."
    )
    assert all(isinstance(a, str) and a.strip() for a in assets)


def test_event_assets_never_empty_unknown_currency_fallback():
    """Moeda não mapeada ainda retorna ≥1 ativo (fallback DXY)."""
    event = {"title": "Event", "currency": "XXX", "actual": None}
    assets = get_favored_assets(event)
    assert isinstance(assets, list)
    assert len(assets) >= 1, (
        "VIOLAÇÃO: evento com currency XXX deve retornar ≥1 ativo (fallback institucional). Build deve falhar."
    )
