"""
Testes obrigatórios — Narrativa Macro Semanal.
- Narrativa semanal retorna ≥1 ativo em destaque.
- UI nunca renderiza listas vazias.
Se qualquer teste falhar → build falha.
"""
import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from analysis.weekly_macro_narrative import (
    generate_weekly_narrative_assets,
    get_highlighted_assets_for_narrative,
)


@pytest.mark.parametrize("dominant_themes,narrative_text", [
    (["política monetária hawkish"], ""),
    (["inflação alta"], ""),
    (["crescimento forte"], ""),
    ([], "Política monetária hawkish domina a semana. Fed sinaliza alta de juros."),
    ([], "Inflação alta pressiona mercados. Metais em destaque."),
    (["política monetária dovish", "risco global baixo"], ""),
])
def test_weekly_narrative_returns_at_least_one_asset(dominant_themes, narrative_text):
    """Narrativa semanal SEMPRE retorna ≥1 ativo em destaque."""
    result = generate_weekly_narrative_assets(
        narrative_text=narrative_text,
        dominant_themes=dominant_themes,
    )
    assert result is not None
    assets = result.get("ativos_em_destaque") or []
    assert isinstance(assets, list)
    assert len(assets) >= 1, (
        f"Narrativa semanal DEVE retornar ≥1 ativo em destaque. "
        f"Recebido: {assets}. Build deve falhar."
    )
    assert all(isinstance(a, str) and a.strip() for a in assets), (
        f"Todos os ativos devem ser strings não vazias. Recebido: {assets}."
    )


def test_get_highlighted_assets_fallback():
    """get_highlighted_assets_for_narrative sempre retorna ≥1 ativo, mesmo sem temas."""
    assets = get_highlighted_assets_for_narrative([], "")
    assert isinstance(assets, list)
    assert len(assets) >= 1, "Fallback DEVE retornar ≥1 ativo. Build deve falhar."


def test_normalize_theme():
    """normalize_theme funciona corretamente."""
    from analysis.weekly_macro_narrative import normalize_theme
    assert normalize_theme("hawkish") == "política monetária hawkish"
    assert normalize_theme("inflação alta") == "inflação alta"
    assert normalize_theme("") == ""


def test_event_currency_bias_normalizes_event_type():
    """event_currency_bias normaliza event_type antes do lookup."""
    from analysis.event_currency_bias import get_derived_assets_for_event, normalize_event_type
    
    # Teste normalização
    assert normalize_event_type("inflação") == "inflação"
    assert normalize_event_type("INFLATION") == "inflação"
    assert normalize_event_type("emprego") == "emprego"
    assert normalize_event_type("EMPLOYMENT") == "emprego"
    assert normalize_event_type("bc") == "bc"
    assert normalize_event_type("CENTRAL BANK") == "bc"
    
    # Teste que sempre retorna ≥1 ativo com currency
    assets = get_derived_assets_for_event("inflação", "USD")
    assert len(assets) >= 1, "Com currency USD, DEVE retornar ≥1 ativo."
    
    assets2 = get_derived_assets_for_event("unknown_type", "EUR")
    assert len(assets2) >= 1, "Com currency EUR, mesmo tipo desconhecido, DEVE retornar ≥1 ativo (fallback por moeda)."
    
    assets3 = get_derived_assets_for_event("", "JPY")
    assert len(assets3) >= 1, "Com currency JPY, mesmo tipo vazio, DEVE retornar ≥1 ativo."


def test_defensive_precedence_applied():
    """Quando regime macro é DEFENSIVE, metais devem aparecer antes de FX e índices."""
    from analysis.weekly_macro_narrative import (
        identify_macro_regime,
        apply_defensive_precedence,
        generate_weekly_narrative_assets,
    )
    
    # Teste identificação de regime DEFENSIVE
    regime1 = identify_macro_regime(["risco global alto"], "")
    assert regime1 == "DEFENSIVE", "Tema 'risco global alto' deve identificar regime DEFENSIVE."
    
    regime2 = identify_macro_regime(["crescimento fraco"], "")
    assert regime2 == "DEFENSIVE", "Tema 'crescimento fraco' deve identificar regime DEFENSIVE."
    
    regime3 = identify_macro_regime(["inflação alta"], "")
    assert regime3 == "DEFENSIVE", "Tema 'inflação alta' deve identificar regime DEFENSIVE."
    
    regime4 = identify_macro_regime([], "")
    assert regime4 == "NEUTRAL", "Sem temas, regime deve ser NEUTRAL."
    
    # Teste precedência: metais devem vir primeiro
    assets_mixed = ["EURUSD", "XAUUSD", "SPX500", "XAGUSD", "US30"]
    reordered = apply_defensive_precedence(assets_mixed)
    assert reordered[0] in ["XAUUSD", "XAGUSD"], "Em regime DEFENSIVE, primeiro ativo deve ser metal."
    assert reordered[1] in ["XAUUSD", "XAGUSD"], "Em regime DEFENSIVE, segundo ativo deve ser metal."
    assert len(reordered) == len(assets_mixed), "Precedência não deve remover ativos, apenas reordenar."
    
    # Teste que generate_weekly_narrative_assets aplica precedência quando regime é DEFENSIVE
    result = generate_weekly_narrative_assets(
        narrative_text="Incerteza macro e risco global alto dominam a semana.",
        dominant_themes=["risco global alto"],
    )
    assets = result.get("ativos_em_destaque", [])
    regime = result.get("macro_regime", "")
    assert regime == "DEFENSIVE", "Regime deve ser identificado como DEFENSIVE."
    if "XAUUSD" in assets or "XAGUSD" in assets:
        # Se metais estão presentes, devem estar no início
        first_asset = assets[0]
        assert first_asset in ["XAUUSD", "XAGUSD"], (
            f"Em regime DEFENSIVE com metais na lista, primeiro ativo deve ser metal. "
            f"Recebido: {first_asset} em {assets}."
        )
