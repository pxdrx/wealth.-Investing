"""
Testes obrigatórios — Veredito final eventos semanais.
- Todo evento possui análise textual; nunca "Análise indisponível".
- Eventos com currency retornam ≥1 ativo relacionado.
Se qualquer teste falhar → build falha.
"""
import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from event_analysis_generator import generate_event_analysis

PROIBIDO = ("Análise não disponível", "Análise indisponível", "análise indisponível", "análise não disponível")


@pytest.mark.parametrize("event", [
    {"id": "ev1", "title": "CPI", "currency": "USD", "forecast": "3.2", "actual": "3.5", "previous": "3.1"},
    {"id": "ev2", "title": "NFP", "currency": "USD", "forecast": "200K", "actual": "150K", "previous": "180K"},
    {"id": "ev3", "title": "PMI Manufacturing", "currency": "USD"},
    {"id": "ev4", "title": "FOMC Decision", "currency": "USD", "forecast": "5.25", "actual": "5.25", "previous": "5.25"},
    {"id": "ev5", "title": "Retail Sales", "currency": "EUR", "forecast": "0.1", "actual": "0.3", "previous": "-0.2"},
])
def test_summary_never_contains_indisponivel(event):
    """Todo evento com id possui análise textual; nunca contém frases proibidas."""
    result = generate_event_analysis(event)
    assert result is not None, f"generate_event_analysis deve retornar dict para evento com id: {event.get('id')}"
    summary = (result.get("summary") or "").strip()
    assert len(summary) > 0, "Todo evento DEVE ter análise textual (summary não vazio)."
    for frase in PROIBIDO:
        assert frase not in summary, (
            f"Summary NÃO pode conter '{frase}'. Recebido: {summary!r}. Build deve falhar."
        )


@pytest.mark.parametrize("event", [
    {"id": "e1", "title": "CPI", "currency": "USD"},
    {"id": "e2", "title": "NFP", "currency": "USD"},
    {"id": "e3", "title": "PMI", "currency": "EUR"},
    {"id": "e4", "title": "FOMC", "currency": "USD"},
    {"id": "e5", "title": "Retail Sales", "currency": "GBP"},
])
def test_events_with_currency_return_at_least_one_related_asset(event):
    """Eventos com currency retornam ≥1 ativo relacionado (event_currency_bias)."""
    result = generate_event_analysis(event)
    assert result is not None
    ativos = result.get("ativo_beneficiado_evento") or {}
    principal = (ativos.get("principal") or "").strip()
    sec = ativos.get("secundarios") or []
    total = (1 if principal else 0) + len([s for s in sec if s])
    assert total >= 1, (
        f"Evento com currency {event.get('currency')!r} DEVE retornar ≥1 ativo relacionado. "
        f"Recebido: principal={principal!r}, secundarios={sec}. Build deve falhar."
    )
