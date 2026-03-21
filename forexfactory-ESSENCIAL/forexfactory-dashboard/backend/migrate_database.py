"""
Script de Migração: Adiciona coluna regional_summaries
Execute ANTES do update_regional_summaries.py
"""

import sqlite3

def migrate_database():
    """Adiciona coluna regional_summaries à tabela weekly_panoramas"""
    
    db_path = "mrkt_edge.db"
    
    print("=" * 50)
    print("🔧 Migrando Banco de Dados")
    print("=" * 50)
    print()
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Verifica se a coluna já existe
        cursor.execute("PRAGMA table_info(weekly_panoramas)")
        columns = [col[1] for col in cursor.fetchall()]
        
        if 'regional_summaries' in columns:
            print("✅ Coluna 'regional_summaries' já existe!")
            print("   Nenhuma migração necessária.")
        else:
            print("⚙️  Adicionando coluna 'regional_summaries'...")
            
            cursor.execute("""
                ALTER TABLE weekly_panoramas 
                ADD COLUMN regional_summaries TEXT
            """)
            
            conn.commit()
            
            print("✅ Coluna 'regional_summaries' adicionada com sucesso!")
            
            # Verifica novamente
            cursor.execute("PRAGMA table_info(weekly_panoramas)")
            columns_after = [col[1] for col in cursor.fetchall()]
            
            if 'regional_summaries' in columns_after:
                print("✅ Verificação: Migração bem-sucedida!")
            else:
                print("⚠️  Aviso: Algo deu errado na migração")
        
        conn.close()
        
        print()
        print("=" * 50)
        print("✅ MIGRAÇÃO CONCLUÍDA!")
        print("=" * 50)
        print()
        print("Próximo passo:")
        print("Execute: python update_regional_summaries.py")
        
    except Exception as e:
        print(f"❌ Erro na migração: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    migrate_database()