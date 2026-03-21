"""
FORÇA a atualização dos resumos no banco
Ignora tudo e sobrescreve com os resumos corretos
"""

import sqlite3
import json

# RESUMOS CORRETOS - FINAIS
REGIONAL_SUMMARIES_FINAL = {
    "americas": "Manufatura americana em forte contração (-3.9). Emprego de segunda-feira será decisivo para postura do Fed.",
    "europe": "Produção industrial europeia surpreende positivamente (+0.8%). PMIs alemães definirão continuidade da força.",
    "asia": "PMI japonês melhora mas permanece fraco (49.7). Consumidor australiano deteriora apesar de serviços sólidos."
}

def force_update():
    """FORÇA atualização no banco"""
    
    db_path = "mrkt_edge.db"
    week_start = "2025-12-15"
    
    print("=" * 70)
    print("⚡ FORÇANDO ATUALIZAÇÃO DOS RESUMOS")
    print("=" * 70)
    print()
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # 1. Busca o panorama
        cursor.execute("""
            SELECT id FROM weekly_panoramas 
            WHERE week_start = ?
            ORDER BY generated_at DESC
            LIMIT 1
        """, (week_start,))
        
        row = cursor.fetchone()
        if not row:
            print("❌ Panorama não encontrado!")
            return
        
        panorama_id = row[0]
        print(f"✅ Panorama ID: {panorama_id}")
        print()
        
        # 2. FORÇA atualização
        summaries_json = json.dumps(REGIONAL_SUMMARIES_FINAL, ensure_ascii=False)
        
        print("⚡ Forçando atualização...")
        cursor.execute("""
            UPDATE weekly_panoramas 
            SET regional_summaries = ?
            WHERE id = ?
        """, (summaries_json, panorama_id))
        
        conn.commit()
        print("✅ Atualização forçada!")
        print()
        
        # 3. VERIFICA o que foi salvo
        cursor.execute("""
            SELECT regional_summaries 
            FROM weekly_panoramas 
            WHERE id = ?
        """, (panorama_id,))
        
        result = cursor.fetchone()
        
        if result and result[0]:
            saved = json.loads(result[0])
            print("📋 VERIFICAÇÃO - O que está no banco AGORA:")
            print()
            print("🌎 AMÉRICAS:")
            print(f"   {saved.get('americas', 'ERRO')}")
            print()
            print("🇪🇺 EUROPA:")
            print(f"   {saved.get('europe', 'ERRO')}")
            print()
            print("🌏 ÁSIA:")
            print(f"   {saved.get('asia', 'ERRO')}")
            print()
            
            # Verifica se está correto
            if saved.get('americas') == REGIONAL_SUMMARIES_FINAL['americas']:
                print("✅ RESUMOS CORRETOS SALVOS!")
            else:
                print("❌ AINDA ESTÁ ERRADO!")
                print()
                print("Esperado:")
                print(f"   {REGIONAL_SUMMARIES_FINAL['americas']}")
                print()
                print("Encontrado:")
                print(f"   {saved.get('americas')}")
        else:
            print("❌ Nada foi salvo!")
        
        conn.close()
        
        print()
        print("=" * 70)
        print("✅ CONCLUÍDO!")
        print("=" * 70)
        print()
        print("Próximos passos:")
        print("1. Reinicie o backend: python minimal_backend.py")
        print("2. Teste a API: http://localhost:8000/api/mrkt/weekly-panorama")
        print("3. Procure por 'regional_summaries' no JSON")
        
    except Exception as e:
        print(f"❌ Erro: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    force_update()