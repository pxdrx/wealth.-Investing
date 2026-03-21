"""
Cursor fixo da semana — utilitário para ordenação e comparação.

Regras institucionais:
- O sistema NÃO usa data real nem timezone.
- Validação usa: weekday (Monday–Friday), print_time_label (rótulo), ordem fixa Mon < Tue < Wed < Thu < Fri.
- NOTA: actual NÃO é bloqueado por cursor. Se Forex Factory divulgou o resultado, o sistema exibe.
"""

from __future__ import annotations

import os
import re
from typing import Optional, Tuple

# Ordem fixa da semana (Mon < Tue < Wed < Thu < Fri); fim de semana após sexta.
# Única fonte da verdade para comparação de "evento já ocorreu" vs "futuro".
WEEKDAY_ORDER = {
    "Monday": 0,
    "Tuesday": 1,
    "Wednesday": 2,
    "Thursday": 3,
    "Friday": 4,
    "Saturday": 5,
    "Sunday": 6,
}


def get_current_week_cursor(
    override: Optional[str] = None,
) -> Tuple[str, int]:
    """
    Retorna (weekday_str, minutes_since_midnight) do cursor da semana.

    Fonte: variável de ambiente CURRENT_WEEK_CURSOR (ex.: "Wednesday 14:00" ou "Wednesday").
    Se override for passado (ex.: em testes), usa override no lugar do env.
    Formato: "Weekday" ou "Weekday HH:MM" (24h). Hora padrão 00:00 se omitida.
    """
    raw = override or os.environ.get("CURRENT_WEEK_CURSOR", "").strip()
    if not raw:
        # Default seguro: Monday 00:00 (todos os eventos "futuros" até configurar)
        return "Monday", 0

    parts = re.split(r"\s+", raw, maxsplit=1)
    weekday_raw = (parts[0] or "").strip()
    time_raw = (parts[1] or "").strip() if len(parts) > 1 else ""

    _wd_map = {
        "monday": "Monday", "tuesday": "Tuesday", "wednesday": "Wednesday",
        "thursday": "Thursday", "friday": "Friday", "saturday": "Saturday", "sunday": "Sunday",
        "mon": "Monday", "tue": "Tuesday", "wed": "Wednesday",
        "thu": "Thursday", "fri": "Friday", "sat": "Saturday", "sun": "Sunday",
    }
    weekday = _wd_map.get(weekday_raw.lower(), weekday_raw) if weekday_raw else "Monday"
    if weekday not in WEEKDAY_ORDER:
        weekday = "Monday"

    minutes = 0
    if time_raw:
        # HH:MM ou H:MM (24h)
        m = re.match(r"^(\d{1,2}):(\d{2})$", time_raw.strip())
        if m:
            h, min_val = int(m.group(1)), int(m.group(2))
            if 0 <= h <= 23 and 0 <= min_val <= 59:
                minutes = h * 60 + min_val

    return weekday, minutes


def is_event_future(
    event_weekday: str,
    event_sort_time_key: Optional[int],
    cursor_weekday: str,
    cursor_minutes: int,
) -> bool:
    """
    True se o evento é FUTURO em relação ao cursor (não ocorreu ainda).

    Ordem: (weekday_order, sort_time_key). Evento é futuro se (ev_w, ev_t) > (cur_w, cur_t).
    """
    ev_w = WEEKDAY_ORDER.get(event_weekday)
    cur_w = WEEKDAY_ORDER.get(cursor_weekday)
    if ev_w is None:
        ev_w = 0
    if cur_w is None:
        cur_w = 0

    ev_t = int(event_sort_time_key) if event_sort_time_key is not None else 0

    if ev_w > cur_w:
        return True
    if ev_w < cur_w:
        return False
    return ev_t > cursor_minutes
