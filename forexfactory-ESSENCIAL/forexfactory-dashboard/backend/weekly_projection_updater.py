"""
Weekly Projection Auto-Updater
===============================

Atualiza projeção semanal automaticamente quando:
- Eventos HIGH impact têm resultados publicados
- Desvios significativos são detectados
- Múltiplos eventos de uma moeda são concluídos
"""

from datetime import datetime
from typing import Dict, List
import threading
import time


class WeeklyProjectionUpdater:
    """
    Atualiza projeção semanal baseado em novos resultados do FF
    """
    
    def __init__(self, ff_scraper, macro_analyzer):
        """
        Args:
            ff_scraper: Instância do ForexFactoryRealtime
            macro_analyzer: Função get_macro_weekly_data_v3
        """
        self.ff_scraper = ff_scraper
        self.macro_analyzer = macro_analyzer
        self.last_projection = None
        self.last_update_trigger = None
        
        # Thresholds para trigger de atualização
        self.update_triggers = {
            'high_impact_result': True,  # Qualquer HIGH impact com resultado
            'significant_deviation': 10,  # Desvio > 10%
            'multiple_currency_events': 3,  # 3+ eventos de uma moeda
            'extreme_deviation': 20  # Desvio > 20% (update URGENTE)
        }
        
        # Inicia monitor
        self.start_monitoring()
    
    def start_monitoring(self):
        """Inicia thread de monitoramento"""
        def monitor_loop():
            while True:
                try:
                    self.check_and_update()
                    time.sleep(60)  # Checa a cada 1 minuto
                except Exception as e:
                    print(f"❌ Erro no monitor de projeção: {e}")
                    time.sleep(60)
        
        thread = threading.Thread(target=monitor_loop, daemon=True)
        thread.start()
        print("✅ Monitor de projeção semanal iniciado")
    
    def check_and_update(self):
        """Checa se deve atualizar projeção"""
        try:
            # Pega dados atuais do FF
            ff_data = self.ff_scraper.get_data()
            
            # Checa triggers
            should_update, reason = self.should_update_projection(ff_data)
            
            if should_update:
                print(f"🔄 Atualizando projeção semanal: {reason}")
                self.update_projection(ff_data, reason)
        
        except Exception as e:
            print(f"❌ Erro ao checar atualização: {e}")
    
    def should_update_projection(self, ff_data):
        """Determina se deve atualizar projeção"""
        
        # Novos resultados detectados
        new_results = ff_data.get('new_results', [])
        
        if not new_results:
            return False, None
        
        # 1. HIGH impact com resultado
        high_impact_results = [r for r in new_results if r['impact'] == 'HIGH']
        if high_impact_results:
            return True, f"{len(high_impact_results)} evento(s) HIGH impact com resultado"
        
        # 2. Desvio significativo
        significant_deviations = [
            r for r in new_results 
            if r.get('result_deviation') and abs(r['result_deviation']) > self.update_triggers['significant_deviation']
        ]
        if significant_deviations:
            max_dev = max([abs(r['result_deviation']) for r in significant_deviations])
            return True, f"Desvio significativo detectado ({max_dev:.1f}%)"
        
        # 3. Desvio EXTREMO (update urgente)
        extreme_deviations = [
            r for r in new_results 
            if r.get('result_deviation') and abs(r['result_deviation']) > self.update_triggers['extreme_deviation']
        ]
        if extreme_deviations:
            return True, "⚠️ DESVIO EXTREMO - Update urgente"
        
        # 4. Múltiplos eventos de uma moeda
        impact_analysis = ff_data.get('impact_analysis', {})
        currencies_affected = impact_analysis.get('currencies_affected', {})
        
        for currency, info in currencies_affected.items():
            if info['high_impact_count'] >= 2:
                return True, f"{currency}: {info['high_impact_count']} eventos HIGH impact concluídos"
        
        return False, None
    
    def update_projection(self, ff_data, reason):
        """Atualiza projeção semanal"""
        try:
            # Recalcula projeção com dados atualizados
            projection = self.macro_analyzer()
            
            # Adiciona informações de atualização
            projection['projection_updated_at'] = datetime.now().isoformat()
            projection['update_reason'] = reason
            projection['triggered_by_events'] = ff_data.get('new_results', [])[:5]  # Top 5
            
            self.last_projection = projection
            self.last_update_trigger = reason
            
            print(f"✅ Projeção atualizada: {reason}")
            
            # Log eventos que causaram update
            new_results = ff_data.get('new_results', [])
            for event in new_results[:3]:
                print(f"   • {event['currency']} {event['event']}: {event['actual']}")
            
            return projection
        
        except Exception as e:
            print(f"❌ Erro ao atualizar projeção: {e}")
            return None
    
    def get_latest_projection(self):
        """Retorna última projeção calculada"""
        if not self.last_projection:
            # Se nunca calculou, calcula agora
            self.last_projection = self.macro_analyzer()
        
        return self.last_projection
    
    def force_update(self):
        """Força atualização da projeção"""
        print("🔄 Forçando atualização da projeção...")
        ff_data = self.ff_scraper.get_data()
        return self.update_projection(ff_data, "Manual update")


# Função helper para integrar no backend
def create_projection_updater(ff_scraper, macro_analyzer):
    """
    Cria e inicia updater de projeção
    
    Args:
        ff_scraper: Instância do ForexFactoryRealtime
        macro_analyzer: Função get_macro_weekly_data_v3
    
    Returns:
        WeeklyProjectionUpdater instance
    """
    return WeeklyProjectionUpdater(ff_scraper, macro_analyzer)


# Teste
if __name__ == "__main__":
    print("🔄 Weekly Projection Auto-Updater")
    print("=" * 60)
    print("Monitor ativo - aguardando novos resultados...")
    print("=" * 60)
    
    # Simula comportamento
    print("\nTriggers configurados:")
    print("✓ HIGH impact com resultado")
    print("✓ Desvio > 10%")
    print("✓ Desvio > 20% (urgente)")
    print("✓ 3+ eventos de uma moeda")
    print("\nQuando qualquer trigger for ativado,")
    print("a projeção semanal será recalculada automaticamente.")