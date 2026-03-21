# ETAPA 7.2 — NOVO ARQUIVO (NÃO EXISTIA ANTES)
"""
MRKT Edge — Macro Analysis Integration

Orquestrador de integração entre pipeline existente e módulo macro_analysis.

Responsabilidades:
- Fazer ponte entre institutional_analysis_pipeline.py (ETAPA 5) e módulo novo
- Executar pipeline de parsing/validação (existente)
- Persistir resultado via repository (novo)
- Gerar outputs JSON (novo)
- Coordenar fluxo completo end-to-end

Padrão de Integração:
- Importa backend/institutional_analysis_pipeline.py SEM modificá-lo
- Usa pipeline existente como componente
- Adiciona camada de persistência e output generation

Fluxo:
1. Recebe markdown de análise institucional
2. Executa pipeline existente (parse + validate)
3. Persiste no banco via repository
4. Gera arquivo JSON de output
5. Retorna resultado

Conformidade:
- Zero modificação em código existente
- Integração via import direto
- Cláusula de Preservação de Código (ATIVA)
"""

import json
from datetime import date
from pathlib import Path
from typing import Dict, Optional, Tuple

# Import do pipeline existente (ETAPA 5) - SEM MODIFICAR
from ..institutional_analysis_pipeline import InstitutionalAnalysisPipeline
from ..schemas.institutional_analysis_schema import InstitutionalAnalysis

# Imports do módulo macro_analysis
from .database.repository import MacroAnalysisRepository, DuplicateAnalysisError
from .database.adapter import get_database_adapter
from .config import get_output_filepath, OUTPUTS_DIR
from .decision_intelligence_generator import DecisionIntelligenceGenerator


# ============================================================================
# INTEGRATION CLASS
# ============================================================================

