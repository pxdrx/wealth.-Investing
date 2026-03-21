"""
Ordenação determinística de eventos baseada em print_time_label.
Sem objetos temporais, sem inferência de timezone.
"""
from typing import Optional, Tuple


def parse_time_label_to_minutes(print_time_label: str) -> Optional[int]:
    """
    Converte print_time_label para minutos desde 00:00.
    Retorna None se não for horário válido HH:MM.
    
    Args:
        print_time_label: Rótulo do print (ex: "09:30", "All Day", "Tentative", "—")
    
    Returns:
        minutos desde 00:00 (0-1439) ou None se não for horário válido
    """
    if not print_time_label:
        return None
    
    label = print_time_label.strip()
    
    # Tentar parsear HH:MM
    if ':' in label:
        parts = label.split(':')
        if len(parts) == 2:
            try:
                hour = int(parts[0])
                minute = int(parts[1])
                if 0 <= hour <= 23 and 0 <= minute <= 59:
                    return hour * 60 + minute
            except ValueError:
                pass
    
    # Não é horário válido
    return None


def get_time_category_order(print_time_label: str) -> int:
    """
    Retorna ordem fixa para rótulos especiais.
    Usado como fallback quando parsing falha.
    
    Ordem:
    1. "All Day" (antes de horários)
    2. Horários válidos (0-1439)
    3. "Tentative" (depois de horários)
    4. "—" ou vazio (no fim)
    5. Outros (no fim)
    """
    if not print_time_label:
        return 9999
    
    label = print_time_label.strip().lower()
    
    if label == "all day":
        return 0  # Antes de horários
    if "tentative" in label:
        return 2000  # Depois de horários
    if label == "—" or label == "-" or label == "":
        return 3000  # No fim
    
    # Se for horário válido, retornar None para usar minutos
    if parse_time_label_to_minutes(print_time_label) is not None:
        return None  # Usar minutos reais
    
    return 4000  # Outros rótulos desconhecidos


def deterministic_event_sort_key(
    print_time_label: str,
    print_row_index: Optional[int] = None,
    sort_time_key: Optional[int] = None,
) -> Tuple[int, int]:
    """
    Gera chave de ordenação determinística para evento.
    
    Ordem:
    1. sort_time_key (se disponível e válido)
    2. parsed_time_minutes (se print_time_label for HH:MM válido)
    3. time_category_order (para rótulos especiais)
    4. print_row_index (como tie-breaker final)
    
    Returns:
        Tuple[int, int]: (primary_sort, secondary_sort)
    """
    # Prioridade 1: usar sort_time_key se disponível e válido
    if sort_time_key is not None and 0 <= sort_time_key <= 1439:
        return (sort_time_key, print_row_index or 999999)
    
    # Prioridade 2: tentar parsear print_time_label
    parsed_minutes = parse_time_label_to_minutes(print_time_label)
    if parsed_minutes is not None:
        return (parsed_minutes, print_row_index or 999999)
    
    # Prioridade 3: usar categoria de rótulo especial
    category_order = get_time_category_order(print_time_label)
    if category_order is not None:
        return (category_order, print_row_index or 999999)
    
    # Fallback final: usar print_row_index
    return (999999, print_row_index or 999999)
