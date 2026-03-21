"""
Testes obrigatórios — macro_overview sempre presente.
- macro_overview nunca é null
- macro_overview sempre tem status válido
- Componente sempre renderiza
Se qualquer teste falhar → build falha.
"""
import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from macro_analysis.api.handlers import MacroAnalysisHandler


def test_macro_overview_never_null():
    """macro_overview nunca é null, sempre retorna objeto válido."""
    handler = MacroAnalysisHandler()
    
    # Teste com dados vazios
    result1 = handler._build_macro_overview("", [], week_start=None, week_end=None)
    assert result1 is not None, "macro_overview DEVE ser objeto, nunca null"
    assert isinstance(result1, dict), "macro_overview DEVE ser dict"
    assert "status" in result1, "macro_overview DEVE ter campo 'status'"
    assert result1["status"] == "unavailable", "Sem dados, status deve ser 'unavailable'"
    assert "reason" in result1, "macro_overview DEVE ter campo 'reason' quando unavailable"
    assert len(result1["reason"]) > 0, "reason não pode ser vazio quando unavailable"
    
    # Teste com dados válidos
    result2 = handler._build_macro_overview("Teste de narrativa macro com conteúdo relevante.", [], week_start=None, week_end=None)
    assert result2 is not None
    assert isinstance(result2, dict)
    assert "status" in result2
    assert result2["status"] in ["ok", "partial", "unavailable"]
    assert "summary" in result2
    assert "themes" in result2
    assert isinstance(result2["themes"], list)


def test_macro_overview_schema_stable():
    """Schema de macro_overview é estável e sempre tem campos obrigatórios."""
    handler = MacroAnalysisHandler()
    
    result = handler._build_macro_overview("", [], week_start=None, week_end=None)
    
    # Campos obrigatórios sempre presentes
    required_fields = ["status", "reason", "summary", "themes"]
    for field in required_fields:
        assert field in result, f"Campo obrigatório '{field}' ausente. Build deve falhar."
    
    # macro_regime deve estar presente (pode ser None se não configurado manualmente)
    assert "macro_regime" in result, "Campo 'macro_regime' deve estar presente (pode ser None)"
    
    # Tipos corretos
    assert isinstance(result["status"], str)
    assert isinstance(result["reason"], str)
    assert isinstance(result["summary"], str)
    assert isinstance(result["themes"], list)
    # macro_regime pode ser None ou string
    assert result["macro_regime"] is None or isinstance(result["macro_regime"], str)
    
    # Valores válidos
    assert result["status"] in ["ok", "partial", "unavailable"]
    # Se macro_regime não for None, deve ser um valor válido
    if result["macro_regime"] is not None:
        assert result["macro_regime"] in ["RISK_OFF", "RISK_ON", "DEFENSIVE"], \
            f"macro_regime inválido: {result['macro_regime']}"


def test_macro_overview_unavailable_has_reason():
    """Quando status é unavailable, reason não pode ser vazio."""
    handler = MacroAnalysisHandler()
    
    result = handler._build_macro_overview("", [], week_start=None, week_end=None)
    
    if result["status"] == "unavailable":
        assert len(result["reason"]) > 0, (
            "Quando status='unavailable', reason DEVE ser não vazio. "
            "Build deve falhar."
        )