class MacroAnalysisIntegration:
    """
    Orquestrador de integração entre pipeline existente e módulo novo.
    
    Coordena fluxo completo: markdown → parse → validate → persist → output
    """
    
    def __init__(
        self,
        repository: Optional[MacroAnalysisRepository] = None,
        output_dir: Optional[Path] = None
    ):
        """
        Inicializa integration layer.
        
        Args:
            repository: Instância de repository (opcional)
            output_dir: Diretório de output (opcional, usa config se None)
        """
        # Repository
        if repository is None:
            adapter = get_database_adapter()
            self.repository = MacroAnalysisRepository(db_adapter=adapter)
        else:
            self.repository = repository
        
        # Output directory
        self.output_dir = output_dir or OUTPUTS_DIR
        self.output_dir.mkdir(parents=True, exist_ok=True)
    
    # ========================================================================
    # MAIN INTEGRATION FLOW
    # ========================================================================
    
    def process_analysis(
        self,
        markdown_path: str,
        force_update: bool = False
    ) -> Tuple[bool, Dict]:
        """
        Processa análise institucional completa (end-to-end).
        
        Fluxo:
        1. Executa pipeline existente (parse + validate)
        2. Persiste no banco
        3. Gera JSON de output
        4. Retorna resultado
        
        Args:
            markdown_path: Caminho para arquivo markdown
            force_update: Se True, permite sobrescrever análise existente
        
        Returns:
            Tuple[bool, Dict]: (success, result_info)
        
        Example:
            >>> integration = MacroAnalysisIntegration()
            >>> success, info = integration.process_analysis(
            ...     "institutional_analysis_week_20260104.md"
            ... )
            >>> print(info)
            {
                "success": True,
                "week_start": "2026-01-04",
                "record_id": 1,
                "output_file": ".../institutional_analysis_20260104.json"
            }
        """
        result_info = {
            "success": False,
            "markdown_path": markdown_path,
            "steps_completed": [],
            "errors": [],
        }
        
        try:
            # STEP 1: Executar pipeline existente (parse + validate)
            parsed_data, validated_analysis = self._execute_existing_pipeline(markdown_path)
            result_info["steps_completed"].append("parse_and_validate")
            
            # STEP 1.5: Gerar campos de inteligência orientada a decisão
            decision_intelligence = self._generate_decision_intelligence(validated_analysis)
            result_info["steps_completed"].append("generate_decision_intelligence")
            
            # STEP 2: Persistir no banco
            record_id = self._persist_to_database(
                validated_analysis,
                decision_intelligence=decision_intelligence,
                force_update=force_update
            )
            result_info["steps_completed"].append("persist_database")
            result_info["record_id"] = record_id
            
            # STEP 3: Gerar JSON de output
            output_path = self._generate_json_output(validated_analysis, decision_intelligence)
            result_info["steps_completed"].append("generate_json")
            result_info["output_file"] = str(output_path)
            
            # Sucesso
            result_info["success"] = True
            result_info["week_start"] = validated_analysis.week_start.isoformat()
            result_info["week_end"] = validated_analysis.week_end.isoformat()
            
        except Exception as e:
            result_info["errors"].append(str(e))
            result_info["success"] = False
        
        return result_info["success"], result_info
    
    # ========================================================================
    # STEP 1: EXECUTE EXISTING PIPELINE
    # ========================================================================
    
    def _execute_existing_pipeline(
        self,
        markdown_path: str
    ) -> Tuple[Dict, InstitutionalAnalysis]:
        """
        Executa pipeline existente (ETAPA 5) para parse e validação.
        
        Usa InstitutionalAnalysisPipeline SEM modificá-lo.
        
        Args:
            markdown_path: Caminho para arquivo markdown
        
        Returns:
            Tuple[Dict, InstitutionalAnalysis]: (parsed_data, validated_analysis)
        
        Raises:
            Exception: Se pipeline falhar
        """
        # Criar instância do pipeline existente
        pipeline = InstitutionalAnalysisPipeline(
            markdown_path=markdown_path,
            output_dir=str(self.output_dir)  # Pipeline gera JSON também
        )
        
        # Executar pipeline (parse + validate)
        success = pipeline.run()
        
        if not success:
            raise Exception("Pipeline existente falhou. Verifique logs.")
        
        # Recuperar dados parseados e validados
        parsed_data = pipeline.parsed_data
        validated_analysis = pipeline.validated_analysis
        
        return parsed_data, validated_analysis
    
    # ========================================================================
    # STEP 1.5: GENERATE DECISION INTELLIGENCE
    # ========================================================================
    
    def _generate_decision_intelligence(
        self,
        validated_analysis: InstitutionalAnalysis
    ) -> Dict:
        """
        Gera campos de inteligência orientada a decisão.
        
        Args:
            validated_analysis: Análise validada
            
        Returns:
            Dict com os 4 novos campos
        """
        generator = DecisionIntelligenceGenerator()
        return generator.generate(validated_analysis)
    
    # ========================================================================
    # STEP 2: PERSIST TO DATABASE
    # ========================================================================
    
    def _persist_to_database(
        self,
        validated_analysis: InstitutionalAnalysis,
        decision_intelligence: Dict,
        force_update: bool = False
    ) -> int:
        """
        Persiste análise validada no banco de dados.
        
        Args:
            validated_analysis: Análise validada (Pydantic model)
            force_update: Se True, atualiza se já existir
        
        Returns:
            int: ID do registro (criado ou atualizado)
        
        Raises:
            DuplicateAnalysisError: Se já existe e force_update=False
        """
        week_start = validated_analysis.week_start
        
        # Verificar se já existe
        existing = self.repository.get_by_week_start(week_start)
        
        if existing:
            if not force_update:
                raise DuplicateAnalysisError(
                    f"Análise já existe para week_start={week_start}. "
                    f"Use force_update=True para sobrescrever."
                )
            
            # Update existente
            update_data = self._build_analysis_data(validated_analysis, decision_intelligence)
            self.repository.update(week_start, update_data)
            
            return existing["id"]
        
        else:
            # Create novo
            analysis_data = self._build_analysis_data(validated_analysis, decision_intelligence)
            record_id = self.repository.create(analysis_data)
            
            return record_id
    
    def _build_analysis_data(
        self,
        validated_analysis: InstitutionalAnalysis,
        decision_intelligence: Dict
    ) -> Dict:
        """
        Constrói dict de dados para repository.
        
        Args:
            validated_analysis: Análise validada
        
        Returns:
            Dict: Dados formatados para repository
        """
        return {
            "week_start": validated_analysis.week_start,
            "week_end": validated_analysis.week_end,
            "generated_at": validated_analysis.generated_at,
            "analyst": validated_analysis.analyst,
            "source": validated_analysis.source,
            "regional_overview": {
                region.region: region.content
                for region in validated_analysis.regional_overview
            },
            "narrative": {
                "politica_monetaria": validated_analysis.narrative.politica_monetaria,
                "crescimento_economico": validated_analysis.narrative.crescimento_economico,
                "inflacao_pressoes": validated_analysis.narrative.inflacao_pressoes,
                "risco_apetite": validated_analysis.narrative.risco_apetite,
            },
            "conclusion": {
                "sintese_semana": validated_analysis.conclusion.sintese_semana,
                "precificacao_mercado": validated_analysis.conclusion.precificacao_mercado,
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
                for asset in validated_analysis.assets
            ],
            "additional_notes": validated_analysis.additional_notes,
            # Campos de inteligência orientada a decisão
            "ativo_dominante_semana": (
                {
                    "ativo": decision_intelligence["ativo_dominante_semana"].ativo,
                    "justificativa": decision_intelligence["ativo_dominante_semana"].justificativa
                }
                if decision_intelligence.get("ativo_dominante_semana") else None
            ),
            "ativos_correlacionados_semana": (
                [
                    {
                        "ativo": asset.ativo,
                        "justificativa": asset.justificativa
                    }
                    for asset in decision_intelligence["ativos_correlacionados_semana"]
                ]
                if decision_intelligence.get("ativos_correlacionados_semana") else None
            ),
            "direcionamento_semanal": decision_intelligence.get("direcionamento_semanal"),
            "interpretacao_narrativa_ativo": decision_intelligence.get("interpretacao_narrativa_ativo"),
            "fluxo_risco": (
                {
                    "classificacao": decision_intelligence["fluxo_risco"].classificacao,
                    "ativos_migracao": decision_intelligence["fluxo_risco"].ativos_migracao,
                    "justificativa": decision_intelligence["fluxo_risco"].justificativa
                }
                if decision_intelligence.get("fluxo_risco") else None
            ),
            # Fase 3 - Controle Institucional
            "cenario_base": (
                {
                    "direcao": decision_intelligence["cenario_base"].direcao,
                    "ativos_beneficiados": decision_intelligence["cenario_base"].ativos_beneficiados,
                    "justificativa": decision_intelligence["cenario_base"].justificativa
                }
                if decision_intelligence.get("cenario_base") else None
            ),
            "cenario_alternativo": (
                {
                    "condicao_ativacao": decision_intelligence["cenario_alternativo"].condicao_ativacao,
                    "ativos_beneficiados": decision_intelligence["cenario_alternativo"].ativos_beneficiados,
                    "justificativa": decision_intelligence["cenario_alternativo"].justificativa
                }
                if decision_intelligence.get("cenario_alternativo") else None
            ),
            "zona_ruido": (
                {
                    "condicoes": decision_intelligence["zona_ruido"].condicoes,
                    "ativos_evitar": decision_intelligence["zona_ruido"].ativos_evitar,
                    "justificativa": decision_intelligence["zona_ruido"].justificativa
                }
                if decision_intelligence.get("zona_ruido") else None
            ),
            "distribuicao_probabilidades": (
                {
                    "cenario_base": decision_intelligence["distribuicao_probabilidades"].cenario_base,
                    "cenario_alternativo": decision_intelligence["distribuicao_probabilidades"].cenario_alternativo,
                    "ruido": decision_intelligence["distribuicao_probabilidades"].ruido
                }
                if decision_intelligence.get("distribuicao_probabilidades") else None
            ),
            # Fase 4 - Decisão Acionável
            "mapa_conviccao": (
                [
                    {
                        "ativo": conv.ativo,
                        "conviccao": conv.conviccao,
                        "motivo_resumido": conv.motivo_resumido
                    }
                    for conv in decision_intelligence["mapa_conviccao"]
                ]
                if decision_intelligence.get("mapa_conviccao") else None
            ),
            "condicoes_execucao": (
                {
                    "condicao_macro": decision_intelligence["condicoes_execucao"].condicao_macro,
                    "condicao_de_preco": decision_intelligence["condicoes_execucao"].condicao_de_preco,
                    "condicao_de_volatilidade": decision_intelligence["condicoes_execucao"].condicao_de_volatilidade
                }
                if decision_intelligence.get("condicoes_execucao") else None
            ),
            "sizing_institucional": (
                [
                    {
                        "ativo": sizing.ativo,
                        "sizing": sizing.sizing,
                        "justificativa": sizing.justificativa
                    }
                    for sizing in decision_intelligence["sizing_institucional"]
                ]
                if decision_intelligence.get("sizing_institucional") else None
            ),
            "risco_primario": (
                {
                    "evento_de_risco": decision_intelligence["risco_primario"].evento_de_risco,
                    "impacto_esperado": decision_intelligence["risco_primario"].impacto_esperado,
                    "ativos_mais_afetados": decision_intelligence["risco_primario"].ativos_mais_afetados,
                    "janela_temporal": decision_intelligence["risco_primario"].janela_temporal
                }
                if decision_intelligence.get("risco_primario") else None
            ),
            # Fase 5 - Monitoramento Adaptativo
            "alertas_adaptativos": (
                [
                    {
                        "tipo": alerta.tipo,
                        "severidade": alerta.severidade,
                        "descricao": alerta.descricao,
                        "ativos_afetados": alerta.ativos_afetados,
                        "gatilho_detectado": alerta.gatilho_detectado,
                        "janela_temporal": alerta.janela_temporal
                    }
                    for alerta in decision_intelligence["alertas_adaptativos"]
                ]
                if decision_intelligence.get("alertas_adaptativos") else None
            ),
            "monitoramento_cenario": (
                {
                    "status_cenario_base": decision_intelligence["monitoramento_cenario"].status_cenario_base,
                    "motivo_resumido": decision_intelligence["monitoramento_cenario"].motivo_resumido,
                    "ultimo_check": decision_intelligence["monitoramento_cenario"].ultimo_check
                }
                if decision_intelligence.get("monitoramento_cenario") else None
            ),
        }
    
    # ========================================================================
    # STEP 3: GENERATE JSON OUTPUT
    # ========================================================================
    
    def _generate_json_output(
        self,
        validated_analysis: InstitutionalAnalysis,
        decision_intelligence: Dict
    ) -> Path:
        """
        Gera arquivo JSON de output.
        
        Args:
            validated_analysis: Análise validada
        
        Returns:
            Path: Caminho do arquivo JSON gerado
        """
        week_start = validated_analysis.week_start
        output_path = get_output_filepath(week_start)
        
        # Converter para dict
        output_data = validated_analysis.to_dict()
        
        # Adicionar campos de inteligência orientada a decisão
        if decision_intelligence.get("ativo_dominante_semana"):
            output_data["ativo_dominante_semana"] = {
                "ativo": decision_intelligence["ativo_dominante_semana"].ativo,
                "justificativa": decision_intelligence["ativo_dominante_semana"].justificativa
            }
        if decision_intelligence.get("ativos_correlacionados_semana"):
            output_data["ativos_correlacionados_semana"] = [
                {
                    "ativo": asset.ativo,
                    "justificativa": asset.justificativa
                }
                for asset in decision_intelligence["ativos_correlacionados_semana"]
            ]
        if decision_intelligence.get("direcionamento_semanal"):
            output_data["direcionamento_semanal"] = decision_intelligence["direcionamento_semanal"]
        if decision_intelligence.get("interpretacao_narrativa_ativo"):
            output_data["interpretacao_narrativa_ativo"] = decision_intelligence["interpretacao_narrativa_ativo"]
        if decision_intelligence.get("fluxo_risco"):
            output_data["fluxo_risco"] = {
                "classificacao": decision_intelligence["fluxo_risco"].classificacao,
                "ativos_migracao": decision_intelligence["fluxo_risco"].ativos_migracao,
                "justificativa": decision_intelligence["fluxo_risco"].justificativa
            }
        # Fase 3 - Controle Institucional
        if decision_intelligence.get("cenario_base"):
            output_data["cenario_base"] = {
                "direcao": decision_intelligence["cenario_base"].direcao,
                "ativos_beneficiados": decision_intelligence["cenario_base"].ativos_beneficiados,
                "justificativa": decision_intelligence["cenario_base"].justificativa
            }
        if decision_intelligence.get("cenario_alternativo"):
            output_data["cenario_alternativo"] = {
                "condicao_ativacao": decision_intelligence["cenario_alternativo"].condicao_ativacao,
                "ativos_beneficiados": decision_intelligence["cenario_alternativo"].ativos_beneficiados,
                "justificativa": decision_intelligence["cenario_alternativo"].justificativa
            }
        if decision_intelligence.get("zona_ruido"):
            output_data["zona_ruido"] = {
                "condicoes": decision_intelligence["zona_ruido"].condicoes,
                "ativos_evitar": decision_intelligence["zona_ruido"].ativos_evitar,
                "justificativa": decision_intelligence["zona_ruido"].justificativa
            }
        if decision_intelligence.get("distribuicao_probabilidades"):
            output_data["distribuicao_probabilidades"] = {
                "cenario_base": decision_intelligence["distribuicao_probabilidades"].cenario_base,
                "cenario_alternativo": decision_intelligence["distribuicao_probabilidades"].cenario_alternativo,
                "ruido": decision_intelligence["distribuicao_probabilidades"].ruido
            }
        # Fase 4 - Decisão Acionável
        if decision_intelligence.get("mapa_conviccao"):
            output_data["mapa_conviccao"] = [
                {
                    "ativo": conv.ativo,
                    "conviccao": conv.conviccao,
                    "motivo_resumido": conv.motivo_resumido
                }
                for conv in decision_intelligence["mapa_conviccao"]
            ]
        if decision_intelligence.get("condicoes_execucao"):
            output_data["condicoes_execucao"] = {
                "condicao_macro": decision_intelligence["condicoes_execucao"].condicao_macro,
                "condicao_de_preco": decision_intelligence["condicoes_execucao"].condicao_de_preco,
                "condicao_de_volatilidade": decision_intelligence["condicoes_execucao"].condicao_de_volatilidade
            }
        if decision_intelligence.get("sizing_institucional"):
            output_data["sizing_institucional"] = [
                {
                    "ativo": sizing.ativo,
                    "sizing": sizing.sizing,
                    "justificativa": sizing.justificativa
                }
                for sizing in decision_intelligence["sizing_institucional"]
            ]
        if decision_intelligence.get("risco_primario"):
            output_data["risco_primario"] = {
                "evento_de_risco": decision_intelligence["risco_primario"].evento_de_risco,
                "impacto_esperado": decision_intelligence["risco_primario"].impacto_esperado,
                "ativos_mais_afetados": decision_intelligence["risco_primario"].ativos_mais_afetados,
                "janela_temporal": decision_intelligence["risco_primario"].janela_temporal
            }
        # Fase 5 - Monitoramento Adaptativo
        if decision_intelligence.get("alertas_adaptativos"):
            output_data["alertas_adaptativos"] = [
                {
                    "tipo": alerta.tipo,
                    "severidade": alerta.severidade,
                    "descricao": alerta.descricao,
                    "ativos_afetados": alerta.ativos_afetados,
                    "gatilho_detectado": alerta.gatilho_detectado,
                    "janela_temporal": alerta.janela_temporal
                }
                for alerta in decision_intelligence["alertas_adaptativos"]
            ]
        if decision_intelligence.get("monitoramento_cenario"):
            output_data["monitoramento_cenario"] = {
                "status_cenario_base": decision_intelligence["monitoramento_cenario"].status_cenario_base,
                "motivo_resumido": decision_intelligence["monitoramento_cenario"].motivo_resumido,
                "ultimo_check": decision_intelligence["monitoramento_cenario"].ultimo_check
            }
        
        # Salvar JSON
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(output_data, f, indent=2, ensure_ascii=False)
        
        return output_path
    
    # ========================================================================
    # CONVENIENCE METHODS
    # ========================================================================
    
    def process_from_markdown_content(
        self,
        markdown_content: str,
        week_start: date,
        force_update: bool = False
    ) -> Tuple[bool, Dict]:
        """
        Processa análise a partir de conteúdo markdown (sem arquivo).
        
        Útil para integração com ETAPA 4 (Orquestração Autônoma).
        
        Args:
            markdown_content: Conteúdo markdown
            week_start: Data de início da semana
            force_update: Se True, permite sobrescrever
        
        Returns:
            Tuple[bool, Dict]: (success, result_info)
        """
        # Criar arquivo temporário
        temp_filename = f"temp_analysis_{week_start.strftime('%Y%m%d')}.md"
        temp_path = self.output_dir / temp_filename
        
        try:
            # Escrever conteúdo temporário
            temp_path.write_text(markdown_content, encoding='utf-8')
            
            # Processar
            success, result = self.process_analysis(
                markdown_path=str(temp_path),
                force_update=force_update
            )
            
            return success, result
        
        finally:
            # Limpar arquivo temporário
            if temp_path.exists():
                temp_path.unlink()
    
    def get_analysis_status(self, week_start: date) -> Dict:
        """
        Verifica status de uma análise.
        
        Args:
            week_start: Data de início da semana
        
        Returns:
            Dict: Status da análise
        """
        analysis = self.repository.get_by_week_start(week_start)
        
        if not analysis:
            return {
                "exists": False,
                "week_start": week_start.isoformat(),
            }
        
        return {
            "exists": True,
            "week_start": analysis["week_start"].isoformat(),
            "week_end": analysis["week_end"].isoformat(),
            "is_frozen": analysis["is_frozen"],
            "generated_at": analysis["generated_at"].isoformat(),
            "analyst": analysis["analyst"],
        }


