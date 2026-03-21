"""
DEBUG VERSION - Mostra eventos para comparar
"""

from datetime import datetime
from database import get_db
from forexfactory_week_scraper import get_ff_week_calendar

def debug_matching():
    """Debug do matching de eventos"""
    
    print("🔍 DEBUG - Comparação de Eventos")
    print("=" * 80)
    print()
    
    # Data de hoje
    today = datetime.now().strftime('%Y-%m-%d')
    print(f"📅 Data: {today}")
    print()
    
    # Busca eventos no banco
    db = get_db()
    events_in_db = db.get_events_by_date(today)
    
    print(f"📊 {len(events_in_db)} eventos no BANCO")
    print()
    
    # Busca eventos no ForexFactory
    scraped_events = get_ff_week_calendar(force_refresh=True)
    today_scraped = [e for e in scraped_events if e.get('date') == today]
    
    print(f"📊 {len(today_scraped)} eventos no FOREXFACTORY")
    print()
    
    # Mostra eventos do FF
    print("=" * 80)
    print("🌐 EVENTOS DO FOREXFACTORY (primeiros 15):")
    print("=" * 80)
    for i, evt in enumerate(today_scraped[:15], 1):
        actual = evt.get('actual', 'N/A')
        print(f"{i:2d}. {evt.get('time')} | {evt.get('currency'):3s} | {evt['title'][:50]:50s} | Actual: {actual}")
    print()
    
    # Mostra eventos do banco
    print("=" * 80)
    print("💾 EVENTOS DO BANCO (primeiros 15):")
    print("=" * 80)
    for i, evt in enumerate(events_in_db[:15], 1):
        actual = evt.get('actual', 'N/A')
        print(f"{i:2d}. {evt.get('time')} | {evt.get('currency'):3s} | {evt['title'][:50]:50s} | Actual: {actual}")
    print()
    
    # Tenta fazer match manual
    print("=" * 80)
    print("🔗 TENTANDO MATCHING:")
    print("=" * 80)
    
    matches = 0
    for db_evt in events_in_db[:10]:
        print(f"\n🔍 Buscando match para:")
        print(f"   {db_evt['time']} | {db_evt['currency']} | {db_evt['title']}")
        
        found = False
        for ff_evt in today_scraped:
            # Mesma moeda
            if ff_evt['currency'] != db_evt['currency']:
                continue
            
            # Horário similar
            if ff_evt.get('time') == db_evt.get('time'):
                # Título similar
                db_title = db_evt['title'].lower()
                ff_title = ff_evt['title'].lower()
                
                if db_title in ff_title or ff_title in db_title:
                    print(f"   ✅ MATCH! {ff_evt['title']}")
                    if ff_evt.get('actual'):
                        print(f"      📈 Resultado: {ff_evt['actual']}")
                    else:
                        print(f"      ⏳ Sem resultado ainda")
                    found = True
                    matches += 1
                    break
        
        if not found:
            print(f"   ❌ NÃO ENCONTRADO")
    
    print()
    print("=" * 80)
    print(f"📊 RESUMO: {matches} matches encontrados (primeiros 10 eventos)")
    print("=" * 80)

if __name__ == "__main__":
    debug_matching()