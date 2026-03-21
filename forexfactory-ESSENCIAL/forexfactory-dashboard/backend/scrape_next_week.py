"""
Scrape eventos da PRÓXIMA semana (Segunda a Sexta)
Roda no DOMINGO para preparar a semana
"""

from datetime import datetime, timedelta
from forexfactory_slow_scraper import get_ff_slow_calendar
from database import get_db
import json

def get_next_week_range():
    """Calcula Segunda a Sexta da PRÓXIMA semana"""
    today = datetime.now()
    
    # Dias até próxima segunda
    days_until_monday = (7 - today.weekday()) % 7
    if days_until_monday == 0:
        days_until_monday = 7
    
    next_monday = today + timedelta(days=days_until_monday)
    next_friday = next_monday + timedelta(days=4)
    
    return next_monday.date(), next_friday.date()

def scrape_next_week():
    """Scrape eventos da próxima semana"""
    
    monday, friday = get_next_week_range()
    
    print(f"🗓️  Próxima semana: {monday.strftime('%d/%m')} a {friday.strftime('%d/%m/%Y')}")
    print("⚠️  Este scrape pode demorar 2-3 minutos...")
    print("⚠️  ForexFactory pode retornar apenas alguns dias devido a bloqueios")
    print()
    
    # Usa o scraper (tenta pegar múltiplos dias)
    events = get_ff_slow_calendar(force_refresh=True)
    
    if not events:
        print("❌ Nenhum evento coletado!")
        return None
    
    # Salva no banco
    db = get_db()
    saved = db.save_events(events)
    
    print(f"💾 {saved} eventos salvos no banco")
    
    # Estatísticas
    high_count = len([e for e in events if e['impact'] == 'HIGH'])
    medium_count = len([e for e in events if e['impact'] == 'MEDIUM'])
    
    # Conta eventos por dia
    from collections import defaultdict
    by_date = defaultdict(int)
    for e in events:
        by_date[e['date']] += 1
    
    print()
    print(f"📊 Total: {len(events)} eventos")
    print(f"   🔴 HIGH: {high_count}")
    print(f"   🟠 MEDIUM: {medium_count}")
    print()
    print(f"📅 Eventos por dia:")
    for date in sorted(by_date.keys()):
        print(f"   {date}: {by_date[date]} eventos")
    
    return {
        "week_start": str(monday),
        "week_end": str(friday),
        "scraped_at": datetime.now().isoformat(),
        "total_events": len(events),
        "high_count": high_count,
        "medium_count": medium_count,
        "events": events
    }

if __name__ == "__main__":
    print("🚀 Scraper de Próxima Semana")
    print("=" * 50)
    print()
    
    data = scrape_next_week()
    
    if data:
        print()
        print("✅ Scrape concluído!")
        print("💡 Próximo passo: python update_panorama.py")