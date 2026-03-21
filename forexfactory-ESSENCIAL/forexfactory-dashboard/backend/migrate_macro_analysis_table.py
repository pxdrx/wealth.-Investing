"""
Script de migração para adicionar colunas faltantes na tabela macro_analysis_institutional
"""

import sqlite3
from pathlib import Path
from macro_analysis.config import DATABASE_FILE

def migrate_table():
    """Adiciona colunas faltantes se não existirem."""
    
    db_path = DATABASE_FILE
    if not db_path.exists():
        print(f"[OK] Banco de dados não existe, será criado automaticamente")
        return
    
    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()
    
    # Lista de colunas a adicionar (se não existirem)
    columns_to_add = [
        ("ativo_dominante_semana", "TEXT"),
        ("ativos_correlacionados_semana", "TEXT"),
        ("direcionamento_semanal", "TEXT"),
        ("interpretacao_narrativa_ativo", "TEXT"),
        ("fluxo_risco", "TEXT"),
        ("cenario_base", "TEXT"),
        ("cenario_alternativo", "TEXT"),
        ("zona_ruido", "TEXT"),
        ("distribuicao_probabilidades", "TEXT"),
        ("mapa_conviccao", "TEXT"),
        ("condicoes_execucao", "TEXT"),
        ("sizing_institucional", "TEXT"),
        ("risco_primario", "TEXT"),
        ("alertas_adaptativos", "TEXT"),
        ("monitoramento_cenario", "TEXT"),
    ]
    
    # Verificar quais colunas já existem
    cursor.execute("PRAGMA table_info(macro_analysis_institutional)")
    existing_columns = {row[1] for row in cursor.fetchall()}
    
    added_count = 0
    for col_name, col_type in columns_to_add:
        if col_name not in existing_columns:
            try:
                cursor.execute(f"ALTER TABLE macro_analysis_institutional ADD COLUMN {col_name} {col_type}")
                print(f"[OK] Coluna {col_name} adicionada")
                added_count += 1
            except sqlite3.OperationalError as e:
                print(f"[ERRO] Falha ao adicionar {col_name}: {e}")
        else:
            print(f"[SKIP] Coluna {col_name} já existe")
    
    conn.commit()
    conn.close()
    
    print(f"\n[OK] Migração concluída. {added_count} colunas adicionadas.")

if __name__ == "__main__":
    migrate_table()
