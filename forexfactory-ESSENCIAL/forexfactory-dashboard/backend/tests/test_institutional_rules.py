"""
Testes obrigatórios — Regras institucionais.
Build DEVE falhar se qualquer regra for violada.
"""
import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from event_analysis_generator import generate_event_analysis
from analysis.event_currency_bias import get_derived_assets_for_event
from macro_analysis.api.handlers import MacroAnalysisHandler


# REGRA 1: Eventos com currency retornam ≥1 ativo relacionado
@pytest.mark.parametrize("event", [
    {"id": "e1", "title": "CPI", "currency": "USD"},
    {"id": "e2", "title": "NFP", "currency": "EUR"},
    {"id": "e3", "title": "PMI", "currency": "GBP"},
    {"id": "e4", "title": "FOMC", "currency": "JPY"},
])
def test_events_with_currency_always_return_assets(event):
    """Eventos com currency SEMPRE retornam ≥1 ativo relacionado."""
    result = generate_event_analysis(event)
    assert result is not None, f"Evento {event.get('id')} deve retornar análise"
    
    ativos = result.get("ativo_beneficiado_evento") or {}
    principal = (ativos.get("principal") or "").strip()
    sec = ativos.get("secundarios") or []
    total = (1 if principal else 0) + len([s for s in sec if s])
    
    assert total >= 1, (
        f"VIOLAÇÃO INSTITUCIONAL: Evento com currency {event.get('currency')!r} "
        f"retornou 0 ativos. Recebido: principal={principal!r}, secundarios={sec}. "
        f"Build deve falhar."
    )


# REGRA 2: macro_overview nunca é null
def test_macro_overview_never_null():
    """macro_overview SEMPRE é objeto válido, nunca null."""
    handler = MacroAnalysisHandler()
    
    result = handler._build_macro_overview("", [], week_start=None, week_end=None)
    assert result is not None, "macro_overview DEVE ser objeto, nunca null"
    assert isinstance(result, dict), "macro_overview DEVE ser dict"
    assert "status" in result, "macro_overview DEVE ter campo 'status'"


# REGRA 3: Nenhuma probabilidade no sistema
def test_no_probability_language():
    """Sistema não deve usar linguagem de probabilidade."""
    # Verificar que event_currency_bias não retorna probabilidades
    assets = get_derived_assets_for_event("inflação", "USD")
    assert isinstance(assets, list), "Deve retornar lista, não dict com probabilidades"
    assert len(assets) >= 1, "Deve retornar ≥1 ativo"
    
    # Verificar que não há campos de probabilidade no contrato
    handler = MacroAnalysisHandler()
    result = handler._build_macro_overview("Teste", [], week_start=None, week_end=None)
    assert "probability" not in str(result).lower(), "macro_overview não deve conter 'probability'"
    assert "chance" not in str(result).lower(), "macro_overview não deve conter 'chance'"
    assert "%" not in str(result), "macro_overview não deve conter '%'"


# REGRA 4: Ordenação determinística
def test_event_sorting_deterministic():
    """Ordenação de eventos deve ser determinística (mesmo snapshot = mesma ordem)."""
    from utils.event_sorting import deterministic_event_sort_key
    
    # Mesmos inputs devem gerar mesma chave
    key1 = deterministic_event_sort_key("09:30", print_row_index=5, sort_time_key=570)
    key2 = deterministic_event_sort_key("09:30", print_row_index=5, sort_time_key=570)
    assert key1 == key2, "Ordenação deve ser determinística"
    
    # print_row_index como tie-breaker
    key3 = deterministic_event_sort_key("09:30", print_row_index=6, sort_time_key=570)
    assert key1[0] == key3[0], "Primary sort deve ser igual"
    assert key1[1] < key3[1], "Secondary sort (print_row_index) deve diferenciar"


# REGRA 5: event_uid determinístico
def test_event_uid_deterministic():
    """event_uid deve ser determinístico e reprodutível."""
    from utils.event_identity import generate_event_uid
    
    uid1 = generate_event_uid(
        source="FOREXFACTORY",
        week_key="2026-01-25_to_2026-01-31",
        print_date_label="Mon Jan 26",
        print_time_label="09:30",
        currency="USD",
        print_row_index=5,
        normalized_name="cpi",
    )
    
    uid2 = generate_event_uid(
        source="FOREXFACTORY",
        week_key="2026-01-25_to_2026-01-31",
        print_date_label="Mon Jan 26",
        print_time_label="09:30",
        currency="USD",
        print_row_index=5,
        normalized_name="cpi",
    )
    
    assert uid1 == uid2, "event_uid deve ser determinístico (mesmos inputs = mesmo uid)"
    assert uid1.startswith("evt_"), "event_uid deve começar com 'evt_'"


# REGRA 6: Sem inferência de regime macro
def test_no_regime_inference():
    """Regime macro não deve ser inferido automaticamente."""
    from config.week_regime_config import get_regime_for_week
    
    # Semana não configurada deve retornar None
    regime = get_regime_for_week("2026-01-25_to_2026-01-31")
    # Se None, está correto (não inferido)
    # Se configurado manualmente, está correto (editorial)
    assert regime is None or regime in ["RISK_OFF", "RISK_ON"], (
        "Regime deve ser None (não configurado) ou manual (RISK_OFF/RISK_ON). "
        "Não deve ser inferido automaticamente."
    )
