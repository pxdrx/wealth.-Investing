"""
Geração automática da análise do evento — REGRA INSTITUCIONAL DEFINITIVA.
Não prevê. Não infere. Não calcula probabilidade. Reproduz relações estruturais declaradas.
"Análise do Evento" = descrição objetiva e educativa. Ativos = derivados por event_currency_bias.
"""

from datetime import datetime
from typing import Optional, Dict, Any, List

from analysis.event_descriptions import get_event_description
from analysis.event_currency_bias import get_derived_assets_for_event, to_principal_secundarios

# Tipo de evento inferido do título (palavras-chave). Sem dados externos.
def _event_type(title: str) -> str:
    t = (title or "").lower()
    if any(x in t for x in ["cpi", "pce", "inflation", "inflação", "pci", "ppi"]):
        return "inflação"
    if any(x in t for x in ["employment", "nfp", "jobless", "unemployment", "emprego", "payroll", "jolts"]):
        return "emprego"
    if any(x in t for x in ["gdp", "pmi", "industrial", "retail", "manufacturing", "activity", "atividade"]):
        return "atividade"
    if any(x in t for x in ["rate", "fomc", "ecb", "boe", "central bank", "bc", "decision", "decisão"]):
        return "bc"
    return "atividade"

def generate_event_analysis(event: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Gera análise para TODO evento. Nunca "Análise indisponível".
    Análise = descrição objetiva (event_descriptions). Ativos = derivados por event_currency_bias (≥1 quando há currency).
    """
    event_id = event.get("id")
    if not event_id:
        return None
    title = event.get("title") or event.get("event") or ""
    currency = event.get("currency") or "USD"
    event_type = _event_type(title)

    # Análise do Evento: descrição objetiva institucional.
    summary = get_event_description(title, event_type)
    if len(summary) > 520:
        summary = summary[:517].rsplit(" ", 1)[0] + "."

    # Ativos relacionados ao evento: tabela fixa (event_type, currency). ≥1 quando há currency.
    derived = get_derived_assets_for_event(event_type, currency)
    ativos = to_principal_secundarios(derived)

    return {
        "event_id": event_id,
        "summary": summary,
        "expected_impact": "",
        "forex_pairs": [],
        "us_indices": [],
        "metals": [],
        "ativo_beneficiado_evento": ativos,
        "generated_at": datetime.now().isoformat(),
    }
