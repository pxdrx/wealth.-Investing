"""
Testes unitários obrigatórios para classificação de regime de risco.
Falha no teste = build falha.
"""
import pytest
import sys
import os

# Adicionar o diretório raiz ao path para importar o módulo
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from utils.risk_regime_classifier import classify_risk_regime


def test_risk_off_fear_40_vix_20():
    """Fear ≤ 40 E VIX ≥ 20 → Risk-Off"""
    assert classify_risk_regime(40, 20) == "Risk-Off"
    assert classify_risk_regime(30, 25) == "Risk-Off"
    assert classify_risk_regime(20, 20) == "Risk-Off"
    assert classify_risk_regime(40, 30) == "Risk-Off"


def test_risk_off_boundary_cases():
    """Casos limite para Risk-Off"""
    assert classify_risk_regime(40, 20) == "Risk-Off"  # Exatamente no limite
    assert classify_risk_regime(39, 20) == "Risk-Off"   # Abaixo do limite Fear
    assert classify_risk_regime(40, 21) == "Risk-Off"   # Acima do limite VIX


def test_risk_on_fear_60_vix_18():
    """Fear ≥ 60 E VIX ≤ 18 → Risk-On"""
    assert classify_risk_regime(60, 18) == "Risk-On"
    assert classify_risk_regime(70, 15) == "Risk-On"
    assert classify_risk_regime(80, 10) == "Risk-On"
    assert classify_risk_regime(60, 18) == "Risk-On"


def test_risk_on_boundary_cases():
    """Casos limite para Risk-On"""
    assert classify_risk_regime(60, 18) == "Risk-On"   # Exatamente no limite
    assert classify_risk_regime(61, 18) == "Risk-On"    # Acima do limite Fear
    assert classify_risk_regime(60, 17) == "Risk-On"   # Abaixo do limite VIX


def test_transicao_other_scenarios():
    """Demais combinações → Transição"""
    # Fear alto mas VIX alto (não Risk-On)
    assert classify_risk_regime(70, 25) == "Transição"
    
    # Fear baixo mas VIX baixo (não Risk-Off)
    assert classify_risk_regime(30, 15) == "Transição"
    
    # Valores intermediários
    assert classify_risk_regime(50, 19) == "Transição"
    assert classify_risk_regime(45, 19) == "Transição"
    assert classify_risk_regime(55, 19) == "Transição"
    
    # Fear no meio, VIX no meio
    assert classify_risk_regime(50, 19) == "Transição"


def test_invalid_inputs():
    """Entradas inválidas retornam Transição"""
    assert classify_risk_regime(None, 20) == "Transição"
    assert classify_risk_regime(50, None) == "Transição"
    assert classify_risk_regime("invalid", 20) == "Transição"
    assert classify_risk_regime(50, "invalid") == "Transição"


def test_edge_cases():
    """Casos extremos"""
    # Fear mínimo, VIX máximo
    assert classify_risk_regime(0, 50) == "Risk-Off"
    
    # Fear máximo, VIX mínimo
    assert classify_risk_regime(100, 0) == "Risk-On"
    
    # Valores muito próximos dos limites mas não atingindo
    assert classify_risk_regime(41, 20) == "Transição"  # Fear 1 acima
    assert classify_risk_regime(40, 19) == "Transição"  # VIX 1 abaixo
    assert classify_risk_regime(59, 18) == "Transição"  # Fear 1 abaixo
    assert classify_risk_regime(60, 19) == "Transição"  # VIX 1 acima
