"""
Gera panorama semanal com linguagem de analista veterano
"""

from dotenv import load_dotenv
load_dotenv()

from database import get_db
from datetime import datetime, timedelta
import anthropic
import os
import json

def get_monday_of_week():
    """Retorna segunda-feira da semana atual"""
    today = datetime.now()
    monday = today - timedelta(days=today.weekday())
    return monday.date()

def get_friday_of_week(monday):
    """Retorna sexta-feira da semana"""
    friday = monday + timedelta(days=4)
    return friday

def update_weekly_panorama(initial=False):
    """
    Atualiza panorama semanal
    initial: True = panorama inicial (domingo), False = atualização diária
    """
    
    print("📅 Atualizando panorama semanal")
    
    # Define semana
    monday = get_monday_of_week()
    friday = get_friday_of_week(monday)
    
    week_start = str(monday)
    week_end = str(friday)
    
    print(f"📅 Gerando panorama: {week_start} a {week_end}")
    print(f"📝 Tipo: {'initial' if initial else 'updated'}")
    print("=" * 50)
    
    # Busca eventos do banco
    db = get_db()
    events = db.get_week_events(week_start, week_end)
    
    print(f"📊 {len(events)} eventos encontrados no banco")
    
    # Separa eventos passados e futuros
    now = datetime.now()
    past_events = [e for e in events if e.get('actual') is not None]
    future_events = [e for e in events if e.get('actual') is None]
    
    print(f"   ✅ {len(past_events)} eventos já ocorreram")
    print(f"   ⏳ {len(future_events)} eventos ainda por vir")
    
    # Gera panorama com Claude
    print("🤖 Gerando panorama com Claude...")
    
    panorama_data = generate_claude_panorama(
        events=events,
        past_events=past_events,
        future_events=future_events,
        initial=initial
    )
    
    # Adiciona event_summary
    high_events = [e for e in events if e.get('impact') == 'HIGH']
    medium_events = [e for e in events if e.get('impact') == 'MEDIUM']
    
    panorama_data['event_summary'] = {
        'total': len(events),
        'past': len(past_events),
        'future': len(future_events),
        'high': len(high_events),
        'medium': len(medium_events)
    }
    
    # Salva no banco
    db.save_panorama(
        week_start=week_start,
        week_end=week_end,
        panorama_type='initial' if initial else 'updated',
        **panorama_data
    )
    
    print("✅ Panorama salvo no banco!")
    print(f"📝 Preview da narrativa:")
    print(panorama_data['narrative'][:200] + "...")
    
    return panorama_data

