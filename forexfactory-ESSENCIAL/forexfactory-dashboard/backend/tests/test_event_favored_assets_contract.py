"""
Testes obrigatórios — Contrato de ativos favorecidos por evento.

Regras:
- Evento com currency → favored_assets deve ter ≥1 ativo (nunca vazio)
- Evento sem resultado (actual None) → ainda retorna ativos
"""

import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from analysis.event_currency_bias import get_favored_assets


@pytest.mark.parametrize("event", [
    {"title": "CPI", "currency": "USD", "actual": None},
    {"title": "NFP", "currency": "EUR", "actual": None},
    {"title": "PMI Manufacturing", "currency": "GBP", "actual": None},
    {"title": "FOMC Decision", "currency": "JPY", "actual": None},
    {"title": "Evento desconhecido", "currency": "AUD", "actual": None},
])
def test_event_with_currency_never_returns_empty_favored_assets(event):
    assets = get_favored_assets(event)
    assert isinstance(assets, list)
    assert len(assets) >= 1, (
        f"VIOLAÇÃO INSTITUCIONAL: evento com currency={event.get('currency')!r} retornou assets vazio: {assets}. "
        f"Build deve falhar."
    )
    assert all(isinstance(a, str) and a.strip() for a in assets)


def test_event_without_currency_can_return_empty_assets():
    assets = get_favored_assets({"title": "CPI", "currency": None, "actual": None})
    assert assets == [], "Sem currency, retorno pode ser lista vazia."

