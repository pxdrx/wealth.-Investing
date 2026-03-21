"""MRKT Edge - Taxas Janeiro 2026"""
from datetime import datetime, timedelta

CENTRAL_BANKS = {
    'FED': {'name': 'Federal Reserve', 'country': 'Estados Unidos', 'country_code': 'US', 'flag': '🇺🇸', 'currency': 'USD', 'current_rate': 3.75, 'last_change': -0.25, 'last_change_date': '2025-12-18', 'direction': 'down', 'stance': 'neutral', 'next_meeting': '2026-01-29', 'impact': 'DXY sensível', 'description': 'Fed em 3.75%'},
    'ECB': {'name': 'European Central Bank', 'country': 'Zona do Euro', 'country_code': 'EU', 'flag': '🇪🇺', 'currency': 'EUR', 'current_rate': 2.00, 'last_change': 0.00, 'last_change_date': '2025-12-19', 'direction': 'neutral', 'stance': 'neutral', 'next_meeting': '2026-01-30', 'impact': 'EURUSD resiliente', 'description': 'ECB em 2%'},
    'BOE': {'name': 'Bank of England', 'country': 'Reino Unido', 'country_code': 'GB', 'flag': '🇬🇧', 'currency': 'GBP', 'current_rate': 3.75, 'last_change': -0.25, 'last_change_date': '2025-12-19', 'direction': 'down', 'stance': 'neutral', 'next_meeting': '2026-02-06', 'impact': 'GBPUSD pressionado', 'description': 'BoE em 3.75%'},
    'BOJ': {'name': 'Bank of Japan', 'country': 'Japão', 'country_code': 'JP', 'flag': '🇯🇵', 'currency': 'JPY', 'current_rate': 0.75, 'last_change': 0.25, 'last_change_date': '2025-12-19', 'direction': 'up', 'stance': 'hawkish', 'next_meeting': '2026-01-23', 'impact': 'Iene forte', 'description': 'BOJ recorde 30 anos'},
    'BOC': {'name': 'Bank of Canada', 'country': 'Canadá', 'country_code': 'CA', 'flag': '🇨🇦', 'currency': 'CAD', 'current_rate': 2.25, 'last_change': 0.00, 'last_change_date': '2025-12-10', 'direction': 'neutral', 'stance': 'neutral', 'next_meeting': '2026-01-29', 'impact': 'USDCAD estável', 'description': 'BOC em pausa'},
    'RBA': {'name': 'Reserve Bank of Australia', 'country': 'Austrália', 'country_code': 'AU', 'flag': '🇦🇺', 'currency': 'AUD', 'current_rate': 3.60, 'last_change': 0.00, 'last_change_date': '2025-12-10', 'direction': 'neutral', 'stance': 'hawkish', 'next_meeting': '2026-02-18', 'impact': 'AUDUSD resiliente', 'description': 'RBA hawkish'},
    'BCB': {'name': 'Banco Central do Brasil', 'country': 'Brasil', 'country_code': 'BR', 'flag': '🇧🇷', 'currency': 'BRL', 'current_rate': 15.00, 'last_change': 0.00, 'last_change_date': '2025-12-11', 'direction': 'neutral', 'stance': 'hawkish', 'next_meeting': '2026-01-29', 'impact': 'MAIOR TAXA GLOBAL', 'description': 'BCB em 15%'},
    'BANXICO': {'name': 'Banco de México', 'country': 'México', 'country_code': 'MX', 'flag': '🇲🇽', 'currency': 'MXN', 'current_rate': 10.00, 'last_change': -0.25, 'last_change_date': '2025-12-19', 'direction': 'down', 'stance': 'neutral', 'next_meeting': '2026-02-13', 'impact': 'Nearshoring', 'description': 'Banxico em 10%'},
    'SNB': {'name': 'Swiss National Bank', 'country': 'Suíça', 'country_code': 'CH', 'flag': '🇨🇭', 'currency': 'CHF', 'current_rate': 0.50, 'last_change': -0.25, 'last_change_date': '2025-12-12', 'direction': 'down', 'stance': 'dovish', 'next_meeting': '2026-03-20', 'impact': 'Franco forte', 'description': 'SNB em 0.5%'},
    'PBOC': {'name': "People's Bank of China", 'country': 'China', 'country_code': 'CN', 'flag': '🇨🇳', 'currency': 'CNY', 'current_rate': 3.10, 'last_change': -0.20, 'last_change_date': '2025-10-21', 'direction': 'down', 'stance': 'dovish', 'next_meeting': '2026-01-20', 'impact': 'Yuan fraco', 'description': 'PBOC dovish'}
}

def get_all_rates():
    rates = []
    now = datetime.now().isoformat()
    for code, data in CENTRAL_BANKS.items():
        rates.append({'code': code, **data, 'last_update': now})
    return sorted(rates, key=lambda x: x['current_rate'], reverse=True)

def get_rate_by_code(code):
    if code.upper() in CENTRAL_BANKS:
        return {'code': code.upper(), **CENTRAL_BANKS[code.upper()], 'last_update': datetime.now().isoformat()}
    return None

def get_divergence_analysis():
    rates = get_all_rates()
    highest = max(rates, key=lambda x: x['current_rate'])
    lowest = min(rates, key=lambda x: x['current_rate'])
    return {
        'highest_rate': highest,
        'lowest_rate': lowest,
        'rate_spread': highest['current_rate'] - lowest['current_rate'],
        'summary': 'BCB 15% vs BOJ 0.75%'
    }

def get_upcoming_meetings(days_ahead=60):
    meetings = []
    today = datetime.now()
    for code, data in CENTRAL_BANKS.items():
        meeting = datetime.strptime(data['next_meeting'], '%Y-%m-%d')
        if meeting >= today:
            meetings.append({
                'code': code,
                'name': data['name'],
                'meeting_date': data['next_meeting'],
                'days_until': (meeting - today).days
            })
    return sorted(meetings, key=lambda x: x['days_until'])