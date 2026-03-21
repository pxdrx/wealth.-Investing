"""
Sistema Híbrido de Análise de Impacto do ForexFactory
Combina regras pré-definidas + IA (Claude API) para análise inteligente
"""

import json
import os
from datetime import datetime
from typing import Dict, List, Optional
import anthropic

class ImpactAnalyzer:
    """Analisador híbrido de impacto de eventos econômicos"""
    
    def __init__(self, api_key: Optional[str] = None, cache_file: str = "analysis_cache.json"):
        """
        Inicializa o analisador
        
        Args:
            api_key: Chave da API do Claude (opcional, pega de variável de ambiente)
            cache_file: Arquivo para cache de análises
        """
        self.api_key = api_key or os.getenv("ANTHROPIC_API_KEY")
        self.cache_file = cache_file
        self.cache = self.load_cache()
        self.rules = self.load_rules()
        
        # Inicializa cliente Claude se tiver API key
        self.client = anthropic.Anthropic(api_key=self.api_key) if self.api_key else None
        
        # Estatísticas
        self.stats = {
            "rules_used": 0,
            "ai_used": 0,
            "cache_used": 0
        }
    
    def load_cache(self) -> Dict:
        """Carrega cache de análises anteriores"""
        if os.path.exists(self.cache_file):
            try:
                with open(self.cache_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except:
                return {}
        return {}
    
    def save_cache(self):
        """Salva cache de análises"""
        with open(self.cache_file, 'w', encoding='utf-8') as f:
            json.dump(self.cache, f, indent=2, ensure_ascii=False)
    
    def load_rules(self) -> Dict:
        """
        Carrega regras pré-definidas para eventos comuns
        Formato: {evento: {condição: {ativo: impacto}}}
        """
        return {
            # ===== EMPREGO (NFP, ADP, etc) =====
            "Non-Farm Employment Change": {
                "better_than_forecast": {
                    "USD": {"direction": "bullish", "strength": "strong", "emoji": "⬆️"},
                    "US Stocks": {"direction": "bullish", "strength": "medium", "emoji": "⬆️"},
                    "Gold": {"direction": "bearish", "strength": "medium", "emoji": "⬇️"},
                    "US Bonds": {"direction": "bearish", "strength": "weak", "emoji": "⬇️"},
                    "EUR": {"direction": "bearish", "strength": "weak", "emoji": "⬇️"}
                },
                "worse_than_forecast": {
                    "USD": {"direction": "bearish", "strength": "strong", "emoji": "⬇️"},
                    "US Stocks": {"direction": "bearish", "strength": "medium", "emoji": "⬇️"},
                    "Gold": {"direction": "bullish", "strength": "medium", "emoji": "⬆️"},
                    "US Bonds": {"direction": "bullish", "strength": "weak", "emoji": "⬆️"},
                    "EUR": {"direction": "bullish", "strength": "weak", "emoji": "⬆️"}
                }
            },
            
            "ADP Non-Farm Employment Change": {
                "better_than_forecast": {
                    "USD": {"direction": "bullish", "strength": "medium", "emoji": "⬆️"},
                    "US Stocks": {"direction": "bullish", "strength": "medium", "emoji": "⬆️"},
                    "Gold": {"direction": "bearish", "strength": "weak", "emoji": "⬇️"}
                },
                "worse_than_forecast": {
                    "USD": {"direction": "bearish", "strength": "medium", "emoji": "⬇️"},
                    "US Stocks": {"direction": "bearish", "strength": "medium", "emoji": "⬇️"},
                    "Gold": {"direction": "bullish", "strength": "weak", "emoji": "⬆️"}
                }
            },
            
            # ===== INFLAÇÃO (CPI, PPI, PCE) =====
            "Consumer Price Index": {
                "better_than_forecast": {  # Inflação menor que esperado
                    "USD": {"direction": "bearish", "strength": "strong", "emoji": "⬇️"},
                    "US Stocks": {"direction": "bullish", "strength": "strong", "emoji": "⬆️"},
                    "Gold": {"direction": "bearish", "strength": "medium", "emoji": "⬇️"},
                    "US Bonds": {"direction": "bullish", "strength": "medium", "emoji": "⬆️"}
                },
                "worse_than_forecast": {  # Inflação maior que esperado
                    "USD": {"direction": "bullish", "strength": "strong", "emoji": "⬆️"},
                    "US Stocks": {"direction": "bearish", "strength": "strong", "emoji": "⬇️"},
                    "Gold": {"direction": "bullish", "strength": "medium", "emoji": "⬆️"},
                    "US Bonds": {"direction": "bearish", "strength": "medium", "emoji": "⬇️"}
                }
            },
            
            "Core CPI": {
                "better_than_forecast": {
                    "USD": {"direction": "bearish", "strength": "strong", "emoji": "⬇️"},
                    "US Stocks": {"direction": "bullish", "strength": "strong", "emoji": "⬆️"},
                    "Gold": {"direction": "bearish", "strength": "medium", "emoji": "⬇️"}
                },
                "worse_than_forecast": {
                    "USD": {"direction": "bullish", "strength": "strong", "emoji": "⬆️"},
                    "US Stocks": {"direction": "bearish", "strength": "strong", "emoji": "⬇️"},
                    "Gold": {"direction": "bullish", "strength": "medium", "emoji": "⬆️"}
                }
            },
            
            "Producer Price Index": {
                "better_than_forecast": {
                    "USD": {"direction": "bearish", "strength": "medium", "emoji": "⬇️"},
                    "US Stocks": {"direction": "bullish", "strength": "medium", "emoji": "⬆️"}
                },
                "worse_than_forecast": {
                    "USD": {"direction": "bullish", "strength": "medium", "emoji": "⬆️"},
                    "US Stocks": {"direction": "bearish", "strength": "medium", "emoji": "⬇️"}
                }
            },
            
            # ===== PIB =====
            "Gross Domestic Product": {
                "better_than_forecast": {
                    "USD": {"direction": "bullish", "strength": "strong", "emoji": "⬆️"},
                    "US Stocks": {"direction": "bullish", "strength": "strong", "emoji": "⬆️"},
                    "Gold": {"direction": "bearish", "strength": "weak", "emoji": "⬇️"}
                },
                "worse_than_forecast": {
                    "USD": {"direction": "bearish", "strength": "strong", "emoji": "⬇️"},
                    "US Stocks": {"direction": "bearish", "strength": "strong", "emoji": "⬇️"},
                    "Gold": {"direction": "bullish", "strength": "weak", "emoji": "⬆️"}
                }
            },
            
            # ===== TAXA DE JUROS (FED) =====
            "Federal Funds Rate": {
                "rate_hike": {  # Aumento de juros
                    "USD": {"direction": "bullish", "strength": "very_strong", "emoji": "⬆️"},
                    "US Stocks": {"direction": "bearish", "strength": "strong", "emoji": "⬇️"},
                    "Gold": {"direction": "bearish", "strength": "strong", "emoji": "⬇️"},
                    "US Bonds": {"direction": "bearish", "strength": "medium", "emoji": "⬇️"}
                },
                "rate_cut": {  # Corte de juros
                    "USD": {"direction": "bearish", "strength": "very_strong", "emoji": "⬇️"},
                    "US Stocks": {"direction": "bullish", "strength": "strong", "emoji": "⬆️"},
                    "Gold": {"direction": "bullish", "strength": "strong", "emoji": "⬆️"},
                    "US Bonds": {"direction": "bullish", "strength": "medium", "emoji": "⬆️"}
                }
            },
            
            # ===== VENDAS NO VAREJO =====
            "Retail Sales": {
                "better_than_forecast": {
                    "USD": {"direction": "bullish", "strength": "medium", "emoji": "⬆️"},
                    "US Stocks": {"direction": "bullish", "strength": "strong", "emoji": "⬆️"}
                },
                "worse_than_forecast": {
                    "USD": {"direction": "bearish", "strength": "medium", "emoji": "⬇️"},
                    "US Stocks": {"direction": "bearish", "strength": "strong", "emoji": "⬇️"}
                }
            },
            
            # ===== DESEMPREGO =====
            "Unemployment Rate": {
                "better_than_forecast": {  # Desemprego menor
                    "USD": {"direction": "bullish", "strength": "strong", "emoji": "⬆️"},
                    "US Stocks": {"direction": "bullish", "strength": "medium", "emoji": "⬆️"},
                    "Gold": {"direction": "bearish", "strength": "weak", "emoji": "⬇️"}
                },
                "worse_than_forecast": {  # Desemprego maior
                    "USD": {"direction": "bearish", "strength": "strong", "emoji": "⬇️"},
                    "US Stocks": {"direction": "bearish", "strength": "medium", "emoji": "⬇️"},
                    "Gold": {"direction": "bullish", "strength": "weak", "emoji": "⬆️"}
                }
            },
            
            # ===== PMI =====
            "ISM Manufacturing PMI": {
                "better_than_forecast": {
                    "USD": {"direction": "bullish", "strength": "medium", "emoji": "⬆️"},
                    "US Stocks": {"direction": "bullish", "strength": "medium", "emoji": "⬆️"}
                },
                "worse_than_forecast": {
                    "USD": {"direction": "bearish", "strength": "medium", "emoji": "⬇️"},
                    "US Stocks": {"direction": "bearish", "strength": "medium", "emoji": "⬇️"}
                }
            },
            
            "ISM Services PMI": {
                "better_than_forecast": {
                    "USD": {"direction": "bullish", "strength": "medium", "emoji": "⬆️"},
                    "US Stocks": {"direction": "bullish", "strength": "medium", "emoji": "⬆️"}
                },
                "worse_than_forecast": {
                    "USD": {"direction": "bearish", "strength": "medium", "emoji": "⬇️"},
                    "US Stocks": {"direction": "bearish", "strength": "medium", "emoji": "⬇️"}
                }
            }
        }
    
    def analyze_event(self, event: Dict) -> Dict:
        """
        Analisa um evento e retorna impacto nos ativos
        Fluxo: Cache -> Regras -> IA
        
        Args:
            event: Dicionário com dados do evento
            
        Returns:
            Análise com impactos nos ativos
        """
        event_name = event.get('event', '')
        
        # 1. Verifica CACHE primeiro
        cache_key = self.generate_cache_key(event)
        if cache_key in self.cache:
            self.stats["cache_used"] += 1
            print(f"💾 Cache hit: {event_name}")
            return self.cache[cache_key]
        
        # 2. Tenta aplicar REGRAS
        rule_analysis = self.apply_rules(event)
        if rule_analysis:
            self.stats["rules_used"] += 1
            print(f"⚙️ Regra aplicada: {event_name}")
            # Salva no cache
            self.cache[cache_key] = rule_analysis
            self.save_cache()
            return rule_analysis
        
        # 3. Usa IA se não tiver regra
        if self.client:
            self.stats["ai_used"] += 1
            print(f"🤖 Análise IA: {event_name}")
            ai_analysis = self.analyze_with_ai(event)
            # Salva no cache
            self.cache[cache_key] = ai_analysis
            self.save_cache()
            return ai_analysis
        else:
            # Sem API key, retorna análise básica
            print(f"⚠️ Sem API key e sem regra: {event_name}")
            return self.default_analysis(event)
    
    def generate_cache_key(self, event: Dict) -> str:
        """Gera chave única para cache"""
        name = event.get('event', '')
        actual = event.get('actual', '')
        forecast = event.get('forecast', '')
        previous = event.get('previous', '')
        
        return f"{name}|{actual}|{forecast}|{previous}"
    
    def apply_rules(self, event: Dict) -> Optional[Dict]:
        """Aplica regras pré-definidas se disponível"""
        event_name = event.get('event', '')
        actual = event.get('actual', '')
        forecast = event.get('forecast', '')
        
        # Busca evento nas regras (busca parcial)
        rule = None
        for rule_name in self.rules:
            if rule_name.lower() in event_name.lower():
                rule = self.rules[rule_name]
                break
        
        if not rule:
            return None
        
        # Determina condição
        condition = self.determine_condition(event, actual, forecast)
        if not condition or condition not in rule:
            return None
        
        impacts = rule[condition]
        
        # Formata análise
        analysis = {
            "event": event_name,
            "method": "rules",
            "condition": condition,
            "summary": self.generate_summary(event, condition),
            "impacts": impacts,
            "timestamp": datetime.now().isoformat()
        }
        
        return analysis
    
    def determine_condition(self, event: Dict, actual: str, forecast: str) -> Optional[str]:
        """Determina a condição (melhor/pior que forecast)"""
        if not actual or not forecast:
            return None
        
        try:
            # Remove caracteres não numéricos (%, K, M, B)
            actual_clean = actual.replace('%', '').replace('K', '').replace('M', '').replace('B', '')
            forecast_clean = forecast.replace('%', '').replace('K', '').replace('M', '').replace('B', '')
            
            actual_num = float(actual_clean)
            forecast_num = float(forecast_clean)
            
            # Para eventos de desemprego/inflação, menor é melhor
            invert_logic = any(word in event.get('event', '').lower() 
                             for word in ['unemployment', 'cpi', 'inflation', 'price'])
            
            if invert_logic:
                return "better_than_forecast" if actual_num < forecast_num else "worse_than_forecast"
            else:
                return "better_than_forecast" if actual_num > forecast_num else "worse_than_forecast"
                
        except:
            return None
    
    def generate_summary(self, event: Dict, condition: str) -> str:
        """Gera resumo textual da análise"""
        event_name = event.get('event', '')
        actual = event.get('actual', '')
        forecast = event.get('forecast', '')
        
        if condition == "better_than_forecast":
            return f"{event_name} veio melhor que o esperado ({actual} vs {forecast}), impactando positivamente o USD e mercados relacionados."
        else:
            return f"{event_name} veio pior que o esperado ({actual} vs {forecast}), impactando negativamente o USD e mercados relacionados."
    
    def analyze_with_ai(self, event: Dict) -> Dict:
        """Analisa evento usando Claude API"""
        if not self.client:
            return self.default_analysis(event)
        
        prompt = f"""Analise o seguinte evento econômico e seu impacto nos mercados financeiros:

Evento: {event.get('event', '')}
Data: {event.get('date', '')}
Horário: {event.get('time', '')}
Moeda: {event.get('currency', '')}
Impacto: {event.get('impact', '')}
Valor Atual: {event.get('actual', 'N/A')}
Previsão: {event.get('forecast', 'N/A')}
Anterior: {event.get('previous', 'N/A')}

Forneça uma análise no seguinte formato JSON:

{{
  "summary": "Resumo curto (1-2 frases) do impacto do evento",
  "impacts": {{
    "USD": {{"direction": "bullish/bearish/neutral", "strength": "weak/medium/strong/very_strong", "emoji": "⬆️/⬇️/➡️"}},
    "US Stocks": {{"direction": "bullish/bearish/neutral", "strength": "weak/medium/strong", "emoji": "⬆️/⬇️/➡️"}},
    "EUR": {{"direction": "bullish/bearish/neutral", "strength": "weak/medium/strong", "emoji": "⬆️/⬇️/➡️"}},
    "Gold": {{"direction": "bullish/bearish/neutral", "strength": "weak/medium/strong", "emoji": "⬆️/⬇️/➡️"}},
    "US Bonds": {{"direction": "bullish/bearish/neutral", "strength": "weak/medium/strong", "emoji": "⬆️/⬇️/➡️"}}
  }}
}}

Responda APENAS com o JSON, sem texto adicional."""

        try:
            message = self.client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=1000,
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )
            
            # Extrai resposta
            response_text = message.content[0].text.strip()
            
            # Remove markdown se houver
            if response_text.startswith('```'):
                response_text = response_text.split('```')[1]
                if response_text.startswith('json'):
                    response_text = response_text[4:]
            
            # Parse JSON
            ai_data = json.loads(response_text)
            
            # Adiciona metadata
            analysis = {
                "event": event.get('event', ''),
                "method": "ai",
                "summary": ai_data.get("summary", ""),
                "impacts": ai_data.get("impacts", {}),
                "timestamp": datetime.now().isoformat()
            }
            
            return analysis
            
        except Exception as e:
            print(f"❌ Erro na análise IA: {str(e)}")
            return self.default_analysis(event)
    
    def default_analysis(self, event: Dict) -> Dict:
        """Análise padrão quando não há regra nem IA"""
        return {
            "event": event.get('event', ''),
            "method": "default",
            "summary": f"Evento {event.get('event', '')} requer análise manual ou configuração de API key.",
            "impacts": {
                "USD": {"direction": "neutral", "strength": "unknown", "emoji": "❓"},
                "US Stocks": {"direction": "neutral", "strength": "unknown", "emoji": "❓"},
                "EUR": {"direction": "neutral", "strength": "unknown", "emoji": "❓"},
                "Gold": {"direction": "neutral", "strength": "unknown", "emoji": "❓"}
            },
            "timestamp": datetime.now().isoformat()
        }
    
    def analyze_all_events(self, events: List[Dict]) -> List[Dict]:
        """Analisa lista de eventos"""
        results = []
        
        print(f"\n🔍 Analisando {len(events)} eventos...\n")
        
        for event in events:
            analysis = self.analyze_event(event)
            results.append(analysis)
        
        return results
    
    def print_statistics(self):
        """Imprime estatísticas de uso"""
        total = sum(self.stats.values())
        if total == 0:
            return
        
        print("\n" + "="*70)
        print("📊 ESTATÍSTICAS DE ANÁLISE")
        print("="*70)
        print(f"💾 Cache usado: {self.stats['cache_used']} ({self.stats['cache_used']/total*100:.1f}%)")
        print(f"⚙️ Regras aplicadas: {self.stats['rules_used']} ({self.stats['rules_used']/total*100:.1f}%)")
        print(f"🤖 IA utilizada: {self.stats['ai_used']} ({self.stats['ai_used']/total*100:.1f}%)")
        print(f"📈 Total analisado: {total}")
        print("="*70 + "\n")


