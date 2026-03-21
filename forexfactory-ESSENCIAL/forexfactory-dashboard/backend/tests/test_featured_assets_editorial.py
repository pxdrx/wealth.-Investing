"""
Testes obrigatórios — Featured Assets Editorial.
Build DEVE falhar se qualquer regra for violada.
"""
import os
import sys
import pytest
import json
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config.ftmo_allowlist import load_ftmo_allowlist
from config.featured_assets_editorial import load_featured_assets_config
from macro_analysis.api.handlers import MacroAnalysisHandler
from utils.event_identity import get_week_key


# Week key fixo para testes
FIXED_WEEK_KEY = "2026-01-25_to_2026-01-31"


def test_allowlist_exists_for_week_key():
    """Allowlist FTMO DEVE existir para week_key fixo."""
    result = load_ftmo_allowlist(FIXED_WEEK_KEY)
    assert result["status"] == "ok", (
        f"VIOLAÇÃO: Allowlist não encontrada para {FIXED_WEEK_KEY}. "
        f"Build deve falhar. Reason: {result.get('reason')}"
    )
    assert "symbols" in result, "Allowlist deve ter campo 'symbols'"
    assert len(result["symbols"]) > 0, "Allowlist não pode estar vazia"


def test_featured_assets_never_null():
    """featured_assets nunca é null/undefined no payload."""
    handler = MacroAnalysisHandler()
    
    # Simular análise com week_start/week_end
    from datetime import date
    mock_analysis = {
        "week_start": date(2026, 1, 25),
        "week_end": date(2026, 1, 31),
    }
    
    featured = handler._load_featured_assets_editorial(
        week_start=mock_analysis["week_start"],
        week_end=mock_analysis["week_end"],
    )
    
    assert featured is not None, "featured_assets DEVE ser objeto, nunca null"
    assert isinstance(featured, dict), "featured_assets DEVE ser dict"
    assert "status" in featured, "featured_assets DEVE ter campo 'status'"


def test_featured_assets_status_ok_items_not_empty():
    """Se status='ok', items não pode estar vazio."""
    result = load_featured_assets_config(FIXED_WEEK_KEY)
    
    if result["status"] == "ok":
        assert "items" in result, "featured_assets deve ter campo 'items' quando ok"
        assert isinstance(result["items"], list), "items deve ser lista"
        assert len(result["items"]) > 0, (
            f"VIOLAÇÃO: status='ok' mas items está vazio. "
            f"Build deve falhar."
        )


def test_all_items_in_allowlist():
    """Todos os items.symbol devem estar na allowlist FTMO."""
    allowlist_result = load_ftmo_allowlist(FIXED_WEEK_KEY)
    if allowlist_result["status"] != "ok":
        pytest.skip(f"Allowlist não disponível: {allowlist_result.get('reason')}")
    
    allowlist_symbols = allowlist_result["symbols"]
    config_result = load_featured_assets_config(FIXED_WEEK_KEY)
    
    if config_result["status"] == "ok":
        for item in config_result["items"]:
            symbol = item.get("symbol", "").strip()
            assert symbol in allowlist_symbols, (
                f"VIOLAÇÃO: Símbolo '{symbol}' fora da allowlist FTMO. "
                f"Build deve falhar."
            )


def test_confidence_minimum_080():
    """Confidence deve ser >= 0.80 em todos os items (validação backend)."""
    config_result = load_featured_assets_config(FIXED_WEEK_KEY)
    
    if config_result["status"] == "ok":
        # Verificar confidence interno (não exposto ao frontend)
        confidence_by_symbol = config_result.get("_internal", {}).get("confidence_by_symbol", {})
        
        for symbol, confidence in confidence_by_symbol.items():
            assert confidence is not None, f"Confidence não definido para {symbol}"
            assert confidence >= 0.80, (
                f"VIOLAÇÃO: Confidence {confidence} < 0.80 para {symbol}. "
                f"Build deve falhar."
            )