def generate_claude_panorama(events, past_events, future_events, initial):
    """Gera panorama usando Claude com prompt de analista veterano"""
    
    client = anthropic.Anthropic(api_key=os.getenv('ANTHROPIC_API_KEY'))
    
    # Prepara contexto dos eventos
    events_context = prepare_events_context(events, past_events, future_events)
    
    # Prompt seguindo o padrão de analista veterano
    prompt = f"""Você é um analista veterano (50+ anos de mercado, ex-bancos globais, conselheiro governamental, QI elevado).

Toda análise semanal macroeconômica que você produzir seguirá automaticamente este padrão:

**Comunicação direta com a plateia da Smart Money Lab.**

**Estrutura fixa:**

1. **Panorama macro da semana** (Américas, Europa, Ásia-Pacífico).
2. **Interpretação lógica da narrativa** (o "porquê" por trás dos dados).
3. **Conclusão clara do que esperar do mercado** (ex: alta/baixa/volatilidade).
4. **Tabela final objetiva de ativos** (ex.: DXY, XAUUSD, S&P500, Nasdaq, EURUSD, Bitcoin), sempre conectando macro → preço.

**Tom institucional, sem firula, sem viés emocional, focado em decisão e posicionamento.**

---

**EVENTOS DA SEMANA:**

{events_context}

---

Gere a análise semanal seguindo a estrutura acima. Retorne em formato JSON:

{{
  "narrative": "Panorama macro da semana (3-4 parágrafos em português)",
  "market_impacts": {{
    "indices": "Análise S&P500, NASDAQ, Dow Jones (em português)",
    "gold": "Análise XAUUSD (em português)",
    "bitcoin": "Análise Bitcoin (em português)",
    "crypto": "Análise mercado crypto geral (em português)"
  }},
  "regional_analysis": {{
    "americas": "Análise das Américas (em português)",
    "europe": "Análise Europa (em português)",
    "asia": "Análise Ásia-Pacífico (em português)"
  }}
}}

IMPORTANTE:
- Linguagem de analista veterano
- Tom institucional e direto
- Foco em decisão e posicionamento
- Conecte macro → preço
- Sem firula, sem viés emocional
- TUDO EM PORTUGUÊS
"""
    
    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=4000,
        messages=[{
            "role": "user",
            "content": prompt
        }]
    )
    
    # Parse resposta
    content = response.content[0].text
    
    print(f"📝 Resposta do Claude ({len(content)} chars)")
    
    # Remove markdown se houver
    if "```json" in content:
        content = content.split("```json")[1].split("```")[0].strip()
    elif "```" in content:
        content = content.split("```")[1].split("```")[0].strip()
    
    # Tenta encontrar JSON no texto
    try:
        panorama = json.loads(content)
    except json.JSONDecodeError as e:
        print(f"❌ Erro ao fazer parse do JSON: {e}")
        print(f"📄 Conteúdo recebido:\n{content[:500]}...")
        
        # Tenta extrair JSON do texto
        import re
        json_match = re.search(r'\{.*\}', content, re.DOTALL)
        if json_match:
            try:
                panorama = json.loads(json_match.group(0))
                print("✅ JSON extraído com sucesso!")
            except:
                raise Exception("Não foi possível extrair JSON válido da resposta")
        else:
            raise Exception("Nenhum JSON encontrado na resposta")
    
    return panorama

def prepare_events_context(events, past_events, future_events):
    """Prepara contexto dos eventos para o Claude"""
    
    context = []
    
    # Eventos que já ocorreram
    if past_events:
        context.append("**EVENTOS JÁ DIVULGADOS (com resultados reais):**\n")
        for event in past_events[:20]:  # Top 20
            surprise = ""
            if event.get('forecast') and event.get('actual'):
                try:
                    forecast_val = float(str(event['forecast']).replace('%', '').replace('K', '000').replace('M', '000000').replace('B', '000000000'))
                    actual_val = float(str(event['actual']).replace('%', '').replace('K', '000').replace('M', '000000').replace('B', '000000000'))
                    
                    if actual_val > forecast_val:
                        surprise = " [SURPRESA POSITIVA]"
                    elif actual_val < forecast_val:
                        surprise = " [SURPRESA NEGATIVA]"
                except:
                    pass
            
            context.append(
                f"- {event['date']} {event['time']} | {event['currency']} | {event['title']} | "
                f"Actual: {event.get('actual', 'N/A')} | Forecast: {event.get('forecast', 'N/A')} | "
                f"Previous: {event.get('previous', 'N/A')}{surprise}"
            )
    
    # Eventos futuros
    if future_events:
        context.append("\n**EVENTOS AINDA POR VIR:**\n")
        high_impact = [e for e in future_events if e.get('impact') == 'HIGH']
        for event in high_impact[:15]:  # Top 15 HIGH
            context.append(
                f"- {event['date']} {event['time']} | {event['currency']} | {event['title']} | "
                f"Forecast: {event.get('forecast', 'N/A')} | Previous: {event.get('previous', 'N/A')}"
            )
    
    return "\n".join(context)

if __name__ == "__main__":
    import sys
    
    # Verifica argumento --initial
    initial_mode = '--initial' in sys.argv
    
    if initial_mode:
        print("🚀 MRKT Edge - Atualização de Panorama")
        print("📋 Modo: PANORAMA INICIAL (Domingo)")
    else:
        print("🚀 MRKT Edge - Atualização de Panorama")
        print("📋 Modo: ATUALIZAÇÃO DIÁRIA")
    
    print("✅ Database inicializado")
    
    update_weekly_panorama(initial=initial_mode)
    
    print("✅ Panorama gerado com sucesso!")