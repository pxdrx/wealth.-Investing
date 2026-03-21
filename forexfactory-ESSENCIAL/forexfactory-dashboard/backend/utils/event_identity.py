"""
Utilitários para identidade determinística de eventos.
Gera event_uid reprodutível baseado em dados do print.
"""
import hashlib
from typing import Optional


def normalize_event_name(name: str) -> str:
    """Normaliza nome do evento para hash determinístico."""
    if not name:
        return ""
    # Remover espaços extras, converter para minúsculas, remover caracteres especiais
    normalized = " ".join(name.lower().split())
    # Remover caracteres que podem variar entre scrapes
    normalized = normalized.replace("'", "").replace('"', '').replace("`", "")
    return normalized


def generate_event_uid(
    source: str,
    week_key: str,
    print_date_label: str,
    print_time_label: str,
    currency: Optional[str],
    print_row_index: int,
    normalized_name: str,
) -> str:
    """
    Gera event_uid determinístico e reprodutível.
    
    Args:
        source: Fonte do evento (ex: "FOREXFACTORY")
        week_key: Chave da semana (ex: "2026-01-25_to_2026-01-31")
        print_date_label: Rótulo de data do print (ex: "Mon Jan 26")
        print_time_label: Rótulo de horário do print (ex: "09:30")
        currency: Moeda do evento (pode ser None)
        print_row_index: Índice da linha no print original (0-based)
        normalized_name: Nome normalizado do evento
    
    Returns:
        event_uid: String determinística (hash base64-like)
    """
    # Construir string de componentes para hash
    components = [
        str(source or ""),
        str(week_key or ""),
        str(print_date_label or ""),
        str(print_time_label or ""),
        str(currency or ""),
        str(int(print_row_index)),
        normalize_event_name(normalized_name),
    ]
    
    # Concatenar com separador único
    uid_string = "|".join(components)
    
    # Gerar hash SHA256 e usar primeiros 16 caracteres hex
    hash_obj = hashlib.sha256(uid_string.encode('utf-8'))
    uid_hex = hash_obj.hexdigest()[:16]
    
    # Formato: evt_<hash>
    return f"evt_{uid_hex}"


def get_week_key(week_start: str, week_end: str) -> str:
    """
    Gera week_key determinístico para semana fixa.
    
    Args:
        week_start: Data de início (formato: YYYY-MM-DD)
        week_end: Data de fim (formato: YYYY-MM-DD)
    
    Returns:
        week_key: String no formato "YYYY-MM-DD_to_YYYY-MM-DD"
    """
    return f"{week_start}_to_{week_end}"
