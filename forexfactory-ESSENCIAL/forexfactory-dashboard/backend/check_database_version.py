"""
Verificador: Confirma qual database.py está rodando
"""

def check_database_version():
    """Verifica se o database.py tem a função de resumos"""
    
    print("=" * 60)
    print("🔍 Verificando versão do database.py")
    print("=" * 60)
    print()
    
    try:
        from database import MRKTDatabase
        import inspect
        
        # Verifica se existe o método _generate_summaries_from_analysis
        db = MRKTDatabase()
        
        has_method = hasattr(db, '_generate_summaries_from_analysis')
        
        if has_method:
            print("✅ database.py ATUALIZADO detectado!")
            print("   Método '_generate_summaries_from_analysis' encontrado")
        else:
            print("❌ database.py ANTIGO detectado!")
            print("   Método '_generate_summaries_from_analysis' NÃO encontrado")
            print()
            print("🔧 SOLUÇÃO:")
            print("   1. Verifique se database.py foi substituído corretamente")
            print("   2. Pare o backend (Ctrl+C)")
            print("   3. Substitua database.py pela versão atualizada")
            print("   4. Reinicie o backend")
        
        print()
        
        # Lista todos os métodos
        print("📋 Métodos disponíveis:")
        methods = [m for m in dir(db) if not m.startswith('__')]
        for method in methods:
            print(f"   - {method}")
        
        print()
        print("=" * 60)
        
    except Exception as e:
        print(f"❌ Erro: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    check_database_version()