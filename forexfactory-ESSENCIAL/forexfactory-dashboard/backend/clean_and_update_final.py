"""
LIMPA resumos corrompidos e atualiza com os corretos
"""

import sqlite3
import json

# RESUMOS FINAIS CORRETOS
SUMMARIES = {
    "americas": "Manufatura americana em forte contração (-3.9). Emprego de segunda-feira será decisivo para postura do Fed.",
    "europe": "Produção industrial europeia surpreende positivamente (+0.8%). PMIs alemães definirão continuidade da força.",
    "asia": "PMI japonês melhora mas permanece fraco (49.7). Consumidor australiano deteriora apesar de serviços sólidos."
}

def clean_and_update():
    """Limpa e atualiza resumos"""
    
    db_path = "mrkt_edge.db"
    week_start = "2025-12-15"
    
    print("=" * 70)
    print("🧹 LIMPANDO E ATUALIZANDO RESUMOS")
    print("=" * 70)
    print()
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # 1. Busca panorama
        cursor.execute("SELECT id FROM weekly_panoramas WHERE week_start = ?", (week_start,))
        row = cursor.fetchone()
        
        if not row:
            print("❌ Panorama não encontrado!")
            return
        
        panorama_id = row[0]
        print(f"✅ Panorama ID: {panorama_id}")
        print()
        
        # 2. PRIMEIRO: Limpa (seta como NULL)
        print("🧹 Limpando resumos corrompidos...")
        cursor.execute("UPDATE weekly_panoramas SET regional_summaries = NULL WHERE id = ?", (panorama_id,))
        conn.commit()
        print("✅ Resumos antigos removidos!")
        print()
        
        # 3. SEGUNDO: Insere corretos
        print("💾 Inserindo resumos corretos...")
        summaries_json = json.dumps(SUMMARIES, ensure_ascii=False)
        cursor.execute("UPDATE weekly_panoramas SET regional_summaries = ? WHERE id = ?", 
                      (summaries_json, panorama_id))
        conn.commit()
        print("✅ Resumos corretos inseridos!")
        print()
        
        # 4. VERIFICA
        print("🔍 Verificando...")
        cursor.execute("SELECT regional_summaries FROM weekly_panoramas WHERE id = ?", (panorama_id,))
        result = cursor.fetchone()
        
        if result and result[0]:
            saved = json.loads(result[0])
            
            print("📋 Resumos salvos no banco:")
            print()
            for region, text in saved.items():
                print(f"  {region.upper()}:")
                print(f"    {text[:80]}...")
                print()
            
            # Testa se está igual
            if saved['americas'] == SUMMARIES['americas']:
                print("✅✅✅ SUCESSO! Resumos corretos!")
            else:
                print("❌ AINDA ERRADO:")
                print(f"  Esperado: {SUMMARIES['americas']}")
                print(f"  Obtido:   {saved['americas']}")
        
        conn.close()
        
        print()
        print("=" * 70)
        print("✅ CONCLUÍDO!")
        print("=" * 70)
        print()
        print("IMPORTANTE:")
        print("1. DELETE __pycache__: Remove-Item -Recurse -Force __pycache__")
        print("2. REINICIE o backend: python minimal_backend.py")
        print("3. TESTE: http://localhost:8000/api/mrkt/weekly-panorama")
        
    except Exception as e:
        print(f"❌ Erro: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    clean_and_update()