"""
Atualiza resultados IGNORANDO data - match por moeda + título
"""

from datetime import datetime
from database import get_db
from forexfactory_week_scraper import get_ff_week_calendar
import re

def normalize_title(title):
    if not title:
        return ""
    title = title.lower().strip()
    title = re.sub(r'[^\w\s]', '', title)
    return title

def titles_match(title1, title2):
    words1 = set(normalize_title(title1).split())
    words2 = set(normalize_title(title2).split())
    
    if not words1 or not words2:
        return False
    
    common_words = {'the', 'a', 'an', 'of', 'in', 'for', 'on', 'at', 'to', 'and', 'or'}
    words1 = words1 - common_words
    words2 = words2 - common_words
    
    if not words1 or not words2:
        return False
    
    intersection = words1 & words2
    union = words1 | words2
    
    similarity = len(intersection) / len(union) if union else 0
    
    return similarity >= 0.4  # 40% de similaridade

def update_results():
    print("🔄 Atualizando resultados (IGNORA DATA)")
    print("=" * 60)
    print()
    
    # Busca TODOS os eventos no banco (semana toda)
    db = get_db()
    
    # Pega semana atual
    from datetime import datetime, timedelta
    today = datetime.now()
    monday = today - timedelta(days=today.weekday())
    friday = monday + timedelta(days=4)
    
    all_events = db.get_week_events(str(monday.date()), str(friday.date()))
    
    print(f"📊 {len(all_events)} eventos no BANCO (semana toda)")
    print()
    
    # Busca HOJE no ForexFactory
    today_str = datetime.now().strftime('%Y-%m-%d')
    scraped = get_ff_week_calendar(force_refresh=True)
    today_scraped = [e for e in scraped if e.get('date') == today_str]
    
    print(f"📊 {len(today_scraped)} eventos no FF HOJE")
    print()
    
    updated = 0
    
    print("🔍 Fazendo matching...")
    print()
    
    for db_event in all_events:
        matching = None
        
        for ff_event in today_scraped:
            # Mesma moeda
            if ff_event.get('currency') != db_event['currency']:
                continue
            
            # Título similar
            if titles_match(db_event['title'], ff_event.get('title', '')):
                matching = ff_event
                break
        
        if matching and matching.get('actual'):
            # Atualiza — actual_source = forex_factory (fonte da verdade)
            db_event['actual'] = matching['actual']
            db_event['actual_source'] = 'forex_factory'
            if matching.get('forecast'):
                db_event['forecast'] = matching['forecast']
            if matching.get('previous'):
                db_event['previous'] = matching['previous']
            
            db.save_events([db_event])
            
            updated += 1
            
            print(f"✅ {db_event['title'][:40]:40s} ({db_event['currency']})")
            print(f"   📈 {matching['actual']}")
            print()
    
    print("=" * 60)
    print(f"✅ {updated} eventos atualizados")
    print("=" * 60)
    
    if updated > 0:
        # Regenera panorama
        print()
        print("🔄 Regenerando panorama...")
        from update_panorama import update_weekly_panorama
        update_weekly_panorama(initial=False)

if __name__ == "__main__":
    update_results()