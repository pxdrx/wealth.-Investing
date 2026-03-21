"""
Utilitários de conversão de fuso horário.
Fuso canônico do sistema: America/Sao_Paulo (UTC-3)
"""

from datetime import datetime, timezone, timedelta
from typing import Dict, Optional, Tuple
import pytz


# Fuso horário canônico do sistema
SYSTEM_TIMEZONE = pytz.timezone('America/Sao_Paulo')
UTC_TIMEZONE = pytz.UTC


def parse_time_string(time_str: str) -> Tuple[int, int]:
    """
    Converte string de horário para (hora, minuto).
    
    Suporta formatos:
    - "HH:MM" (24h)
    - "H:MMam/pm" (12h)
    - "All Day" -> (0, 0)
    
    Returns:
        Tuple[int, int]: (hora, minuto)
    """
    if not time_str or time_str.strip().lower() == 'all day':
        return (0, 0)
    
    time_str = time_str.strip().lower()
    
    # Formato 24h: "HH:MM"
    if ':' in time_str and ('am' not in time_str and 'pm' not in time_str):
        try:
            parts = time_str.split(':')
            hour = int(parts[0])
            minute = int(parts[1]) if len(parts) > 1 else 0
            return (hour, minute)
        except:
            return (0, 0)
    
    # Formato 12h: "H:MMam" ou "H:MMpm"
    try:
        if 'am' in time_str:
            time_str_clean = time_str.replace('am', '').strip()
            parts = time_str_clean.split(':')
            hour = int(parts[0])
            minute = int(parts[1]) if len(parts) > 1 else 0
            if hour == 12:
                hour = 0
            return (hour, minute)
        elif 'pm' in time_str:
            time_str_clean = time_str.replace('pm', '').strip()
            parts = time_str_clean.split(':')
            hour = int(parts[0])
            minute = int(parts[1]) if len(parts) > 1 else 0
            if hour < 12:
                hour += 12
            return (hour, minute)
    except:
        pass
    
    return (0, 0)


def convert_to_local_timezone(
    date_str: str,
    time_str: str,
    source_timezone: Optional[str] = 'UTC'
) -> Dict[str, any]:
    """
    Converte horário de evento para fuso horário local (America/Sao_Paulo).
    
    Args:
        date_str: Data no formato "YYYY-MM-DD"
        time_str: Horário no formato "HH:MM" ou "H:MMam/pm"
        source_timezone: Fuso horário de origem ('UTC', 'GMT', ou timezone name)
    
    Returns:
        Dict com campos obrigatórios:
        {
            'original_time': str,
            'original_timezone': str,
            'event_datetime_utc': str (ISO format),
            'event_datetime_local': str (ISO format com offset),
            'weekday_local': int (0=segunda, 6=domingo),
            'date_local': str (YYYY-MM-DD),
            'time_local': str (HH:MM)
        }
    """
    # Parse do horário original
    hour, minute = parse_time_string(time_str)
    
    # Determinar timezone de origem
    if source_timezone in ['UTC', 'GMT', None]:
        source_tz = UTC_TIMEZONE
        source_tz_name = 'UTC'
    else:
        try:
            source_tz = pytz.timezone(source_timezone)
            source_tz_name = source_timezone
        except:
            source_tz = UTC_TIMEZONE
            source_tz_name = 'UTC'
    
    # Criar datetime na origem (assumindo UTC se não especificado)
    try:
        naive_dt = datetime.strptime(f"{date_str} {hour:02d}:{minute:02d}", "%Y-%m-%d %H:%M")
        # Localizar no timezone de origem
        if source_tz == UTC_TIMEZONE:
            dt_utc = naive_dt.replace(tzinfo=UTC_TIMEZONE)
        else:
            dt_utc = source_tz.localize(naive_dt).astimezone(UTC_TIMEZONE)
    except Exception as e:
        # Fallback: usar meia-noite UTC
        dt_utc = datetime.strptime(date_str, "%Y-%m-%d").replace(tzinfo=UTC_TIMEZONE)
    
    # Converter para timezone local (America/Sao_Paulo)
    dt_local = dt_utc.astimezone(SYSTEM_TIMEZONE)
    
    # Extrair informações locais
    weekday_local = dt_local.weekday()  # 0=segunda, 6=domingo
    date_local = dt_local.strftime("%Y-%m-%d")
    time_local = dt_local.strftime("%H:%M")
    
    return {
        'original_time': time_str,
        'original_timezone': source_tz_name,
        'event_datetime_utc': dt_utc.isoformat(),
        'event_datetime_local': dt_local.isoformat(),
        'weekday_local': weekday_local,
        'date_local': date_local,
        'time_local': time_local,
        'timezone': 'America/Sao_Paulo (UTC-3)'
    }


def validate_timezone_mapping(event: Dict) -> Tuple[bool, Optional[str]]:
    """
    Valida se evento tem mapeamento de timezone correto.
    
    Args:
        event: Dicionário de evento
    
    Returns:
        Tuple[bool, Optional[str]]: (válido, mensagem de erro se inválido)
    """
    required_fields = [
        'event_datetime_local',
        'weekday_local',
        'date_local',
        'time_local'
    ]
    
    missing = [f for f in required_fields if f not in event]
    if missing:
        return (False, f"Campos obrigatórios ausentes: {', '.join(missing)}")
    
    # Validar que weekday_local está entre 0-6
    weekday = event.get('weekday_local')
    if weekday is None or not (0 <= weekday <= 6):
        return (False, f"weekday_local inválido: {weekday}")
    
    # Validar formato de datetime local
    try:
        datetime.fromisoformat(event['event_datetime_local'].replace('Z', '+00:00'))
    except:
        return (False, f"Formato inválido de event_datetime_local: {event.get('event_datetime_local')}")
    
    return (True, None)


def get_local_timestamp() -> str:
    """
    Retorna timestamp atual no fuso horário local.
    
    Returns:
        str: "YYYY-MM-DD HH:MM (BRT)"
    """
    now_local = datetime.now(SYSTEM_TIMEZONE)
    return now_local.strftime("%Y-%m-%d %H:%M (BRT)")


def get_weekday_name(weekday: int) -> str:
    """
    Converte número de weekday para nome.
    
    Args:
        weekday: 0=segunda, 6=domingo
    
    Returns:
        str: Nome do dia da semana
    """
    weekdays = {
        0: 'Segunda-feira',
        1: 'Terça-feira',
        2: 'Quarta-feira',
        3: 'Quinta-feira',
        4: 'Sexta-feira',
        5: 'Sábado',
        6: 'Domingo'
    }
    return weekdays.get(weekday, 'Desconhecido')
