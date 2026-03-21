"""
Coleta diária de eventos
Roda todo dia para pegar eventos de hoje com resultados reais
"""

from datetime import datetime
from forexfactory_week_scraper import get_ff_week_calendar
from database import get_db

def daily_scrape():
    """Scrape eventos de hoje e salva no banco"""
    
    today = datetime.now().strftime('%Y-%m-%d')
    
    print(f"📅 Coleta diária: {today}")
    print("=" * 50)
    print()
    
    # Busca eventos
    print("🌐 Buscando eventos de hoje...")
    events = get_ff_week_calendar(force_refresh=True)
    
    if not events:
        print("❌ Nenhum evento coletado!")
        return False
    
    # Filtra apenas eventos de hoje
    today_events = [e for e in events if e['date'] == today]
    
    print(f"✅ {len(today_events)} eventos de hoje")
    
    # Salva no banco
    db = get_db()
    saved = db.save_events(today_events)
    
    print(f"💾 {saved} eventos salvos no banco")
    
    # Estatísticas
    high = len([e for e in today_events if e['impact'] == 'HIGH'])
    medium = len([e for e in today_events if e['impact'] == 'MEDIUM'])
    low = len([e for e in today_events if e['impact'] == 'LOW'])
    
    print(f"📊 Distribuição:")
    print(f"   🔴 HIGH: {high}")
    print(f"   🟠 MEDIUM: {medium}")
    print(f"   🟡 LOW: {low}")
    
    # Mostra eventos com resultado
    with_actual = [e for e in today_events if e.get('actual')]
    print(f"✅ {len(with_actual)} eventos com resultado divulgado")
    
    if with_actual:
        print()
        print("📋 Eventos com resultado:")
        for event in with_actual[:5]:
            print(f"   • {event['title']} ({event['currency']})")
            print(f"     Resultado: {event['actual']} | Previsão: {event.get('forecast', 'N/A')}")
    
    return True

if __name__ == "__main__":
    print("🚀 MRKT Edge - Coleta Diária")
    print()
    
    success = daily_scrape()
    
    if success:
        print()
        print("✅ Coleta concluída!")
        print("💡 Próximo passo: python update_panorama.py")
    else:
        print()
        print("❌ Falha na coleta")