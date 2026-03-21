import sqlite3
from pathlib import Path

db_path = Path("mrkt_edge.db")

if not db_path.exists():
    print("❌ Banco de dados não encontrado")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    cursor.execute("SELECT COUNT(*) FROM macro_analysis_institutional")
    count = cursor.fetchone()[0]
    
    print(f"✅ Banco de dados encontrado")
    print(f"   Total de análises: {count}")
    
    if count > 0:
        cursor.execute("""
            SELECT week_start, week_end, is_frozen 
            FROM macro_analysis_institutional 
            LIMIT 1
        """)
        row = cursor.fetchone()
        print(f"   Última análise: {row[0]} - {row[1]}")
        print(f"   Congelada: {bool(row[2])}")
    else:
        print("   ⚠️ Banco vazio - execute populate_db.py")
        
except sqlite3.OperationalError as e:
    print(f"❌ Erro ao consultar banco: {e}")
finally:
    conn.close()