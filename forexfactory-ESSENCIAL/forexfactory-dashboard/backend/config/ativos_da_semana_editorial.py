"""
Loader e validação para config editorial de "Ativos da Semana".
Lista de monitoramento editorial/manual com guardrails de realismo.
"""
import json
from pathlib import Path
from typing import Dict, List, Optional, Set
from collections import Counter

from .ftmo_allowlist import load_ftmo_allowlist

# Caminho base para dados
_DATA_DIR = Path(__file__).parent.parent.parent / "data"
_WEEKS_DIR = _DATA_DIR / "weeks"

# Termos proibidos em UI
_PROHIBITED_TERMS = [
    "recomendado", "recomendada", "recomendados", "recomendadas",
    "favorecido", "favorecida", "favorecidos", "favorecidas",
    "bullish", "bearish",
    "compre", "compra", "comprar",
    "venda", "vender",
    "probabilidade", "probabilidades",
    "80%", "85%", "90%", "chance", "chances",
    "vai subir", "vai cair", "vai descer",
    "positivo", "negativa", "positivos", "negativas",
    "garantido", "garantida",
    "melhor aposta", "melhor escolha",
]

# Termos permitidos (exemplos)
_PERMITTED_TERMS = [
    "monitorar", "sensível", "proxy", "termômetro", "hedge",
    "exposição", "liquidez", "risco",
]

# Confidence mínimo obrigatório
_MIN_CONFIDENCE = 0.80

# Valores permitidos para enums
_EXPOSURE_BUCKETS = {"HEDGE", "USD_FUNDING", "RISK_PROXY", "RATES", "FX_MACRO", "COMMODITY"}
_SCENARIO_ROLES = {"benefit", "hurt", "mixed", "uncertain"}
_CORRELATION_GROUPS = {"usd", "metals", "equities", "rates", "fx", "other"}

# Guardrails de realismo
_MIN_ITEMS = 4
_MAX_ITEMS = 8
_MIN_DISTINCT_BUCKETS = 3
_MIN_DISTINCT_GROUPS = 3
_MAX_ITEMS_PER_GROUP = 2


def _check_prohibited_terms(text: str) -> List[str]:
    """Retorna lista de termos proibidos encontrados no texto."""
    found = []
    text_lower = text.lower()
    for term in _PROHIBITED_TERMS:
        if term in text_lower:
            found.append(term)
    return found


def _validate_guardrails_realism(items: List[Dict]) -> List[str]:
    """
    Valida guardrails de realismo.
    Retorna lista de erros (vazia se válido).
    """
    errors = []
    
    if len(items) < _MIN_ITEMS:
        errors.append(f"Mínimo de {_MIN_ITEMS} itens não atingido: {len(items)}")
    if len(items) > _MAX_ITEMS:
        errors.append(f"Máximo de {_MAX_ITEMS} itens excedido: {len(items)}")
    
    # Diversidade mínima: exposure_buckets
    buckets = [item.get("exposure_bucket") for item in items if item.get("exposure_bucket")]
    distinct_buckets = len(set(buckets))
    if distinct_buckets < _MIN_DISTINCT_BUCKETS:
        errors.append(f"Mínimo de {_MIN_DISTINCT_BUCKETS} exposure_buckets distintos não atingido: {distinct_buckets}")
    
    # Diversidade mínima: correlation_groups
    groups = [item.get("correlation_group") for item in items if item.get("correlation_group")]
    distinct_groups = len(set(groups))
    if distinct_groups < _MIN_DISTINCT_GROUPS:
        errors.append(f"Mínimo de {_MIN_DISTINCT_GROUPS} correlation_groups distintos não atingido: {distinct_groups}")
    
    # Anti "todo mundo ganha": pelo menos 1 item com role em {mixed, uncertain, hurt}
    roles = [item.get("scenario_role") for item in items if item.get("scenario_role")]
    non_benefit_count = sum(1 for r in roles if r in {"mixed", "uncertain", "hurt"})
    if non_benefit_count == 0:
        errors.append("Todos os scenario_role são 'benefit'. Deve haver pelo menos 1 item com role em {mixed, uncertain, hurt}")
    
    # Redundância: máximo 2 itens por correlation_group
    group_counts = Counter(groups)
    for group, count in group_counts.items():
        if count > _MAX_ITEMS_PER_GROUP:
            errors.append(f"Máximo de {_MAX_ITEMS_PER_GROUP} itens por correlation_group excedido para '{group}': {count}")
    
    return errors


