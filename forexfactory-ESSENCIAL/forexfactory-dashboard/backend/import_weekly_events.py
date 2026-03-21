"""
Importa eventos da semana manualmente
Domingo: Você cola os eventos da próxima semana
"""

from database import get_db
from datetime import datetime
import json

def import_from_json(json_file: str):
    """Importa eventos de arquivo JSON"""
    
    print(f"📂 Abrindo: {json_file}")
    
    with open(json_file, 'r', encoding='utf-8') as f:
        events = json.load(f)
    
    # Valida e normaliza eventos
    normalized = []
    for event in events:
        normalized_event = {
            'id': f"manual_{event['date']}_{event['time']}_{event['currency']}_{event['title'][:20]}".replace(' ', '_').replace('/', '-').replace(':', ''),
            'date': event['date'],
            'time': event['time'],
            'datetime': f"{event['date']}T{event['time']}:00",
            'title': event['title'],
            'currency': event['currency'],
            'impact': event['impact'],
            'forecast': event.get('forecast'),
            'previous': event.get('previous'),
            'actual': None,
            'source': 'Manual Import'
        }
        normalized.append(normalized_event)
    
    db = get_db()
    saved = db.save_events(normalized)
    
    print(f"✅ {saved} eventos importados!")
    
    # Estatísticas
    high = len([e for e in normalized if e['impact'] == 'HIGH'])
    medium = len([e for e in normalized if e['impact'] == 'MEDIUM'])
    low = len([e for e in normalized if e['impact'] == 'LOW'])
    
    print(f"📊 Distribuição: HIGH={high}, MEDIUM={medium}, LOW={low}")
    
    # Agrupa por data
    from collections import defaultdict
    by_date = defaultdict(int)
    for e in normalized:
        by_date[e['date']] += 1
    
    print(f"\n📅 Eventos por dia:")
    for date in sorted(by_date.keys()):
        print(f"   {date}: {by_date[date]} eventos")
    
    return saved

def import_from_csv(csv_file: str):
    """Importa eventos de arquivo CSV"""
    
    import csv
    
    print(f"📂 Abrindo: {csv_file}")
    
    events = []
    
    with open(csv_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        
        for row in reader:
            event = {
                'id': f"csv_{row['date']}_{row['time']}_{row['currency']}_{row['title'][:20]}".replace(' ', '_').replace('/', '-').replace(':', ''),
                'date': row['date'],
                'time': row['time'],
                'datetime': f"{row['date']}T{row['time']}:00",
                'title': row['title'],
                'currency': row['currency'],
                'impact': row['impact'],
                'forecast': row.get('forecast') or None,
                'previous': row.get('previous') or None,
                'actual': None,
                'source': 'CSV Import'
            }
            
            events.append(event)
    
    db = get_db()
    saved = db.save_events(events)
    
    print(f"✅ {saved} eventos importados de CSV!")
    
    # Estatísticas
    high = len([e for e in events if e['impact'] == 'HIGH'])
    medium = len([e for e in events if e['impact'] == 'MEDIUM'])
    low = len([e for e in events if e['impact'] == 'LOW'])
    
    print(f"📊 Distribuição: HIGH={high}, MEDIUM={medium}, LOW={low}")
    
    return saved

def import_from_manual():
    """Importação manual interativa"""
    
    print("📋 IMPORTAÇÃO MANUAL DE EVENTOS DA SEMANA")
    print("=" * 50)
    print()
    
    events = []
    
    while True:
        print("\n➕ Novo evento (ou 'q' para terminar):")
        
        # Data
        date = input("📅 Data (YYYY-MM-DD): ").strip()
        if date.lower() == 'q':
            break
        
        # Validação básica de data
        try:
            datetime.strptime(date, '%Y-%m-%d')
        except:
            print("❌ Formato de data inválido! Use YYYY-MM-DD")
            continue
        
        # Hora
        time = input("🕐 Hora (HH:MM): ").strip()
        
        # Validação básica de hora
        try:
            datetime.strptime(time, '%H:%M')
        except:
            print("❌ Formato de hora inválido! Use HH:MM")
            continue
        
        # Título
        title = input("📌 Título: ").strip()
        if not title:
            print("❌ Título não pode ser vazio!")
            continue
        
        # Moeda
        currency = input("💱 Moeda (USD/EUR/GBP...): ").strip().upper()
        if not currency:
            currency = 'USD'
        
        # Impacto
        print("📊 Impacto:")
        print("  1 - HIGH")
        print("  2 - MEDIUM")
        print("  3 - LOW")
        impact_choice = input("Escolha (1/2/3): ").strip()
        
        impact_map = {'1': 'HIGH', '2': 'MEDIUM', '3': 'LOW'}
        impact = impact_map.get(impact_choice, 'LOW')
        
        # Previsão
        forecast = input("📈 Previsão (opcional): ").strip() or None
        
        # Anterior
        previous = input("📊 Anterior (opcional): ").strip() or None
        
        # Monta evento
        event = {
            'id': f"manual_{date}_{time}_{currency}_{title[:20]}".replace(' ', '_').replace('/', '-').replace(':', ''),
            'date': date,
            'time': time,
            'datetime': f"{date}T{time}:00",
            'title': title,
            'currency': currency,
            'impact': impact,
            'forecast': forecast,
            'previous': previous,
            'actual': None,
            'source': 'Manual Import'
        }
        
        events.append(event)
        
        print(f"✅ Evento adicionado: {title}")
    
    if events:
        db = get_db()
        saved = db.save_events(events)
        
        print()
        print(f"✅ {saved} eventos salvos no banco!")
        
        # Estatísticas
        high = len([e for e in events if e['impact'] == 'HIGH'])
        medium = len([e for e in events if e['impact'] == 'MEDIUM'])
        low = len([e for e in events if e['impact'] == 'LOW'])
        
        print(f"📊 Distribuição: HIGH={high}, MEDIUM={medium}, LOW={low}")
    else:
        print("⚠️ Nenhum evento adicionado")

if __name__ == "__main__":
    import sys
    
    print("🚀 MRKT Edge - Importação de Eventos")
    print()
    
    if len(sys.argv) > 1:
        file_path = sys.argv[1]
        
        if file_path.endswith('.json'):
            import_from_json(file_path)
        elif file_path.endswith('.csv'):
            import_from_csv(file_path)
        else:
            print("❌ Formato não suportado. Use .json ou .csv")
    else:
        # Modo interativo
        print("Escolha o método:")
        print("  1 - Importar de JSON")
        print("  2 - Importar de CSV")
        print("  3 - Entrada manual")
        
        choice = input("\nEscolha (1/2/3): ").strip()
        
        if choice == '1':
            file_path = input("Caminho do arquivo JSON: ").strip()
            import_from_json(file_path)
        elif choice == '2':
            file_path = input("Caminho do arquivo CSV: ").strip()
            import_from_csv(file_path)
        elif choice == '3':
            import_from_manual()
        else:
            print("❌ Opção inválida")