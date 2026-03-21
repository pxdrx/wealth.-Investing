"""
Script de DEBUG: Verifica o que está realmente salvo no banco
"""

import sqlite3
import json

def debug_database():
    """Mostra exatamente o que está no banco"""
    
    db_path = "mrkt_edge.db"
    week_start = "2025-12-15"
    
    print("=" * 70)
    print("🔍 DEBUG: Verificando dados no banco")
    print("=" * 70)
    print()
    
    try:
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Busca o panorama
        cursor.execute("""
            SELECT id, week_start, week_end, panorama_type, 
                   regional_analysis, regional_summaries
            FROM weekly_panoramas 
            WHERE week_start = ?
            ORDER BY generated_at DESC
            LIMIT 1
        """, (week_start,))
        
        row = cursor.fetchone()
        
        if not row:
            print(f"❌ Nenhum panorama encontrado para {week_start}")
            conn.close()
            return
        
        print(f"✅ Panorama encontrado:")
        print(f"   ID: {row['id']}")
        print(f"   Semana: {row['week_start']} a {row['week_end']}")
        print(f"   Tipo: {row['panorama_type']}")
        print()
        
        # Mostra regional_summaries
        print("=" * 70)
        print("📋 REGIONAL_SUMMARIES (O que está no banco):")
        print("=" * 70)
        
        if row['regional_summaries']:
            try:
                summaries = json.loads(row['regional_summaries'])
                print()
                print("🌎 AMÉRICAS:")
                print(f"   {summaries.get('americas', 'NÃO ENCONTRADO')}")
                print()
                print("🇪🇺 EUROPA:")
                print(f"   {summaries.get('europe', 'NÃO ENCONTRADO')}")
                print()
                print("🌏 ÁSIA:")
                print(f"   {summaries.get('asia', 'NÃO ENCONTRADO')}")
                print()
            except json.JSONDecodeError:
                print(f"⚠️  Erro ao fazer parse do JSON:")
                print(f"   {row['regional_summaries'][:200]}...")
        else:
            print("❌ regional_summaries está VAZIO/NULL no banco!")
        
        print()
        print("=" * 70)
        print("📋 REGIONAL_ANALYSIS (Para comparação):")
        print("=" * 70)
        
        if row['regional_analysis']:
            try:
                analysis = json.loads(row['regional_analysis'])
                print()
                print("🌎 AMÉRICAS (primeiras 100 chars):")
                americas = analysis.get('americas', 'NÃO ENCONTRADO')
                print(f"   {americas[:100]}...")
                print()
                print("🇪🇺 EUROPA (primeiras 100 chars):")
                europe = analysis.get('europe', 'NÃO ENCONTRADO')
                print(f"   {europe[:100]}...")
                print()
                print("🌏 ÁSIA (primeiras 100 chars):")
                asia = analysis.get('asia', 'NÃO ENCONTRADO')
                print(f"   {asia[:100]}...")
            except json.JSONDecodeError:
                print("⚠️  Erro ao fazer parse do JSON")
        
        conn.close()
        
        print()
        print("=" * 70)
        print("✅ DEBUG CONCLUÍDO")
        print("=" * 70)
        
    except Exception as e:
        print(f"❌ Erro: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    debug_database()