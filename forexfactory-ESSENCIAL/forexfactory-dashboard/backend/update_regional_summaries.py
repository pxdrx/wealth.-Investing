"""
Script para adicionar RESUMOS REAIS ao panorama da semana 2025-12-15
Resumos escritos à mão, objetivos e diretos
"""

import sqlite3
import json
from datetime import datetime

# RESUMOS REAIS - OBJETIVOS E DIRETOS (1-2 linhas)
REGIONAL_SUMMARIES = {
    "americas": "Manufatura americana em forte contração (-3.9). Emprego de segunda-feira será decisivo para postura do Fed.",
    
    "europe": "Produção industrial europeia surpreende positivamente (+0.8%). PMIs alemães definirão continuidade da força.",
    
    "asia": "PMI japonês melhora mas permanece fraco (49.7). Consumidor australiano deteriora apesar de serviços sólidos."
}

def update_panorama_with_summaries():
    """Atualiza panorama da semana com resumos regionais REAIS"""
    
    db_path = "mrkt_edge.db"
    week_start = "2025-12-15"
    
    print("=" * 60)
    print("🔧 Atualizando com RESUMOS REAIS (Objetivos e Diretos)")
    print("=" * 60)
    print()
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Busca o panorama da semana
        cursor.execute("""
            SELECT id, week_start, week_end, panorama_type 
            FROM weekly_panoramas 
            WHERE week_start = ?
            ORDER BY generated_at DESC
            LIMIT 1
        """, (week_start,))
        
        row = cursor.fetchone()
        
        if not row:
            print(f"❌ Panorama não encontrado para {week_start}")
            return
        
        panorama_id = row[0]
        print(f"✅ Panorama encontrado: ID {panorama_id}")
        print(f"   Semana: {row[1]} a {row[2]}")
        print(f"   Tipo: {row[3]}")
        print()
        
        # Atualiza com os resumos REAIS
        summaries_json = json.dumps(REGIONAL_SUMMARIES, ensure_ascii=False)
        
        cursor.execute("""
            UPDATE weekly_panoramas 
            SET regional_summaries = ?
            WHERE id = ?
        """, (summaries_json, panorama_id))
        
        conn.commit()
        
        print("✅ Resumos REAIS adicionados com sucesso!")
        print()
        print("📝 RESUMOS (Banner - Objetivos):")
        print()
        print("🌎 AMÉRICAS:")
        print(f"   {REGIONAL_SUMMARIES['americas']}")
        print()
        print("🇪🇺 EUROPA:")
        print(f"   {REGIONAL_SUMMARIES['europe']}")
        print()
        print("🌏 ÁSIA:")
        print(f"   {REGIONAL_SUMMARIES['asia']}")
        print()
        
        # Verifica
        cursor.execute("""
            SELECT regional_summaries 
            FROM weekly_panoramas 
            WHERE id = ?
        """, (panorama_id,))
        
        result = cursor.fetchone()
        if result and result[0]:
            print("✅ Verificação: Resumos salvos corretamente no banco!")
        else:
            print("⚠️  Aviso: Resumos podem não ter sido salvos")
        
        conn.close()
        
        print()
        print("=" * 60)
        print("✅ ATUALIZAÇÃO CONCLUÍDA!")
        print("=" * 60)
        print()
        print("Próximos passos:")
        print("1. Reinicie o backend: python minimal_backend.py")
        print("2. Atualize o frontend (F5)")
        print("3. Veja os RESUMOS REAIS no banner!")
        print()
        print("📋 DIFERENÇA:")
        print("   Banner: Resumo objetivo (1-2 linhas)")
        print("   Modal:  Análise completa detalhada")
        
    except Exception as e:
        print(f"❌ Erro: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    update_panorama_with_summaries()