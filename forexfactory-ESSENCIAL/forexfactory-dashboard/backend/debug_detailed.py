"""
DEBUG DETALHADO - Mostra CADA tentativa de matching
"""

from datetime import datetime
from database import get_db
from forexfactory_week_scraper import get_ff_week_calendar
import re

def normalize_time(time_str):
    """Converte horário para formato 24h padronizado"""
    if not time_str:
        return None
    
    time_str = time_str.strip().lower()
    
    # Se já está em formato 24h (XX:XX)
    if re.match(r'^\d{1,2}:\d{2}$', time_str):
        h, m = time_str.split(':')
        return f"{int(h):02d}:{m}"
    
    # Se está em formato 12h (X:XXam/pm)
    match = re.match(r'(\d{1,2}):(\d{2})(am|pm)', time_str)
    if match:
        hour = int(match.group(1))
        minute = match.group(2)
        period = match.group(3)
        
        if period == 'pm' and hour != 12:
            hour += 12
        elif period == 'am' and hour == 12:
            hour = 0
        
        return f"{hour:02d}:{minute}"
    
    return None

def normalize_title(title):
    """Normaliza título para comparação"""
    if not title:
        return ""
    title = title.lower().strip()
    title = re.sub(r'[^\w\s]', '', title)
    return title

def titles_match(title1, title2, threshold=0.5):
    """Verifica se dois títulos são similares"""
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
    
    return similarity >= threshold

def debug_detailed():
    """Debug detalhado"""
    
    print("🔍 DEBUG DETALHADO - Matching Step by Step")
    print("=" * 80)
    print()
    
    today = datetime.now().strftime('%Y-%m-%d')
    
    db = get_db()
    events_in_db = db.get_events_by_date(today)
    
    scraped_events = get_ff_week_calendar(force_refresh=True)
    today_scraped = [e for e in scraped_events if e.get('date') == today]
    
    # Normaliza horários
    for evt in today_scraped:
        evt['normalized_time'] = normalize_time(evt.get('time'))
    
    for evt in events_in_db:
        evt['normalized_time'] = normalize_time(evt.get('time'))
    
    print(f"📊 {len(events_in_db)} eventos no BANCO")
    print(f"📊 {len(today_scraped)} eventos no FF")
    print()
    
    # Pega PRIMEIRO evento do banco
    if events_in_db:
        db_evt = events_in_db[0]
        
        print("=" * 80)
        print(f"🎯 TESTANDO EVENTO DO BANCO:")
        print("=" * 80)
        print(f"Título: {db_evt['title']}")
        print(f"Moeda: {db_evt['currency']}")
        print(f"Horário original: {db_evt.get('time')}")
        print(f"Horário normalizado: {db_evt.get('normalized_time')}")
        print()
        
        print("🔍 PROCURANDO MATCHES NO FF:")
        print("-" * 80)
        
        candidates = []
        
        for ff_evt in today_scraped:
            # Filtra por moeda
            if ff_evt.get('currency') != db_evt['currency']:
                continue
            
            candidates.append(ff_evt)
        
        print(f"✅ {len(candidates)} candidatos com moeda {db_evt['currency']}")
        print()
        
        if candidates:
            print("📋 CANDIDATOS:")
            print("-" * 80)
            
            for i, cand in enumerate(candidates[:10], 1):
                print(f"\n{i}. {cand.get('title')}")
                print(f"   Horário FF: {cand.get('time')} → Normalizado: {cand.get('normalized_time')}")
                print(f"   Actual: {cand.get('actual', 'N/A')}")
                
                # Testa similaridade
                similarity = 0
                words_db = set(normalize_title(db_evt['title']).split())
                words_ff = set(normalize_title(cand.get('title', '')).split())
                
                if words_db and words_ff:
                    intersection = words_db & words_ff
                    union = words_db | words_ff
                    similarity = len(intersection) / len(union) if union else 0
                
                print(f"   📊 Similaridade: {similarity:.2%}")
                print(f"   Palavras em comum: {intersection if 'intersection' in locals() else 'N/A'}")
                
                if titles_match(db_evt['title'], cand.get('title', ''), threshold=0.5):
                    print(f"   ✅ MATCH! (threshold >= 50%)")
                else:
                    print(f"   ❌ Não bateu (threshold < 50%)")
        else:
            print(f"❌ Nenhum candidato com moeda {db_evt['currency']}")
    
    print()
    print("=" * 80)

if __name__ == "__main__":
    debug_detailed()