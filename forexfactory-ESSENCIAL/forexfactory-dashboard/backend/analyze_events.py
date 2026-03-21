"""
Gera análise IA para cada evento
- Resumo do impacto
- Pares de forex afetados
- Índices US afetados
- Metais afetados
"""

from database import get_db
from datetime import datetime, timedelta
import anthropic
import os
import json
from dotenv import load_dotenv

load_dotenv()

def analyze_single_event(event: dict) -> dict:
    """Analisa um único evento com Claude"""
    
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("❌ ANTHROPIC_API_KEY não configurada!")
        return None
    
    client = anthropic.Anthropic(api_key=api_key)
    
    # Monta prompt
    prompt = f"""Você é um analista forex e de mercados financeiros especializado.

Analise este evento econômico e forneça uma análise técnica objetiva:

**EVENTO:**
- Data: {event['date']}
- Hora: {event['time']}
- Título: {event['title']}
- Moeda: {event['currency']}
- Impacto: {event['impact']}
- Previsão: {event.get('forecast', 'N/A')}
- Anterior: {event.get('previous', 'N/A')}
- Real: {event.get('actual', 'N/A')}

Forneça APENAS JSON válido com esta estrutura:

{{
  "summary": "Breve resumo do que este evento mede (2-3 frases)",
  "expected_impact": "O que esperar se vier acima/abaixo da previsão (2-3 frases)",
  "forex_pairs": ["PAR1 direção", "PAR2 direção", "PAR3 direção"],
  "us_indices": ["Nasdaq direção", "S&P 500 direção", "Dow Jones direção"] ou [],
  "metals": ["XAU/USD direção", "XAG/USD direção"] ou []
}}

**REGRAS:**
- forex_pairs: Liste 3-5 pares mais afetados (ex: "EUR/USD ↓", "GBP/USD ↑")
- us_indices: Inclua APENAS se o evento tiver impacto significativo nos índices
- metals: Inclua APENAS se o evento afetar metais preciosos
- direção: Use ↑ (alta), ↓ (baixa), ou ↔ (neutro)
- Seja objetivo e técnico

Retorne APENAS o JSON, sem texto adicional."""

    try:
        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1000,
            messages=[{"role": "user", "content": prompt}]
        )
        
        response_text = message.content[0].text.strip()
        
        # Remove markdown se houver
        response_text = response_text.replace('```json', '').replace('```', '').strip()
        
        # Parse JSON
        analysis = json.loads(response_text)
        
        # Adiciona metadados
        analysis['event_id'] = event['id']
        analysis['generated_at'] = datetime.now().isoformat()
        
        return analysis
    
    except Exception as e:
        print(f"❌ Erro ao analisar evento {event['id']}: {e}")
        import traceback
        traceback.print_exc()
        return None

def analyze_week_events():
    """Analisa todos os eventos da semana"""
    
    db = get_db()
    
    # Calcula semana
    today = datetime.now()
    monday = today - timedelta(days=today.weekday())
    friday = monday + timedelta(days=4)
    
    # Busca eventos HIGH e MEDIUM
    all_events = db.get_week_events(str(monday.date()), str(friday.date()))
    events = [e for e in all_events if e['impact'] in ['HIGH', 'MEDIUM']]
    
    print(f"📊 {len(events)} eventos HIGH/MEDIUM para analisar")
    print()
    
    analyzed = 0
    failed = 0
    
    for i, event in enumerate(events, 1):
        print(f"[{i}/{len(events)}] Analisando: {event['title']} ({event['currency']})...")
        
        analysis = analyze_single_event(event)
        
        if analysis:
            # Salva no banco
            db.save_event_analysis(analysis)
            analyzed += 1
            print(f"   ✅ Análise salva!")
        else:
            failed += 1
            print(f"   ❌ Falhou")
        
        print()
    
    print("=" * 50)
    print(f"✅ {analyzed} eventos analisados")
    print(f"❌ {failed} falharam")
    print("=" * 50)

if __name__ == "__main__":
    print("🤖 MRKT Edge - Análise IA de Eventos")
    print("=" * 50)
    print()
    
    analyze_week_events()