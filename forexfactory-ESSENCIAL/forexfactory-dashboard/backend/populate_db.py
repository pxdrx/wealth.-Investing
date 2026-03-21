#!/usr/bin/env python3
"""
Script para popular banco de dados com análise macro semanal de teste.
"""

import sys
from pathlib import Path

# Adicionar backend ao path
sys.path.insert(0, str(Path(__file__).parent))

from macro_analysis.integration import get_integration

def main():
    print("=" * 60)
    print("POPULAÇÃO DO BANCO DE DADOS")
    print("=" * 60)
    
    markdown_file = "test_analysis_20260112.md"
    
    if not Path(markdown_file).exists():
        print(f"❌ Arquivo não encontrado: {markdown_file}")
        print(f"   Certifique-se de que o arquivo existe em backend/")
        sys.exit(1)
    
    print(f"\n📄 Arquivo: {markdown_file}")
    print("🔄 Processando análise...")
    
    try:
        integration = get_integration()
        success, result = integration.process_analysis(markdown_file)
        
        if success:
            print("\n✅ ANÁLISE CRIADA COM SUCESSO")
            print(f"   Record ID: {result.get('record_id')}")
            print(f"   Semana: {result.get('week_start')} - {result.get('week_end')}")
            print(f"   Steps: {', '.join(result.get('steps_completed', []))}")
            if result.get('output_file'):
                print(f"   JSON: {result['output_file']}")
        else:
            print("\n❌ ERRO AO CRIAR ANÁLISE")
            for error in result.get('errors', []):
                print(f"   • {error}")
            if result.get('error_id'):
                print(f"   Error ID: {result['error_id']}")
            sys.exit(1)
            
    except Exception as e:
        print(f"\n❌ EXCEÇÃO: {type(e).__name__}")
        print(f"   {str(e)}")
        sys.exit(1)
    
    print("\n" + "=" * 60)
    print("BANCO DE DADOS POPULADO COM SUCESSO")
    print("=" * 60)

if __name__ == "__main__":
    main()