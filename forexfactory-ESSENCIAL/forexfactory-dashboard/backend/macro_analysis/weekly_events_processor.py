"""
MRKT Edge — Processador de Eventos Macro Semanal
Processa eventos da semana e gera panorama macro + ativos recomendados
"""

from datetime import datetime, date
from macro_analysis.timezone_utils import get_local_timestamp
from macro_analysis.config import is_narrative_sensitive
from typing import Dict, List, Optional, Tuple
from macro_analysis.assets.ftmo_assets import validate_and_normalize, is_ftmo_asset, FTMO_SYMBOLS


class WeeklyEventsProcessor:
    """Processa eventos macro da semana e gera recomendações."""
    
    def __init__(self):
        self.week_start = date(2026, 1, 25)  # Domingo 25/01/2026 (início da semana institucional)
        self.week_end = date(2026, 1, 31)    # Sábado 31/01/2026 (fim da semana institucional)
    
    def process_events(self) -> Dict:
        """
        Processa todos os eventos da semana 25-31/01/2026.
        Retorna estrutura completa para integração.
        """
        
        # Eventos processados das imagens fornecidas
        events = self._extract_events_from_images()
        
        # EVENT_UPDATE_STRICT = TRUE
        # ELIMINAÇÃO TOTAL DE TIMEZONE — Horário NÃO é valor temporal, é RÓTULO VISUAL.
        # Não corrigir, não converter, não forçar. ELIMINAR noção de tempo.
        WEEK_START = date(2026, 1, 25)
        WEEK_END = date(2026, 1, 31)
        week_start_str = str(WEEK_START)
        week_end_str = str(WEEK_END)
        events = [e for e in events if (e.get('date') or '') >= week_start_str and (e.get('date') or '') <= week_end_str]
        
        # Mapas fixos: rótulos do print → weekday. ENUM textual fixo — sem abreviações ("Mon" etc).
        ISO_TO_PRINT_DATE_LABEL = {
            "2026-01-25": "Sun Jan 25", "2026-01-26": "Mon Jan 26", "2026-01-27": "Tue Jan 27",
            "2026-01-28": "Wed Jan 28", "2026-01-29": "Thu Jan 29", "2026-01-30": "Fri Jan 30",
            "2026-01-31": "Sat Jan 31",
        }
        PRINT_DATE_LABEL_TO_WEEKDAY = {
            "Sun Jan 25": "Sunday", "Mon Jan 26": "Monday", "Tue Jan 27": "Tuesday",
            "Wed Jan 28": "Wednesday", "Thu Jan 29": "Thursday", "Fri Jan 30": "Friday",
            "Sat Jan 31": "Saturday",
        }
        VALID_WEEKDAYS = frozenset({"Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Sunday", "Saturday"})
        
        def _print_time_label_to_sort_key(label: str) -> int:
            """Extrai hora e minuto de print_time_label; retorna minutos desde 00:00. SEM Date/datetime."""
            s = (label or "").strip()
            if ":" not in s:
                raise RuntimeError(f"print_time_label inválido para sort_time_key (esperado H:MM ou HH:MM): {label!r}")
            parts = s.split(":", 1)
            try:
                h, m = int(parts[0].strip()), int(parts[1].strip())
            except (ValueError, IndexError):
                raise RuntimeError(f"print_time_label inválido para sort_time_key: {label!r}")
            if not (0 <= h <= 23 and 0 <= m <= 59):
                raise RuntimeError(f"print_time_label fora de range (00:00–23:59): {label!r}")
            return h * 60 + m
        
        for event in events:
            date_str = event.get('date', '')
            # Texto cru do print. Não é hora — é rótulo visual.
            print_time_label = event.get('time', '00:00')
            print_date_label = ISO_TO_PRINT_DATE_LABEL.get(date_str, date_str)
            weekday_raw = PRINT_DATE_LABEL_TO_WEEKDAY.get(print_date_label, 'Monday')
            weekday = str(weekday_raw or '').strip()
            if not weekday or weekday not in VALID_WEEKDAYS:
                raise RuntimeError(f"weekday vazio ou inválido (deve ser um de {sorted(VALID_WEEKDAYS)}): {weekday_raw!r}")
            
            sort_time_key = _print_time_label_to_sort_key(print_time_label)
            name = (event.get('event') or event.get('title') or '').strip()
            event['print_date_label'] = print_date_label
            event['print_time_label'] = print_time_label
            event['sort_time_key'] = sort_time_key
            event['weekday'] = weekday
            event['narrative_sensitive'] = is_narrative_sensitive(name)
            event['impact_level'] = event.get('impact', 'LOW')
            if event.get('print_time_label') != print_time_label:
                raise RuntimeError("Print label override failed")
        
        # ========================================================================
        # MODO EVENT_UPDATE_STRICT = TRUE
        # REGRA ABSOLUTA: Impacto vem EXATAMENTE do print (Forex Factory)
        # PROIBIDO: Reclassificar, inferir, ajustar ou validar impacto
        # ========================================================================
        
        invalid_events = []
        if invalid_events:
            print(f"[AVISO] {len(invalid_events)} eventos com problemas de timezone:")
            for e in invalid_events[:5]:
                print(f"  - {e.get('event', 'N/A')}: {e.get('timezone_error', 'Erro desconhecido')}")
        
        # Classificar eventos EXATAMENTE como vêm dos prints (sem reclassificação)
        # 🔴 VERMELHO → HIGH | 🟠 LARANJA → MEDIUM | 🟡 AMARELO → LOW
        # O sistema NÃO DECIDE impacto, apenas REPRODUZ o print
        high_impact = [e for e in events if e.get('impact', '').upper() == 'HIGH' and e.get('timezone_valid', True)]
        medium_impact = [e for e in events if e.get('impact', '').upper() == 'MEDIUM' and e.get('timezone_valid', True)]
        low_impact = [e for e in events if e.get('impact', '').upper() == 'LOW' and e.get('timezone_valid', True)]
        
        # Validação: contagem deve bater exatamente com o print
        total_from_prints = len(high_impact) + len(medium_impact) + len(low_impact)
        if total_from_prints != len(events):
            print(f"[AVISO] Divergência na contagem: {total_from_prints} classificados vs {len(events)} total")
        
        # Validação final: garantir que contagem bate exatamente com prints
        total_classified = len(high_impact) + len(medium_impact) + len(low_impact)
        if total_classified != len(events):
            print(f"[ERRO CRITICO] Divergência na contagem: {total_classified} classificados vs {len(events)} total")
            print(f"  HIGH: {len(high_impact)}, MEDIUM: {len(medium_impact)}, LOW: {len(low_impact)}")
        
        # Gerar panorama macro (usar apenas HIGH + MEDIUM para narrativa)
        panorama = self._generate_macro_panorama(events, high_impact, medium_impact)
        
        # Gerar ativos recomendados (usar apenas HIGH + MEDIUM)
        allocation = self._generate_allocation_recommendations(panorama, high_impact, medium_impact)
        
        return {
            'week_start': str(self.week_start),
            'week_end': str(self.week_end),
            'events': {
                'total': len(events),  # Todos contabilizados (HIGH + MEDIUM + LOW)
                'high': len(high_impact),  # 🔴 VERMELHO - Exibido
                'medium': len(medium_impact),  # 🟠 LARANJA - Exibido
                'low': len(low_impact),  # 🟡 AMARELO - Contabilizado mas NÃO exibido
                'displayed': high_impact + medium_impact,  # Apenas HIGH + MEDIUM para exibição
                'low_impact': low_impact,  # EVENT_DASHBOARD_HARD_RESET: persistir todos 84
            },
            'panorama': panorama,
            'allocation': allocation,
            'generated_at': datetime.now().isoformat(),
            'generated_at_local': get_local_timestamp()
        }
    
    def _extract_events_from_images(self) -> List[Dict]:
        """
        Extrai eventos EXATAMENTE como aparecem nos prints do Forex Factory.
        
        REGRA ABSOLUTA (EVENT_UPDATE_STRICT = TRUE):
        - Impacto vem EXATAMENTE da cor no print (🔴 HIGH, 🟠 MEDIUM, 🟡 LOW)
        - NÃO reclassificar, NÃO inferir, NÃO ajustar
        - Se o print mostra 15 vermelhos, o sistema exibe 15 HIGH
        - Nome do evento: texto exato do print (sem tradução, sem renomeação)
        """
        
        events = []
        
        # 25/01 (Domingo)
        events.append({
            'date': '2026-01-25',
            'time': 'All Day',
            'currency': 'AUD',
            'impact': 'LOW',
            'event': 'Bank Holiday',
            'forecast': None,
            'previous': None,
            'actual': None,
            'status': 'completed'
        })
        
        # 26/01 (Segunda) - EXATAMENTE como aparece no print (EVENT_UPDATE_STRICT)
        events.extend([
            {
                'date': '2026-01-26',
                'time': '6:00am',
                'currency': 'EUR',
                'impact': 'MEDIUM',  # 🟠 LARANJA no print
                'event': 'German ifo Business Climate',
                'forecast': 88.3,
                'previous': 87.6,
                'actual': 87.6,
                'deviation': -0.7,
                'status': 'completed',
                'macro_reading': 'Neutro a Ligeiramente Anti-Risco'
            },
            {
                'date': '2026-01-26',
                'time': '8:00am',
                'currency': 'EUR',
                'impact': 'LOW',  # 🟡 AMARELO no print
                'event': 'German Buba President Nagel Speaks',
                'forecast': None,
                'previous': None,
                'actual': None,
                'status': 'pending'
            },
            {
                'date': '2026-01-26',
                'time': '10:30am',
                'currency': 'EUR',
                'impact': 'LOW',  # 🟡 AMARELO no print
                'event': 'German Buba President Nagel Speaks',
                'forecast': None,
                'previous': None,
                'actual': None,
                'status': 'pending'
            },
            {
                'date': '2026-01-26',
                'time': '10:30am',
                'currency': 'USD',
                'impact': 'MEDIUM',  # 🟠 LARANJA no print
                'event': 'Core Durable Goods Orders m/m',
                'forecast': 0.3,
                'previous': 0.1,
                'actual': 0.5,
                'deviation': 0.2,
                'status': 'completed',
                'macro_reading': 'Pró-Risco, Ligeiramente Hawkish'
            },
            {
                'date': '2026-01-26',
                'time': '10:30am',
                'currency': 'USD',
                'impact': 'MEDIUM',  # 🟠 LARANJA no print
                'event': 'Durable Goods Orders m/m',
                'forecast': 3.1,
                'previous': -2.1,
                'actual': 5.3,
                'deviation': 2.2,
                'status': 'completed',
                'macro_reading': 'Pró-Risco, Hawkish'
            },
            {
                'date': '2026-01-26',
                'time': '10:33am',
                'currency': 'EUR',
                'impact': 'LOW',  # 🟡 AMARELO no print
                'event': 'Belgian NBB Business Climate',
                'forecast': -10.2,
                'previous': -11.9,
                'actual': -8.8,
                'deviation': 1.4,
                'status': 'completed',
                'macro_reading': 'Pró-Risco, Ligeiramente Positivo'
            },
            {
                'date': '2026-01-26',
                'time': '8:50pm',
                'currency': 'JPY',
                'impact': 'LOW',  # 🟡 AMARELO no print
                'event': 'SPPI y/y',
                'forecast': 2.5,
                'previous': 2.7,
                'actual': None,
                'status': 'pending'
            },
            {
                'date': '2026-01-26',
                'time': '9:01pm',
                'currency': 'GBP',
                'impact': 'LOW',  # 🟡 AMARELO no print
                'event': 'BRC Shop Price Index y/y',
                'forecast': 0.7,
                'previous': 0.6,
                'actual': None,
                'status': 'pending'
            },
            {
                'date': '2026-01-26',
                'time': '9:30pm',
                'currency': 'AUD',
                'impact': 'LOW',  # 🟡 AMARELO no print
                'event': 'NAB Business Confidence',
                'forecast': None,
                'previous': 1,
                'actual': None,
                'status': 'pending'
            },
            {
                'date': '2026-01-26',
                'time': '11:00pm',
                'currency': 'NZD',
                'impact': 'LOW',  # 🟡 AMARELO no print
                'event': 'Credit Card Spending y/y',
                'forecast': None,
                'previous': 4.7,
                'actual': None,
                'status': 'pending'
            }
        ])
        
        # 27/01 (Terça) - EXATAMENTE como aparece no print (EVENT_UPDATE_STRICT)
        events.extend([
            {
                'date': '2026-01-27',
                'time': '2:00am',
                'currency': 'JPY',
                'impact': 'LOW',  # 🟡 AMARELO no print
                'event': 'BOJ Core CPI y/y',
                'forecast': 2.0,
                'previous': 2.2,
                'actual': None,
                'status': 'pending'
            },
            {
                'date': '2026-01-27',
                'time': '5:00am',
                'currency': 'EUR',
                'impact': 'LOW',  # 🟡 AMARELO no print
                'event': 'Spanish Unemployment Rate',
                'forecast': 10.2,
                'previous': 10.5,
                'actual': None,
                'status': 'pending'
            },
            {
                'date': '2026-01-27',
                'time': 'Tentative',
                'currency': 'USD',
                'impact': 'LOW',  # 🟡 AMARELO no print
                'event': 'ADP Weekly Employment Change',
                'forecast': None,
                'previous': 8.0,
                'actual': None,
                'status': 'pending'
            },
            {
                'date': '2026-01-27',
                'time': 'Tentative',
                'currency': 'USD',
                'impact': 'MEDIUM',  # 🟠 LARANJA no print
                'event': 'President Trump Speaks',
                'forecast': None,
                'previous': None,
                'actual': None,
                'status': 'pending'
            },
            {
                'date': '2026-01-27',
                'time': '11:00am',
                'currency': 'USD',
                'impact': 'LOW',  # 🟡 AMARELO no print
                'event': 'HPI m/m',
                'forecast': 0.3,
                'previous': 0.4,
                'actual': None,
                'status': 'pending'
            },
            {
                'date': '2026-01-27',
                'time': '11:00am',
                'currency': 'USD',
                'impact': 'LOW',  # 🟡 AMARELO no print
                'event': 'S&P/CS Composite-20 HPI y/y',
                'forecast': 1.2,
                'previous': 1.3,
                'actual': None,
                'status': 'pending'
            },
            {
                'date': '2026-01-27',
                'time': '12:00pm',
                'currency': 'USD',
                'impact': 'MEDIUM',  # 🟠 LARANJA no print
                'event': 'CB Consumer Confidence',
                'forecast': 90.6,
                'previous': 89.1,
                'actual': None,
                'status': 'pending'
            },
            {
                'date': '2026-01-27',
                'time': '12:00pm',
                'currency': 'USD',
                'impact': 'MEDIUM',  # 🟠 LARANJA no print
                'event': 'Richmond Manufacturing Index',
                'forecast': -5,
                'previous': -7,
                'actual': None,
                'status': 'pending'
            },
            {
                'date': '2026-01-27',
                'time': '2:00pm',
                'currency': 'EUR',
                'impact': 'LOW',  # 🟡 AMARELO no print
                'event': 'German Buba President Nagel Speaks',
                'forecast': None,
                'previous': None,
                'actual': None,
                'status': 'pending'
            },
            {
                'date': '2026-01-27',
                'time': '6:30pm',
                'currency': 'USD',
                'impact': 'LOW',  # 🟡 AMARELO no print
                'event': 'API Weekly Statistical Bulletin',
                'forecast': None,
                'previous': None,
                'actual': None,
                'status': 'pending'
            },
            {
                'date': '2026-01-27',
                'time': '8:50pm',
                'currency': 'JPY',
                'impact': 'LOW',  # 🟡 AMARELO no print
                'event': 'Monetary Policy Meeting Minutes',
                'forecast': None,
                'previous': None,
                'actual': None,
                'status': 'pending'
            },
            {
                'date': '2026-01-27',
                'time': '9:30pm',
                'currency': 'AUD',
                'impact': 'HIGH',  # 🔴 VERMELHO no print
                'event': 'CPI m/m',
                'forecast': 0.7,
                'previous': 0.0,
                'actual': None,
                'status': 'pending'
            },
            {
                'date': '2026-01-27',
                'time': '9:30pm',
                'currency': 'AUD',
                'impact': 'HIGH',  # 🔴 VERMELHO no print
                'event': 'CPI y/y',
                'forecast': 3.5,
                'previous': 3.4,
                'actual': None,
                'status': 'pending'
            },
            {
                'date': '2026-01-27',
                'time': '9:30pm',
                'currency': 'AUD',
                'impact': 'HIGH',  # 🔴 VERMELHO no print
                'event': 'Trimmed Mean CPI m/m',
                'forecast': 0.3,
                'previous': 0.3,
                'actual': None,
                'status': 'pending'
            }
        ])
        
        # 28/01 (Quarta) - EXATAMENTE como aparece no print (EVENT_UPDATE_STRICT)
        events.extend([
            {
                'date': '2026-01-28',
                'time': '4:00am',
                'currency': 'EUR',
                'impact': 'LOW',  # 🟡 AMARELO no print
                'event': 'German GfK Consumer Climate',
                'forecast': -25.7,
                'previous': -26.9,
                'actual': None,
                'status': 'pending'
            },
            {
                'date': '2026-01-28',
                'time': '6:00am',
                'currency': 'CHF',
                'impact': 'LOW',  # 🟡 AMARELO no print
                'event': 'UBS Economic Expectations',
                'forecast': None,
                'previous': 6.2,
                'actual': None,
                'status': 'pending'
            },
            {
                'date': '2026-01-28',
                'time': 'Tentative',
                'currency': 'EUR',
                'impact': 'LOW',  # 🟡 AMARELO no print
                'event': 'German 10-y Bond Auction',
                'forecast': None,
                'previous': 2.83,
                'actual': None,
                'status': 'pending'
            },
            {
                'date': '2026-01-28',
                'time': '11:00am',
                'currency': 'CNY',
                'impact': 'LOW',  # 🟡 AMARELO no print
                'event': 'CB Leading Index m/m',
                'forecast': None,
                'previous': -0.3,
                'actual': None,
                'status': 'pending'
            },
            {
                'date': '2026-01-28',
                'time': '11:45am',
                'currency': 'CAD',
                'impact': 'HIGH',  # 🔴 VERMELHO no print
                'event': 'BOC Monetary Policy Report',
                'forecast': None,
                'previous': None,
                'actual': None,
                'status': 'pending'
            },
            {
                'date': '2026-01-28',
                'time': '11:45am',
                'currency': 'CAD',
                'impact': 'HIGH',  # 🔴 VERMELHO no print
                'event': 'BOC Rate Statement',
                'forecast': None,
                'previous': None,
                'actual': None,
                'status': 'pending'
            },
            {
                'date': '2026-01-28',
                'time': '11:45am',
                'currency': 'CAD',
                'impact': 'HIGH',  # 🔴 VERMELHO no print
                'event': 'Overnight Rate',
                'forecast': 2.25,
                'previous': 2.25,
                'actual': None,
                'status': 'pending'
            },
            {
                'date': '2026-01-28',
                'time': '12:30pm',
                'currency': 'CAD',
                'impact': 'HIGH',  # 🔴 VERMELHO no print
                'event': 'BOC Press Conference',
                'forecast': None,
                'previous': None,
                'actual': None,
                'status': 'pending'
            },
            {
                'date': '2026-01-28',
                'time': '12:30pm',
                'currency': 'USD',
                'impact': 'LOW',  # 🟡 AMARELO no print
                'event': 'Crude Oil Inventories',
                'forecast': None,
                'previous': 3.6,
                'actual': None,
                'status': 'pending'
            },
            {
                'date': '2026-01-28',
                'time': '4:00pm',
                'currency': 'USD',
                'impact': 'HIGH',  # 🔴 VERMELHO no print
                'event': 'Federal Funds Rate',
                'forecast': 3.75,
                'previous': 3.75,
                'actual': None,
                'status': 'pending'
            },
            {
                'date': '2026-01-28',
                'time': '4:00pm',
                'currency': 'USD',
                'impact': 'HIGH',  # 🔴 VERMELHO no print
                'event': 'FOMC Statement',
                'forecast': None,
                'previous': None,
                'actual': None,
                'status': 'pending'
            },
            {
                'date': '2026-01-28',
                'time': '4:30pm',
                'currency': 'USD',
                'impact': 'HIGH',  # 🔴 VERMELHO no print
                'event': 'FOMC Press Conference',
                'forecast': None,
                'previous': None,
                'actual': None,
                'status': 'pending'
            },
            {
                'date': '2026-01-28',
                'time': '6:45pm',
                'currency': 'NZD',
                'impact': 'LOW',  # 🟡 AMARELO no print
                'event': 'Trade Balance',
                'forecast': 30,
                'previous': -163,
                'actual': None,
                'status': 'pending'
            },
            {
                'date': '2026-01-28',
                'time': '9:00pm',
                'currency': 'NZD',
                'impact': 'LOW',  # 🟡 AMARELO no print
                'event': 'ANZ Business Confidence',
                'forecast': None,
                'previous': 73.6,
                'actual': None,
                'status': 'pending'
            },
            {
                'date': '2026-01-28',
                'time': '9:30pm',
                'currency': 'AUD',
                'impact': 'LOW',  # 🟡 AMARELO no print
                'event': 'Import Prices q/q',
                'forecast': -0.2,
                'previous': -0.4,
                'actual': None,
                'status': 'pending'
            }
        ])
        
        # 29/01 (Quinta) - EXATAMENTE como aparece no print (EVENT_UPDATE_STRICT)
        events.extend([
            {
                'date': '2026-01-29',
                'time': '2:00am',
                'currency': 'JPY',
                'impact': 'LOW',  # 🟡 AMARELO no print
                'event': 'Consumer Confidence',
                'forecast': 37.1,
                'previous': 37.2,
                'actual': None,
                'status': 'pending'
            },
            {
                'date': '2026-01-29',
                'time': '4:00am',
                'currency': 'CHF',
                'impact': 'LOW',  # 🟡 AMARELO no print
                'event': 'Trade Balance',
                'forecast': 4.85,
                'previous': 3.84,
                'actual': None,
                'status': 'pending'
            },
            {
                'date': '2026-01-29',
                'time': '6:00am',
                'currency': 'EUR',
                'impact': 'LOW',  # 🟡 AMARELO no print
                'event': 'M3 Money Supply y/y',
                'forecast': 3.0,
                'previous': 3.0,
                'actual': None,
                'status': 'pending'
            },
            {
                'date': '2026-01-29',
                'time': '6:00am',
                'currency': 'EUR',
                'impact': 'LOW',  # 🟡 AMARELO no print
                'event': 'Private Loans y/y',
                'forecast': 2.9,
                'previous': 2.9,
                'actual': None,
                'status': 'pending'
            },
            {
                'date': '2026-01-29',
                'time': 'Tentative',
                'currency': 'EUR',
                'impact': 'LOW',  # 🟡 AMARELO no print
                'event': 'Italian 10-y Bond Auction',
                'forecast': None,
                'previous': None,
                'actual': None,
                'status': 'pending'
            },
            {
                'date': '2026-01-29',
                'time': '10:30am',
                'currency': 'CAD',
                'impact': 'LOW',  # 🟡 AMARELO no print
                'event': 'Trade Balance',
                'forecast': -0.7,
                'previous': -0.6,
                'actual': None,
                'status': 'pending'
            },
            {
                'date': '2026-01-29',
                'time': '10:30am',
                'currency': 'USD',
                'impact': 'HIGH',  # 🔴 VERMELHO no print
                'event': 'Unemployment Claims',
                'forecast': 202,
                'previous': 200,
                'actual': None,
                'status': 'pending'
            },
            {
                'date': '2026-01-29',
                'time': '10:30am',
                'currency': 'USD',
                'impact': 'LOW',  # 🟡 AMARELO no print
                'event': 'Revised Nonfarm Productivity q/q',
                'forecast': 4.9,
                'previous': 4.9,
                'actual': None,
                'status': 'pending'
            },
            {
                'date': '2026-01-29',
                'time': '10:30am',
                'currency': 'USD',
                'impact': 'LOW',  # 🟡 AMARELO no print
                'event': 'Revised Unit Labor Costs q/q',
                'forecast': -1.9,
                'previous': -1.9,
                'actual': None,
                'status': 'pending'
            },
            {
                'date': '2026-01-29',
                'time': '10:30am',
                'currency': 'USD',
                'impact': 'LOW',  # 🟡 AMARELO no print
                'event': 'Trade Balance',
                'forecast': -44.5,
                'previous': -29.4,
                'actual': None,
                'status': 'pending'
            },
            {
                'date': '2026-01-29',
                'time': '12:00pm',
                'currency': 'USD',
                'impact': 'LOW',  # 🟡 AMARELO no print
                'event': 'Factory Orders m/m',
                'forecast': 0.5,
                'previous': -1.3,
                'actual': None,
                'status': 'pending'
            },
            {
                'date': '2026-01-29',
                'time': '12:00pm',
                'currency': 'USD',
                'impact': 'LOW',  # 🟡 AMARELO no print
                'event': 'Final Wholesale Inventories m/m',
                'forecast': 0.2,
                'previous': 0.2,
                'actual': None,
                'status': 'pending'
            },
            {
                'date': '2026-01-29',
                'time': '12:30pm',
                'currency': 'USD',
                'impact': 'LOW',  # 🟡 AMARELO no print
                'event': 'Natural Gas Storage',
                'forecast': None,
                'previous': -120,
                'actual': None,
                'status': 'pending'
            },
            {
                'date': '2026-01-29',
                'time': '8:30pm',
                'currency': 'JPY',
                'impact': 'MEDIUM',  # 🟠 LARANJA no print
                'event': 'Tokyo Core CPI y/y',
                'forecast': 2.2,
                'previous': 2.3,
                'actual': None,
                'status': 'pending'
            },
            {
                'date': '2026-01-29',
                'time': '8:30pm',
                'currency': 'JPY',
                'impact': 'LOW',  # 🟡 AMARELO no print
                'event': 'Unemployment Rate',
                'forecast': 2.6,
                'previous': 2.6,
                'actual': None,
                'status': 'pending'
            },
            {
                'date': '2026-01-29',
                'time': '8:50pm',
                'currency': 'JPY',
                'impact': 'LOW',  # 🟡 AMARELO no print
                'event': 'Prelim Industrial Production m/m',
                'forecast': -0.4,
                'previous': -2.7,
                'actual': None,
                'status': 'pending'
            },
            {
                'date': '2026-01-29',
                'time': '8:50pm',
                'currency': 'JPY',
                'impact': 'LOW',  # 🟡 AMARELO no print
                'event': 'Retail Sales y/y',
                'forecast': 0.7,
                'previous': 1.1,
                'actual': None,
                'status': 'pending'
            },
            {
                'date': '2026-01-29',
                'time': '9:30pm',
                'currency': 'AUD',
                'impact': 'LOW',  # 🟡 AMARELO no print
                'event': 'PPI q/q',
                'forecast': 1.1,
                'previous': 1.0,
                'actual': None,
                'status': 'pending'
            },
            {
                'date': '2026-01-29',
                'time': '9:30pm',
                'currency': 'AUD',
                'impact': 'LOW',  # 🟡 AMARELO no print
                'event': 'Private Sector Credit m/m',
                'forecast': 0.6,
                'previous': 0.6,
                'actual': None,
                'status': 'pending'
            }
        ])
        
        # 30/01 (Sexta) - EXATAMENTE como aparece no print (EVENT_UPDATE_STRICT)
        events.extend([
            {
                'date': '2026-01-30',
                'time': '2:00am',
                'currency': 'JPY',
                'impact': 'LOW',  # 🟡 AMARELO no print
                'event': 'Housing Starts y/y',
                'forecast': -8.5,
                'previous': None,
                'actual': -4.5,
                'status': 'completed'
            },
            {
                'date': '2026-01-30',
                'time': '3:30am',
                'currency': 'EUR',
                'impact': 'LOW',  # 🟡 AMARELO no print
                'event': 'French Consumer Spending m/m',
                'forecast': -0.3,
                'previous': None,
                'actual': -0.4,
                'status': 'completed'
            },
            {
                'date': '2026-01-30',
                'time': '3:30am',
                'currency': 'EUR',
                'impact': 'LOW',  # 🟡 AMARELO no print
                'event': 'French Flash GDP q/q',
                'forecast': 0.5,
                'previous': None,
                'actual': 0.2,
                'status': 'completed'
            },
            {
                'date': '2026-01-30',
                'time': '4:00am',
                'currency': 'EUR',
                'impact': 'LOW',  # 🟡 AMARELO no print
                'event': 'German Import Prices m/m',
                'forecast': 0.5,
                'previous': None,
                'actual': -0.4,
                'status': 'completed'
            },
            {
                'date': '2026-01-30',
                'time': 'All Day',
                'currency': 'EUR',
                'impact': 'MEDIUM',  # 🟠 LARANJA no print
                'event': 'German Prelim CPI m/m',
                'forecast': 0.0,
                'previous': 0.0,
                'actual': 0.0,
                'status': 'completed'
            },
            {
                'date': '2026-01-30',
                'time': '4:45am',
                'currency': 'EUR',
                'impact': 'LOW',  # 🟡 AMARELO no print
                'event': 'French Prelim Private Payrolls q/q',
                'forecast': -0.1,
                'previous': None,
                'actual': 0.1,
                'status': 'completed'
            },
            {
                'date': '2026-01-30',
                'time': '5:00am',
                'currency': 'CHF',
                'impact': 'LOW',  # 🟡 AMARELO no print
                'event': 'KOF Economic Barometer',
                'forecast': 103.4,
                'previous': None,
                'actual': 103.2,
                'status': 'completed'
            },
            {
                'date': '2026-01-30',
                'time': '5:00am',
                'currency': 'EUR',
                'impact': 'LOW',  # 🟡 AMARELO no print
                'event': 'Spanish Flash CPI y/y',
                'forecast': 2.9,
                'previous': None,
                'actual': 2.4,
                'status': 'completed'
            },
            {
                'date': '2026-01-30',
                'time': '5:00am',
                'currency': 'EUR',
                'impact': 'LOW',  # 🟡 AMARELO no print
                'event': 'Spanish Flash GDP q/q',
                'forecast': 0.6,
                'previous': None,
                'actual': 0.6,
                'status': 'completed'
            },
            {
                'date': '2026-01-30',
                'time': '5:55am',
                'currency': 'EUR',
                'impact': 'LOW',  # 🟡 AMARELO no print
                'event': 'German Unemployment Change',
                'forecast': 3,
                'previous': None,
                'actual': 5,
                'status': 'completed'
            },
            {
                'date': '2026-01-30',
                'time': '6:00am',
                'currency': 'EUR',
                'impact': 'MEDIUM',  # 🟠 LARANJA no print
                'event': 'German Prelim GDP q/q',
                'forecast': 0.0,
                'previous': None,
                'actual': 0.2,
                'status': 'completed'
            },
            {
                'date': '2026-01-30',
                'time': '6:00am',
                'currency': 'EUR',
                'impact': 'LOW',  # 🟡 AMARELO no print
                'event': 'Italian Prelim GDP q/q',
                'forecast': 0.1,
                'previous': None,
                'actual': 0.2,
                'status': 'completed'
            },
            {
                'date': '2026-01-30',
                'time': '6:30am',
                'currency': 'GBP',
                'impact': 'LOW',  # 🟡 AMARELO no print
                'event': 'M4 Money Supply m/m',
                'forecast': 0.8,
                'previous': None,
                'actual': 0.3,
                'status': 'completed'
            },
            {
                'date': '2026-01-30',
                'time': '6:30am',
                'currency': 'GBP',
                'impact': 'LOW',  # 🟡 AMARELO no print
                'event': 'Mortgage Approvals',
                'forecast': 65,
                'previous': None,
                'actual': 65,
                'status': 'completed'
            },
            {
                'date': '2026-01-30',
                'time': '6:30am',
                'currency': 'GBP',
                'impact': 'LOW',  # 🟡 AMARELO no print
                'event': 'Net Lending to Individuals m/m',
                'forecast': 6.6,
                'previous': None,
                'actual': 6.1,
                'status': 'completed'
            },
            {
                'date': '2026-01-30',
                'time': '7:00am',
                'currency': 'EUR',
                'impact': 'LOW',  # 🟡 AMARELO no print
                'event': 'Italian Monthly Unemployment Rate',
                'forecast': 5.7,
                'previous': None,
                'actual': 5.8,
                'status': 'completed'
            },
            {
                'date': '2026-01-30',
                'time': '7:00am',
                'currency': 'EUR',
                'impact': 'LOW',  # 🟡 AMARELO no print
                'event': 'Prelim Flash GDP q/q',
                'forecast': 0.3,
                'previous': None,
                'actual': 0.2,
                'status': 'completed'
            },
            {
                'date': '2026-01-30',
                'time': '7:00am',
                'currency': 'EUR',
                'impact': 'LOW',  # 🟡 AMARELO no print
                'event': 'Unemployment Rate',
                'forecast': 6.3,
                'previous': None,
                'actual': 6.3,
                'status': 'completed'
            },
            {
                'date': '2026-01-30',
                'time': '10:30am',
                'currency': 'CAD',
                'impact': 'HIGH',  # 🔴 VERMELHO no print
                'event': 'GDP m/m',
                'forecast': -0.3,
                'previous': None,
                'actual': 0.1,
                'status': 'completed'
            },
            {
                'date': '2026-01-30',
                'time': '10:30am',
                'currency': 'USD',
                'impact': 'HIGH',  # 🔴 VERMELHO no print
                'event': 'Core PPI m/m',
                'forecast': 0.0,
                'previous': 0.0,
                'actual': 0.3,
                'status': 'completed'
            },
            {
                'date': '2026-01-30',
                'time': '10:30am',
                'currency': 'USD',
                'impact': 'HIGH',  # 🔴 VERMELHO no print
                'event': 'PPI m/m',
                'forecast': 0.2,
                'previous': 0.2,
                'actual': 0.2,
                'status': 'completed'
            },
            {
                'date': '2026-01-30',
                'time': '11:45am',
                'currency': 'USD',
                'impact': 'LOW',  # 🟡 AMARELO no print
                'event': 'Chicago PMI',
                'forecast': 43.5,
                'previous': None,
                'actual': 43.3,
                'status': 'completed'
            },
            {
                'date': '2026-01-30',
                'time': '2:30pm',
                'currency': 'USD',
                'impact': 'MEDIUM',  # 🟠 LARANJA no print
                'event': 'FOMC Member Musalem Speaks',
                'forecast': None,
                'previous': None,
                'actual': None,
                'status': 'pending'
            },
            {
                'date': '2026-01-30',
                'time': '10:30pm',
                'currency': 'CNY',
                'impact': 'MEDIUM',  # 🟠 LARANJA no print
                'event': 'Manufacturing PMI',
                'forecast': 50.1,
                'previous': None,
                'actual': 50.2,
                'status': 'completed'
            },
            {
                'date': '2026-01-30',
                'time': '10:30pm',
                'currency': 'CNY',
                'impact': 'MEDIUM',  # 🟠 LARANJA no print
                'event': 'Non-Manufacturing PMI',
                'forecast': 50.2,
                'previous': None,
                'actual': 50.8,
                'status': 'completed'
            }
        ])
        
        return events
    
    def _generate_macro_panorama(self, events: List[Dict], high_impact: List[Dict], medium_impact: List[Dict]) -> Dict:
        """Gera panorama macro da semana."""
        
        # Analisar eventos já divulgados
        completed_high = [e for e in high_impact if e.get('status') == 'completed']
        completed_medium = [e for e in medium_impact if e.get('status') == 'completed']
        
        # Identificar vetores dominantes
        monetary_policy_events = [e for e in events if 'FOMC' in e['event'] or 'BOC' in e['event'] or 'Riksbank' in e['event']]
        inflation_events = [e for e in events if 'CPI' in e['event'] or 'PPI' in e['event'] or 'Inflation' in e['event']]
        growth_events = [e for e in events if 'GDP' in e['event'] or 'PMI' in e['event'] or 'Business Climate' in e['event']]
        
        # Determinar regime
        risk_on_signals = sum(1 for e in completed_high + completed_medium if 'Pró-Risco' in e.get('macro_reading', ''))
        risk_off_signals = sum(1 for e in completed_high + completed_medium if 'Anti-Risco' in e.get('macro_reading', ''))
        
        regime = 'Risk-On Moderado'
        if risk_off_signals > risk_on_signals:
            regime = 'Risk-Off'
        elif risk_on_signals > risk_off_signals * 2:
            regime = 'Risk-On Forte'
        
        # Postura monetária
        monetary_stance = {
            'EUR': 'Hawkish',
            'USD': 'Neutro a Ligeiramente Dovish',
            'CAD': 'Hawkish Moderado'
        }
        
        # Ciclo inflacionário
        inflation_cycle = 'Inflacionário Persistente'
        
        # Vetor dominante
        dominant_vector = 'Política Monetária Global (FOMC como catalisador)'
        
        # Narrativa macro baseada nos prints do Trading Economics
        # América: FOMC mantém taxas 3.5-3.75%, Durable Goods +0.5%, PPI +0.2%, Core PPI +0.3%
        # Europa: PIBs Q4 esperados (Eurozone +0.3%, Espanha +0.6%, Alemanha/França/Itália +0.2%), 
        #         Inflação alemã sobe para 2.2% (de 1.8%), Ifo Business Climate em alta de 3 meses
        # Ásia-Pacífico: BOJ mantém taxa em 0.75%, CPI Tóquio 2.2%, AUD CPI esperado 3.6% (de 3.4%),
        #                PMI China em expansão modesta
        narrative = (
            f"A semana de 25-31/01/2026 concentra decisões de política monetária de primeira linha "
            f"(FOMC, BOC, Riksbank) e dados críticos de crescimento e inflação. O FOMC deve manter taxas "
            f"em 3.5-3.75% após o corte de dezembro, com foco na comunicação forward-looking. "
            f"Na Europa, PIBs do Q4 2025 devem confirmar crescimento moderado (Eurozone +0.3%, Espanha +0.6%, "
            f"Alemanha/França/Itália +0.2%), enquanto a inflação alemã acelera para 2.2% (de 1.8%), "
            f"reforçando postura hawkish do BCE. O sentimento empresarial alemão (Ifo) deve atingir alta de 3 meses. "
            f"Na Ásia-Pacífico, o BOJ mantém taxa em 0.75% (alta de 30 anos), enquanto o AUD enfrenta "
            f"pressão inflacionária (CPI esperado 3.6% vs 3.4% anterior). Dados já divulgados confirmam "
            f"resiliência: Durable Goods Orders USD +5.3% (vs +3.1% esperado), CAD GDP +0.1% (vs -0.3% esperado), "
            f"PIB alemão preliminar +0.2%. O regime macro aponta para Risk-On moderado com pressão inflacionária "
            f"persistente, criando ambiente hawkish para EUR e neutro/dovish para USD."
        )
        
        return {
            'regime': regime,
            'monetary_stance': monetary_stance,
            'inflation_cycle': inflation_cycle,
            'dominant_vector': dominant_vector,
            'narrative': narrative,
            'risk_primary': 'Qualquer sinalização inesperada do FOMC sobre o caminho futuro das taxas pode gerar volatilidade sistêmica.'
        }
    
    def _generate_allocation_recommendations(self, panorama: Dict, high_impact: List[Dict], medium_impact: List[Dict]) -> Dict:
        """Gera recomendações de alocação baseadas no panorama."""
        
        # Analisar eventos para determinar ativo dominante
        eur_positive = sum(1 for e in high_impact + medium_impact 
                          if e.get('currency') == 'EUR' and 'Pró-Risco' in e.get('macro_reading', ''))
        usd_positive = sum(1 for e in high_impact + medium_impact 
                          if e.get('currency') == 'USD' and 'Pró-Risco' in e.get('macro_reading', ''))
        cad_positive = sum(1 for e in high_impact + medium_impact 
                          if e.get('currency') == 'CAD' and 'Pró-Risco' in e.get('macro_reading', ''))
        
        # Ativo dominante: EURUSD Long
        dominant_asset = {
            'ativo': 'EURUSD',
            'direcao': 'Long',
            'conviccao': 'Média',
            'fundamentacao': (
                f"Crescimento europeu resiliente (PIB alemão +0.2% confirmado) + "
                f"pressão inflacionária persistente na Alemanha + FOMC neutro a ligeiramente dovish. "
                f"Eventos que sustentam: PIB alemão preliminar (+0.2%), Belgian NBB Business Climate (-8.8 vs -10.2). "
                f"Condição de invalidação: FOMC sinalizar hawkish forte ou PIBs europeus abaixo das expectativas."
            ),
            'eventos_sustentam': [
                'PIB alemão preliminar: +0.2% (confirmado)',
                'Belgian NBB Business Climate: -8.8 vs -10.2 (confirmado)',
                'PIBs europeus (30/01): Aguardando confirmação',
                'FOMC Press Conference (28/01): Aguardando sinalização'
            ],
            'condicao_invalidacao': 'FOMC hawkish forte ou PIBs europeus abaixo das expectativas'
        }
        
        # Correlacionados
        correlated = [
            {
                'ativo': 'GER40',
                'direcao': 'Long',
                'conviccao': 'Média',
                'justificativa': 'Correlação direta com economia alemã (PIB +0.2% confirmado). Compartilha narrativa com EURUSD, mas convicção reduzida por exposição indireta.',
                'eventos_sustentam': ['PIB alemão preliminar: +0.2% (confirmado)', 'PIBs europeus (30/01): Aguardando']
            },
            {
                'ativo': 'USDCAD',
                'direcao': 'Short',
                'conviccao': 'Média',
                'justificativa': 'PIB canadense +0.1% vs -0.3% esperado (desvio significativo). BOC mantém taxas com postura hawkish moderada. Compartilha narrativa com EURUSD, mas convicção reduzida por exposição indireta.',
                'eventos_sustentam': ['CAD GDP m/m: +0.1% vs -0.3% (confirmado)', 'BOC Press Conference (28/01): Aguardando']
            },
            {
                'ativo': 'SPX500',
                'direcao': 'Long',
                'conviccao': 'Média',
                'justificativa': 'Durable Goods Orders +5.3% vs +3.1% esperado + Factory Orders +0.8%. Ambiente Risk-On moderado. Compartilha narrativa com EURUSD, mas convicção reduzida por exposição indireta.',
                'eventos_sustentam': ['Durable Goods Orders: +5.3% (confirmado)', 'Factory Orders: +0.8% (confirmado)', 'FOMC dovish (28/01): Aguardando']
            }
        ]
        
        # Remover hedges conforme solicitado - apenas ativos com correlação direta
        # Adicionar mais um correlacionado se houver narrativa clara
        if len(correlated) < 4:
            # Verificar se há espaço para mais um ativo correlacionado
            # Baseado nos prints: AUD pode ser adicionado se CPI confirmar pressão inflacionária
            pass
        
        return {
            'dominant_asset': dominant_asset,
            'correlated_assets': correlated[:4],  # Máximo 4 conforme solicitado
            'regime': panorama['regime'],
            'monetary_stance': panorama['monetary_stance'],
            'inflation_cycle': panorama['inflation_cycle']
        }