def load_ativos_da_semana_config(week_key: str) -> Dict:
    """
    Carrega config editorial de "Ativos da Semana" para week_key.
    
    Args:
        week_key: Chave da semana (formato: "YYYY-MM-DD_to_YYYY-MM-DD")
    
    Returns:
        {
            "status": "ok" | "unavailable",
            "reason": str (se unavailable),
            "week_key": str,
            "source": str,
            "active_revision_id": str,
            "items": List[Dict] (sem scenario_role, sem confidence_editorial),
            "fallback": Dict,
            "_internal": Dict (com scenario_role e confidence_editorial)
        }
    """
    config_path = _WEEKS_DIR / week_key / "ativos_da_semana.editorial.json"
    
    if not config_path.exists():
        # Retornar fallback DXY se disponível na allowlist
        allowlist_result = load_ftmo_allowlist(week_key)
        if allowlist_result["status"] == "ok" and "DXY" in allowlist_result["symbols"]:
            return {
                "status": "unavailable",
                "reason": f"Config não encontrada para week_key: {week_key}",
                "week_key": week_key,
                "items": [],
                "fallback": {"symbol": "DXY", "label": "Dólar (DXY)", "context": "Fallback institucional para monitoramento."},
                "_internal": {},
            }
        else:
            fallback_symbol = list(allowlist_result.get("symbols", ["DXY"]))[0] if allowlist_result.get("symbols") else "DXY"
            return {
                "status": "unavailable",
                "reason": f"Config não encontrada e DXY não disponível na allowlist",
                "week_key": week_key,
                "items": [],
                "fallback": {"symbol": fallback_symbol, "label": fallback_symbol, "context": "Fallback institucional."},
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
            "fallback": {"symbol": "DXY", "label": "Dólar (DXY)", "context": "Fallback institucional."},
            "_internal": {},
        }
    
    # Validar estrutura básica
    if not isinstance(config_data, dict):
        return {
            "status": "unavailable",
            "reason": "Config inválida: não é objeto JSON",
            "week_key": week_key,
            "items": [],
            "fallback": config_data.get("fallback", {"symbol": "DXY", "label": "Dólar (DXY)", "context": "Fallback institucional."}),
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
            "fallback": config_data.get("fallback", {"symbol": "DXY", "label": "Dólar (DXY)", "context": "Fallback institucional."}),
            "_internal": {},
        }
    
    allowlist_symbols = allowlist_result["symbols"]
    
    # Obter revisão ativa
    revisions = config_data.get("revisions", [])
    if not revisions:
        return {
            "status": "unavailable",
            "reason": "Config sem revisions",
            "week_key": week_key,
            "items": [],
            "fallback": config_data.get("fallback", {"symbol": "DXY", "label": "Dólar (DXY)", "context": "Fallback institucional."}),
            "_internal": {},
        }
    
    active_revision_id = config_data.get("active_revision_id")
    if active_revision_id:
        active_revision = next((r for r in revisions if r.get("revision_id") == active_revision_id), None)
        if not active_revision:
            active_revision = revisions[-1]
    else:
        active_revision = revisions[-1]
    
    items_raw = active_revision.get("items", [])
    if not items_raw:
        return {
            "status": "unavailable",
            "reason": "Revisão ativa sem items",
            "week_key": week_key,
            "items": [],
            "fallback": config_data.get("fallback", {"symbol": "DXY", "label": "Dólar (DXY)", "context": "Fallback institucional."}),
            "_internal": {},
        }
    
    # Validar e filtrar items
    validated_items = []
    internal_data = {}
    errors = []
    seen_symbols = set()
    
    for item in items_raw:
        symbol = item.get("symbol", "").strip()
        label = item.get("label", "").strip()
        context = item.get("context", "").strip()
        exposure_bucket = item.get("exposure_bucket", "").strip()
        scenario_role = item.get("scenario_role", "").strip()
        correlation_group = item.get("correlation_group", "").strip()
        confidence = item.get("confidence_editorial")
        
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
        
        # Validação: exposure_bucket válido
        if exposure_bucket not in _EXPOSURE_BUCKETS:
            errors.append(f"exposure_bucket inválido para {symbol}: {exposure_bucket}")
            continue
        
        # Validação: scenario_role válido
        if scenario_role not in _SCENARIO_ROLES:
            errors.append(f"scenario_role inválido para {symbol}: {scenario_role}")
            continue
        
        # Validação: correlation_group válido
        if correlation_group not in _CORRELATION_GROUPS:
            errors.append(f"correlation_group inválido para {symbol}: {correlation_group}")
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
        
        # Item válido: adicionar (sem scenario_role, sem confidence_editorial)
        validated_items.append({
            "symbol": symbol,
            "label": label,
            "context": context if context else None,
        })
        
        # Armazenar dados internos
        if symbol not in internal_data:
            internal_data[symbol] = {}
        internal_data[symbol]["scenario_role"] = scenario_role
        internal_data[symbol]["confidence_editorial"] = confidence
        internal_data[symbol]["exposure_bucket"] = exposure_bucket
        internal_data[symbol]["correlation_group"] = correlation_group
    
    # Validar guardrails de realismo (usar items_raw antes da filtragem)
    # Mas só se não houver erros individuais
    if not errors:
        guardrail_errors = _validate_guardrails_realism(items_raw)
        if guardrail_errors:
            errors.extend(guardrail_errors)
    
    # Se houver erros de validação, retornar unavailable
    if errors:
        return {
            "status": "unavailable",
            "reason": f"Erros de validação: {'; '.join(errors)}",
            "week_key": week_key,
            "items": [],
            "fallback": config_data.get("fallback", {"symbol": "DXY", "label": "Dólar (DXY)", "context": "Fallback institucional."}),
            "_internal": {},
        }
    
    # Se items vazio após validação, usar fallback
    if not validated_items:
        fallback = config_data.get("fallback", {"symbol": "DXY", "label": "Dólar (DXY)", "context": "Fallback institucional."})
        fallback_symbol = fallback.get("symbol", "DXY")
        if fallback_symbol in allowlist_symbols:
            validated_items = [{
                "symbol": fallback_symbol,
                "label": fallback.get("label", fallback_symbol),
                "context": fallback.get("context"),
            }]
    
    return {
        "status": "ok",
        "reason": None,
        "week_key": week_key,
        "source": config_data.get("source", "editorial_manual"),
        "active_revision_id": active_revision.get("revision_id"),
        "ftmo_snapshot_date": allowlist_result.get("snapshot_date"),
        "items": validated_items,
        "fallback": config_data.get("fallback", {"symbol": "DXY", "label": "Dólar (DXY)", "context": "Fallback institucional."}),
        "_internal": {
            "scenario_role_by_symbol": {s: internal_data[s]["scenario_role"] for s in internal_data},
            "confidence_by_symbol": {s: internal_data[s]["confidence_editorial"] for s in internal_data},
        },
    }