def test_no_prohibited_terms_in_config():
    """Config não deve conter termos proibidos em label/context."""
    config_result = load_featured_assets_config(FIXED_WEEK_KEY)
    
    if config_result["status"] == "ok":
        prohibited_terms = [
            "recomendado", "compre", "venda", "probabilidade", "80%", "chance",
            "vai subir", "garantido", "melhor aposta",
        ]
        
        for item in config_result["items"]:
            label = (item.get("label", "") or "").lower()
            context = (item.get("context", "") or "").lower()
            
            for term in prohibited_terms:
                assert term not in label, (
                    f"VIOLAÇÃO: Termo proibido '{term}' encontrado em label de {item.get('symbol')}. "
                    f"Build deve falhar."
                )
                assert term not in context, (
                    f"VIOLAÇÃO: Termo proibido '{term}' encontrado em context de {item.get('symbol')}. "
                    f"Build deve falhar."
                )


def test_no_duplicate_symbols():
    """Não deve haver símbolos duplicados em items."""
    config_result = load_featured_assets_config(FIXED_WEEK_KEY)
    
    if config_result["status"] == "ok":
        symbols = [item.get("symbol", "").strip() for item in config_result["items"]]
        seen = set()
        duplicates = []
        
        for symbol in symbols:
            if symbol in seen:
                duplicates.append(symbol)
            seen.add(symbol)
        
        assert len(duplicates) == 0, (
            f"VIOLAÇÃO: Símbolos duplicados encontrados: {duplicates}. "
            f"Build deve falhar."
        )


def test_last_revision_deterministic():
    """Última revisão deve ser determinística (mesma config = mesma revisão)."""
    result1 = load_featured_assets_config(FIXED_WEEK_KEY)
    result2 = load_featured_assets_config(FIXED_WEEK_KEY)
    
    if result1["status"] == "ok" and result2["status"] == "ok":
        assert result1["last_revision_id"] == result2["last_revision_id"], (
            "Última revisão deve ser determinística (mesma config = mesma revisão)"
        )
        
        # Items devem ser iguais
        assert len(result1["items"]) == len(result2["items"]), (
            "Items devem ser iguais entre chamadas"
        )
        
        for i, (item1, item2) in enumerate(zip(result1["items"], result2["items"])):
            assert item1["symbol"] == item2["symbol"], (
                f"Item {i} deve ter mesmo símbolo entre chamadas"
            )


def test_context_max_140_chars():
    """Context não deve exceder 140 caracteres."""
    config_result = load_featured_assets_config(FIXED_WEEK_KEY)
    
    if config_result["status"] == "ok":
        for item in config_result["items"]:
            context = item.get("context", "")
            if context:
                assert len(context) <= 140, (
                    f"VIOLAÇÃO: Context de {item.get('symbol')} excede 140 caracteres: {len(context)}. "
                    f"Build deve falhar."
                )


def test_featured_assets_in_payload():
    """featured_assets deve estar presente no payload formatado."""
    handler = MacroAnalysisHandler()
    
    from datetime import date
    mock_analysis = {
        "week_start": date(2026, 1, 25),
        "week_end": date(2026, 1, 31),
        "narrative": {},
        "regional_overview": {},
        "assets": [],
    }
    
    formatted = handler._format_analysis_response(mock_analysis)
    
    assert "featured_assets" in formatted, (
        "featured_assets DEVE estar presente no payload formatado"
    )
    assert formatted["featured_assets"] is not None, (
        "featured_assets não pode ser null"
    )
    assert isinstance(formatted["featured_assets"], dict), (
        "featured_assets deve ser dict"
    )


def test_no_confidence_in_frontend_payload():
    """Confidence não deve aparecer no payload enviado ao frontend."""
    handler = MacroAnalysisHandler()
    
    from datetime import date
    mock_analysis = {
        "week_start": date(2026, 1, 25),
        "week_end": date(2026, 1, 31),
        "narrative": {},
        "regional_overview": {},
        "assets": [],
    }
    
    formatted = handler._format_analysis_response(mock_analysis)
    featured = formatted.get("featured_assets", {})
    
    # Verificar que confidence não está em items
    if featured.get("status") == "ok":
        for item in featured.get("items", []):
            assert "confidence" not in item, (
                "Confidence não deve aparecer em items do payload frontend"
            )
            assert "direction" not in item, (
                "Direction não deve aparecer em items do payload frontend"
            )
    
    # Verificar que _internal não está no payload
    assert "_internal" not in featured, (
        "_internal não deve aparecer no payload frontend"
    )