# ============================================================================
# FACTORY FUNCTION
# ============================================================================

def get_integration() -> MacroAnalysisIntegration:
    """
    Factory para criar instância de MacroAnalysisIntegration.
    
    Returns:
        MacroAnalysisIntegration: Instância configurada
    
    Example:
        >>> integration = get_integration()
        >>> success, info = integration.process_analysis("analysis.md")
    """
    return MacroAnalysisIntegration()


# ============================================================================
# CLI USAGE (para execução standalone)
# ============================================================================

def main():
    """
    Função principal para uso CLI.
    
    Example:
        python -m macro_analysis.integration path/to/analysis.md
    """
    import sys
    
    if len(sys.argv) < 2:
        print("Uso: python -m macro_analysis.integration <markdown_path>")
        print("     python -m macro_analysis.integration <markdown_path> --force")
        sys.exit(1)
    
    markdown_path = sys.argv[1]
    force_update = "--force" in sys.argv
    
    # Processar
    integration = get_integration()
    success, result = integration.process_analysis(
        markdown_path=markdown_path,
        force_update=force_update
    )
    
    # Output
    if success:
        print("✅ Análise processada com sucesso!")
        print(f"   Week: {result['week_start']} - {result['week_end']}")
        print(f"   Record ID: {result['record_id']}")
        print(f"   Output: {result['output_file']}")
    else:
        print("❌ Falha ao processar análise")
        print(f"   Erros: {', '.join(result['errors'])}")
        sys.exit(1)


if __name__ == "__main__":
    main()