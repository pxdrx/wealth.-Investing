"""
Loader e validação para config editorial de Featured Assets.
Config versionada por week_key com revisions.
"""
import json
import os
from pathlib import Path
from typing import Dict, List, Optional, Set
from datetime import datetime

from .ftmo_allowlist import load_ftmo_allowlist

# Caminho base para dados
_DATA_DIR = Path(__file__).parent.parent.parent / "data"
_WEEKS_DIR = _DATA_DIR / "weeks"

# Termos proibidos em UI
_PROHIBITED_TERMS = [
    "recomendado", "recomendada", "recomendados", "recomendadas",
    "compre", "compra", "comprar",
    "venda", "vender",
    "probabilidade", "probabilidades",
    "80%", "85%", "90%", "chance", "chances",
    "vai subir", "vai cair", "vai descer",
    "garantido", "garantida",
    "melhor aposta", "melhor escolha",
]

# Confidence mínimo obrigatório
_MIN_CONFIDENCE = 0.80


def _check_prohibited_terms(text: str) -> List[str]:
    """Retorna lista de termos proibidos encontrados no texto."""
    found = []
    text_lower = text.lower()
    for term in _PROHIBITED_TERMS:
        if term in text_lower:
            found.append(term)
    return found


def load_featured_assets_config(week_key: str) -> Dict:
    """
    Carrega config editorial de featured assets para week_key.
    
    Args:
        week_key: Chave da semana (formato: "YYYY-MM-DD_to_YYYY-MM-DD")
    
    Returns:
        {
            "status": "ok" | "unavailable",
            "reason": str (se unavailable),
            "week_key": str,
            "source": str,
            "last_revision_id": str,
            "items": List[Dict] (sem confidence, sem direction),
            "fallback": Dict,
            "_internal": Dict (com confidence_by_symbol)
        }
    """
    config_path = _WEEKS_DIR / week_key / "featured_assets.editorial.json"
    
    if not config_path.exists():
        # Retornar fallback DXY se disponível na allowlist
        allowlist_result = load_ftmo_allowlist(week_key)
        if allowlist_result["status"] == "ok" and "DXY" in allowlist_result["symbols"]:
            return {
                "status": "unavailable",
                "reason": f"Config não encontrada para week_key: {week_key}",
                "week_key": week_key,
                "items": [],
                "fallback": {"symbol": "DXY", "label": "Dólar (DXY)"},
                "_internal": {},
            }
        else:
            # Usar primeiro símbolo da allowlist como fallback
            fallback_symbol = list(allowlist_result.get("symbols", ["DXY"]))[0] if allowlist_result.get("symbols") else "DXY"
            return {
                "status": "unavailable",
                "reason": f"Config não encontrada e DXY não disponível na allowlist",
                "week_key": week_key,
                "items": [],
                "fallback": {"symbol": fallback_symbol, "label": f"{fallback_symbol}"},
                "_internal": {},
            }
    
    try:
        with open(config_path, "r", encoding="utf-8") as f:
            config_data = json.load(f)
    except Exception as e:
        return {
            "status": "unavailable",
            "reason": f"Erro ao carregar config: {str(e)}",
            "week_key": week_key,
            "items": [],
            "fallback": {"symbol": "DXY", "label": "Dólar (DXY)"},
            "_internal": {},
        }
    
    # Validar estrutura básica
    if not isinstance(config_data, dict):
        return {
            "status": "unavailable",
            "reason": "Config inválida: não é objeto JSON",
            "week_key": week_key,
            "items": [],
            "fallback": config_data.get("fallback", {"symbol": "DXY", "label": "Dólar (DXY)"}),
            "_internal": {},
        }
    
    # Carregar allowlist para validação
    allowlist_result = load_ftmo_allowlist(week_key)
    if allowlist_result["status"] != "ok":
        return {
            "status": "unavailable",
            "reason": f"Allowlist não disponível: {allowlist_result.get('reason')}",
            "week_key": week_key,
            "items": [],
            "fallback": config_data.get("fallback", {"symbol": "DXY", "label": "Dólar (DXY)"}),
            "_internal": {},
        }
    
    allowlist_symbols = allowlist_result["symbols"]
    
    # Obter última revisão
    revisions = config_data.get("revisions", [])
    if not revisions:
        return {
            "status": "unavailable",
            "reason": "Config sem revisions",
            "week_key": week_key,
            "items": [],
            "fallback": config_data.get("fallback", {"symbol": "DXY", "label": "Dólar (DXY)"}),
            "_internal": {},
        }
    
    # Usar last_revision_id ou última revisão na lista
    last_revision_id = config_data.get("last_revision_id")
    if last_revision_id:
        last_revision = next((r for r in revisions if r.get("revision_id") == last_revision_id), None)
        if not last_revision:
            # Se não encontrou, usar última da lista
            last_revision = revisions[-1]
    else:
        last_revision = revisions[-1]
    
    items_raw = last_revision.get("items", [])
    if not items_raw:
        return {
            "status": "unavailable",
            "reason": "Última revisão sem items",
            "week_key": week_key,
            "items": [],
            "fallback": config_data.get("fallback", {"symbol": "DXY", "label": "Dólar (DXY)"}),
            "_internal": {},
        }
    
    # Validar e filtrar items
    validated_items = []
    confidence_by_symbol = {}
    errors = []
    
    seen_symbols = set()
    
    for item in items_raw:
        symbol = item.get("symbol", "").strip()
        label = item.get("label", "").strip()
        context = item.get("context", "").strip()
        confidence = item.get("confidence")
        
        # Validação: símbolo obrigatório
        if not symbol:
            errors.append("Item sem símbolo")
            continue
        
        # Validação: duplicatas
        if symbol in seen_symbols:
            errors.append(f"Símbolo duplicado: {symbol}")
            continue
        seen_symbols.add(symbol)
        
        # Validação: símbolo na allowlist
        if symbol not in allowlist_symbols:
            errors.append(f"Símbolo fora da allowlist: {symbol}")
            continue
        
        # Validação: confidence >= 0.80
        if confidence is None or confidence < _MIN_CONFIDENCE:
            errors.append(f"Confidence inválido para {symbol}: {confidence} (mínimo {_MIN_CONFIDENCE})")
            continue
        
        # Validação: termos proibidos em label
        prohibited_in_label = _check_prohibited_terms(label)
        if prohibited_in_label:
            errors.append(f"Termos proibidos em label de {symbol}: {prohibited_in_label}")
            continue
        
        # Validação: termos proibidos em context
        prohibited_in_context = _check_prohibited_terms(context)
        if prohibited_in_context:
            errors.append(f"Termos proibidos em context de {symbol}: {prohibited_in_context}")
            continue
        
        # Validação: context <= 140 chars
        if context and len(context) > 140:
            errors.append(f"Context de {symbol} excede 140 caracteres: {len(context)}")
            continue
        
        # Item válido: adicionar (sem confidence, sem direction)
        validated_items.append({
            "symbol": symbol,
            "label": label,
            "context": context if context else None,
        })
        
        # Armazenar confidence internamente
        confidence_by_symbol[symbol] = confidence
    
    # Se houver erros de validação, retornar unavailable
    if errors:
        return {
            "status": "unavailable",
            "reason": f"Erros de validação: {'; '.join(errors)}",
            "week_key": week_key,
            "items": [],
            "fallback": config_data.get("fallback", {"symbol": "DXY", "label": "Dólar (DXY)"}),
            "_internal": {},
        }
    
    # Se items vazio após validação, usar fallback
    if not validated_items:
        fallback = config_data.get("fallback", {"symbol": "DXY", "label": "Dólar (DXY)"})
        fallback_symbol = fallback.get("symbol", "DXY")
        if fallback_symbol in allowlist_symbols:
            validated_items = [{
                "symbol": fallback_symbol,
                "label": fallback.get("label", fallback_symbol),
                "context": None,
            }]
    
    return {
        "status": "ok",
        "reason": None,
        "week_key": week_key,
        "source": config_data.get("source", "editorial_manual"),
        "last_revision_id": last_revision.get("revision_id"),
        "ftmo_snapshot_date": allowlist_result.get("snapshot_date"),
        "items": validated_items,
        "fallback": config_data.get("fallback", {"symbol": "DXY", "label": "Dólar (DXY)"}),
        "_internal": {
            "confidence_by_symbol": confidence_by_symbol,
        },
    }