def format_analysis(analysis: Dict):
    """Formata análise para exibição"""
    print("\n" + "="*70)
    print(f"📰 {analysis['event']}")
    print("="*70)
    print(f"🧠 Método: {analysis['method'].upper()}")
    print(f"📝 {analysis['summary']}")
    print("\n💹 IMPACTOS NOS ATIVOS:")
    print("-"*70)
    
    for asset, impact in analysis['impacts'].items():
        direction = impact['direction']
        strength = impact['strength']
        emoji = impact.get('emoji', '❓')
        
        print(f"{emoji} {asset:15} → {direction:10} (força: {strength})")
    
    print("="*70)


if __name__ == "__main__":
    # Exemplo de uso
    from backend.main import ForexFactoryScraper
    
    print("🚀 Sistema Híbrido de Análise de Impacto\n")
    
    # Configura API key (opcional)
    # os.environ["ANTHROPIC_API_KEY"] = "sua-chave-aqui"
    
    # Inicializa scraper e analyzer
    scraper = ForexFactoryScraper()
    analyzer = ImpactAnalyzer()
    
    try:
        # Busca eventos
        events = scraper.fetch_news()
        
        if events:
            # Analisa apenas eventos de alto impacto para demonstração
            high_impact = [e for e in events if e['impact'] == "High Impact"]
            
            print(f"✅ {len(high_impact)} eventos de alto impacto encontrados\n")
            
            # Analisa eventos
            analyses = analyzer.analyze_all_events(high_impact[:5])  # Primeiros 5
            
            # Exibe resultados
            for analysis in analyses:
                format_analysis(analysis)
            
            # Estatísticas
            analyzer.print_statistics()
            
        else:
            print("❌ Nenhum evento encontrado")
            
    except Exception as e:
        print(f"❌ Erro: {str(e)}")
    
    finally:
        scraper.close()
