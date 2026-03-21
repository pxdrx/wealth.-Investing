#!/usr/bin/env python3
"""
Script simplificado para popular banco usando path absoluto.
"""

import sys
from pathlib import Path

# Configurar path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

# Imports após configurar path
from institutional_analysis_pipeline import InstitutionalAnalysisPipeline
from macro_analysis.database.adapter import DatabaseAdapter
from macro_analysis.database.repository import MacroAnalysisRepository
from macro_analysis.config import DATABASE_FILE

def main():
    print("=" * 60)
    print("POPULAÇÃO SIMPLIFICADA DO BANCO DE DADOS")
    print("=" * 60)
    
    # Verificar arquivo markdown
    markdown_file = backend_dir / "test_analysis_20260112.md"
    if not markdown_file.exists():
        print(f"❌ Arquivo não encontrado: {markdown_file}")
        sys.exit(1)
    
    print(f"\n📄 Arquivo: {markdown_file.name}")
    
    # Criar banco e tabela
    print("🔧 Criando banco de dados...")
    adapter = DatabaseAdapter(DATABASE_FILE)
    repository = MacroAnalysisRepository(adapter)
    print(f"✅ Banco criado: {DATABASE_FILE}")
    
    # Processar markdown
    print("\n🔄 Processando análise...")
    output_dir = backend_dir / "outputs" / "macro_analysis"
    output_dir.mkdir(parents=True, exist_ok=True)
    
    pipeline = InstitutionalAnalysisPipeline(
        markdown_path=str(markdown_file),
        output_dir=str(output_dir)
    )
    
    success = pipeline.run()
    
    if not success:
        print("❌ Pipeline falhou")
        sys.exit(1)
    
    # Obter dados validados
    validated = pipeline.validated_analysis
    
    # Preparar dados para insert
    from datetime import timedelta
    
    analysis_data = {
        "week_start": validated.week_start,
        "week_end": validated.week_start + timedelta(days=6),
        "generated_at": validated.generated_at,
        "analyst": validated.analyst,
        "source": validated.source,
        "regional_overview": {
            region.region: region.content
            for region in validated.regional_overview
        },
        "narrative": {
            "politica_monetaria": validated.narrative.politica_monetaria,
            "crescimento_economico": validated.narrative.crescimento_economico,
            "inflacao_pressoes": validated.narrative.inflacao_pressoes,
            "risco_apetite": validated.narrative.risco_apetite,
        },
        "conclusion": {
            "sintese_semana": validated.conclusion.sintese_semana,
            "precificacao_mercado": validated.conclusion.precificacao_mercado,
        },
        "assets": [
            {
                "name": asset.name,
                "scenario_base": asset.scenario_base,
                "driver_macro": asset.driver_macro,
                "probability": {
                    "alta": asset.probability.alta,
                    "lateral": asset.probability.lateral,
                    "baixa": asset.probability.baixa,
                }
            }
            for asset in validated.assets
        ],
        "additional_notes": validated.additional_notes,
    }
    
    # Inserir no banco
    print("\n💾 Salvando no banco...")
    record_id = repository.create(analysis_data)
    
    print("\n✅ ANÁLISE CRIADA COM SUCESSO")
    print(f"   Record ID: {record_id}")
    print(f"   Semana: {validated.week_start} - {validated.week_start + timedelta(days=6)}")
    print(f"   Analista: {validated.analyst}")
    
    print("\n" + "=" * 60)
    print("BANCO DE DADOS POPULADO COM SUCESSO")
    print("=" * 60)

if __name__ == "__main__":
    main()