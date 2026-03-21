# ETAPA 7.2 — NOVO ARQUIVO (NÃO EXISTIA ANTES)
"""
MRKT Edge — Macro Analysis API Handlers

Implementação concreta da interface MacroAnalysisAPI.

Responsabilidades:
- Implementar operações definidas em interface.py
- Acessar repository para recuperar dados
- Formatar respostas para frontend
- Tratar erros e edge cases

Padrão de Design:
- Implementa MacroAnalysisAPI protocol
- Usa MacroAnalysisRepository para acesso a dados
- Retorna dados estruturados (JSON-serializable)

Conformidade:
- Frontend mode: Read-only (ETAPA 6)
- Todas as operações são read-only
- Zero operações de escrita via API
"""

from datetime import date
from typing import Dict, List, Optional

from ..database.repository import (
    MacroAnalysisRepository,
    AnalysisNotFoundError,
)
from ..database.adapter import get_database_adapter
from .interface import (
    MacroAnalysisAPI,
    validate_week_start,
    validate_limit,
    validate_offset,
)
from analysis.weekly_macro_narrative import (
    generate_weekly_narrative_assets,
)


# ============================================================================
# HANDLER IMPLEMENTATION
# ============================================================================

class MacroAnalysisHandler:
    """
    Handler concreto para operações de API.
    
    Implementa MacroAnalysisAPI protocol.
    Frontend consome via esta classe.
    """
    
    def __init__(self, repository: Optional[MacroAnalysisRepository] = None):
        """
        Inicializa handler.
        
        Args:
            repository: Instância de MacroAnalysisRepository
                       Se None, cria nova instância com adapter padrão
        """
        if repository is None:
            # Criar repository com adapter padrão
            adapter = get_database_adapter()
            self.repository = MacroAnalysisRepository(db_adapter=adapter)
        else:
            self.repository = repository
    
    # ========================================================================
    # GET ANALYSIS
    # ========================================================================
    
    def get_analysis(self, week_start: date) -> Optional[Dict]:
        """
        Recupera análise institucional de semana específica.
        
        Args:
            week_start: Data de início da semana
        
        Returns:
            Dict: Análise completa estruturada, ou None se não encontrada
        
        Raises:
            ValueError: Se week_start inválido
        """
        # Validar input
        if not validate_week_start(week_start):
            raise ValueError(f"week_start inválido: {week_start}. Use objeto date.")
        
        # Recuperar do repository
        analysis = self.repository.get_by_week_start(week_start)
        
        if not analysis:
            return None
        
        # Formatar resposta
        return self._format_analysis_response(analysis)
    
    # ========================================================================
    # GET LATEST
    # ========================================================================
    
    def get_latest(self) -> Optional[Dict]:
        """
        Recupera análise institucional mais recente.
        
        Returns:
            Dict: Análise completa (mesma estrutura de get_analysis)
                  ou None se não houver análises
        """
        # Recuperar do repository
        analysis = self.repository.get_latest()
        
        if not analysis:
            return None
        
        # Formatar resposta
        return self._format_analysis_response(analysis)
    
    # ========================================================================
    # LIST ANALYSES
    # ========================================================================
    
    def list_analyses(
        self, 
        limit: int = 10, 
        offset: int = 0
    ) -> List[Dict]:
        """
        Lista análises disponíveis (metadata apenas).
        
        Args:
            limit: Número máximo de resultados (padrão: 10, max: 100)
            offset: Offset para paginação (padrão: 0)
        
        Returns:
            List[Dict]: Lista de metadata de análises
        
        Raises:
            ValueError: Se limit ou offset inválidos
        """
        # Validar inputs
        if not validate_limit(limit, max_limit=100):
            raise ValueError(f"limit inválido: {limit}. Use valor entre 1 e 100.")
        
        if not validate_offset(offset):
            raise ValueError(f"offset inválido: {offset}. Use valor >= 0.")
        
        # Recuperar do repository
        analyses = self.repository.list_analyses(
            limit=limit,
            offset=offset,
            order="DESC"  # Mais recentes primeiro
        )
        
        # Formatar respostas (metadata apenas)
        return [self._format_metadata_response(a) for a in analyses]
    
    def get_total_count(self) -> int:
        """Retorna o total de análises (para paginação)."""
        return self.repository.count_analyses()
    
    # ========================================================================
    # IS FROZEN
    # ========================================================================
    
    def is_frozen(self, week_start: date) -> bool:
        """
        Verifica se análise está congelada (imutável).
        
        Args:
            week_start: Data de início da semana
        
        Returns:
            bool: True se congelada, False se mutável
        
        Raises:
            ValueError: Se week_start inválido ou análise não existir
        """
        # Validar input
        if not validate_week_start(week_start):
            raise ValueError(f"week_start inválido: {week_start}. Use objeto date.")
        
        # Verificar no repository
        try:
            return self.repository.is_frozen(week_start)
        except AnalysisNotFoundError as e:
            raise ValueError(str(e))
    
    # ========================================================================
    # GET SUMMARY
    # ========================================================================
    
    def get_summary(self) -> Dict:
        """
        Retorna resumo estatístico do sistema.
        
        Returns:
            Dict: Estatísticas e metadata
        """
        # Total de análises
        total = self.repository.count_analyses()
        
        # Mais recente
        latest = self.repository.get_latest()
        latest_week_start = latest["week_start"].isoformat() if latest else None
        
        # Mais antiga (primeiro registro)
        oldest_list = self.repository.list_analyses(limit=1, order="ASC")
        oldest_week_start = oldest_list[0]["week_start"].isoformat() if oldest_list else None
        
        # Contar frozen vs mutable
        all_analyses = self.repository.list_analyses(limit=total, order="DESC")
        frozen_count = sum(1 for a in all_analyses if a["is_frozen"])
        mutable_count = total - frozen_count
        
        return {
            "total_analyses": total,
            "latest_week_start": latest_week_start,
            "oldest_week_start": oldest_week_start,
            "frozen_count": frozen_count,
            "mutable_count": mutable_count,
        }
    
    # ========================================================================
    # HELPERS - RESPONSE FORMATTING
    # ========================================================================
    
    def _format_analysis_response(self, analysis: Dict) -> Dict:
        """
        Formata análise completa para resposta de API.
        
        Args:
            analysis: Análise raw do repository
        
        Returns:
            Dict: Análise formatada para frontend
        """
        return {
            "metadata": {
                "week_start": analysis["week_start"].isoformat(),
                "week_end": analysis["week_end"].isoformat(),
                "generated_at": analysis["generated_at"].isoformat(),
                "analyst": analysis["analyst"],
                "source": analysis["source"],
                "is_frozen": analysis["is_frozen"],
                "created_at": analysis["created_at"].isoformat(),
                "updated_at": analysis["updated_at"].isoformat(),
            },
            "panorama_macro": self._format_regional_overview(analysis.get("regional_overview")),
            "macro_overview": self._build_macro_overview(
                analysis.get("narrative", ""),
                analysis.get("regional_overview", []),
                week_start=analysis.get("week_start"),
                week_end=analysis.get("week_end"),
            ),
            "interpretacao_narrativa": self._format_narrative(analysis.get("narrative")),
            "conclusao_operacional": analysis.get("conclusion") or "",
            "ativos": self._ensure_assets_array(analysis.get("assets")),
            "notas_adicionais": analysis.get("additional_notes"),
            "ativos_da_semana": self._load_ativos_da_semana_editorial(
                analysis.get("week_start"),
                analysis.get("week_end"),
            ),
            "direcionamento_semanal": analysis.get("direcionamento_semanal"),
            "interpretacao_narrativa_ativo": analysis.get("interpretacao_narrativa_ativo"),
            "fluxo_risco": analysis.get("fluxo_risco"),
            "cenario_base": analysis.get("cenario_base"),
            "cenario_alternativo": analysis.get("cenario_alternativo"),
            "zona_ruido": analysis.get("zona_ruido"),
            "distribuicao_probabilidades": analysis.get("distribuicao_probabilidades"),
            "mapa_conviccao": analysis.get("mapa_conviccao"),
            "condicoes_execucao": analysis.get("condicoes_execucao"),
            "sizing_institucional": analysis.get("sizing_institucional"),
            "risco_primario": analysis.get("risco_primario"),
            # Fase 5 - Monitoramento Adaptativo REMOVIDO
            # "alertas_adaptativos": analysis.get("alertas_adaptativos"),
            # "monitoramento_cenario": analysis.get("monitoramento_cenario"),
        }
    
    def _format_regional_overview(self, regional_overview) -> Dict:
        """
        Formata regional_overview para o formato esperado pelo frontend.
        
        Args:
            regional_overview: Pode ser dict ou lista de dicts
        
        Returns:
            Dict com chaves "Américas", "Europa", "Ásia-Pacífico"
        """
        if not regional_overview:
            return {}
        
        # Se já é um dict com as chaves corretas, retornar
        if isinstance(regional_overview, dict):
            # Verificar se já tem as chaves esperadas
            if "Américas" in regional_overview or "Europa" in regional_overview or "Ásia-Pacífico" in regional_overview:
                return regional_overview
            # Se for um dict vazio ou com estrutura diferente, retornar vazio
            # (será preenchido pelo execute_weekly_update.py)
            return {}
        
        # Se é uma lista de dicts (formato do schema)
        if isinstance(regional_overview, list):
            result = {}
            for item in regional_overview:
                if isinstance(item, dict):
                    region = item.get("region") or item.get("key")
                    content = item.get("content") or item.get("value")
                    if region and content:
                        result[region] = content
            return result
        
        return {}
    
    def _format_narrative(self, narrative) -> Dict:
        """
        Formata narrative para o formato esperado pelo frontend.
        Garante que sempre retorna um objeto válido, mesmo quando narrative está vazio.
        """
        if not narrative:
            return {}
        
        # Se já é um dict, retornar
        if isinstance(narrative, dict):
            return narrative
        
        # Se é string, tentar parsear como JSON ou retornar objeto vazio
        if isinstance(narrative, str):
            try:
                import json
                parsed = json.loads(narrative)
                if isinstance(parsed, dict):
                    return parsed
            except:
                pass
            # Se não conseguiu parsear, retornar objeto vazio
            return {}
        
        return {}
    
    def _ensure_assets_array(self, assets) -> List:
        """
        Garante que assets sempre seja uma lista válida.
        Nunca retorna None, undefined ou lista vazia sem fallback.
        """
        if not assets:
            return []
        
        if isinstance(assets, list):
            return assets
        
        # Se for dict ou outro tipo, tentar converter
        if isinstance(assets, dict):
            # Se for dict com lista dentro, extrair
            if "assets" in assets:
                return assets["assets"] if isinstance(assets["assets"], list) else []
            return []
        
        return []
    
    def _ensure_at_least_one_highlighted_asset(
        self,
        ativo_dominante: Optional[Dict],
        ativos_correlacionados: Optional[List[Dict]],
        narrative_text: str = "",
        regional_overview: List[Dict] = None,
    ) -> Dict:
        """
        Garante que sempre há ≥1 ativo em destaque.
        Se ativo_dominante está vazio, usa weekly_macro_narrative para gerar.
        """
        # Se já temos ativo dominante válido, retornar
        if ativo_dominante and isinstance(ativo_dominante, dict) and ativo_dominante.get("ativo"):
            return ativo_dominante
        
        # Se temos correlacionados, usar o primeiro como dominante
        if ativos_correlacionados and isinstance(ativos_correlacionados, list) and len(ativos_correlacionados) > 0:
            first = ativos_correlacionados[0]
            if isinstance(first, dict) and first.get("ativo"):
                return {"ativo": first["ativo"], "justificativa": first.get("justificativa", "")}
        
        # Fallback: gerar via weekly_macro_narrative
        # Converter regional_overview para lista se necessário
        ro_list = []
        if regional_overview:
            if isinstance(regional_overview, list):
                ro_list = regional_overview
            elif isinstance(regional_overview, dict):
                ro_list = [{"region": k, "content": v} for k, v in regional_overview.items() if v]
        
        narrative_result = generate_weekly_narrative_assets(
            narrative_text=narrative_text,
            regional_overview=ro_list,
            dominant_themes=[],
        )
        highlighted = narrative_result.get("ativos_em_destaque") or []
        if highlighted:
            return {
                "ativo": highlighted[0],
                "justificativa": "Ativo relacionado ao contexto macro da semana.",
            }
        
        # Último fallback: sempre retornar ≥1 ativo
        return {"ativo": "DXY", "justificativa": "Índice Dólar como referência macro."}
    
    def _ensure_at_least_one_highlighted_asset_with_precedence(
        self,
        ativo_dominante: Optional[Dict],
        ativos_correlacionados: Optional[List[Dict]],
        narrative_text: str = "",
        regional_overview: List[Dict] = None,
    ) -> Dict:
        """
        Garante ≥1 ativo em destaque e aplica precedência defensiva quando regime é DEFENSIVE.
        Wrapper sobre _ensure_at_least_one_highlighted_asset que aplica precedência macro.
        """
        # Obter ativo dominante usando método original
        result = self._ensure_at_least_one_highlighted_asset(
            ativo_dominante,
            ativos_correlacionados,
            narrative_text,
            regional_overview,
        )
        
        # Precedência defensiva removida - violava princípio print-driven
        # Manter ordem original determinística sem inferência
        return result
    
    def _apply_precedence_to_correlated_assets(
        self,
        ativos_correlacionados: Optional[List[Dict]],
        narrative_text: str = "",
    ) -> Optional[List[Dict]]:
        """
        Precedência removida - violava princípio print-driven.
        Retorna lista original sem reordenação baseada em inferência.
        """
        if not ativos_correlacionados or not isinstance(ativos_correlacionados, list):
            return ativos_correlacionados
        
        # Retornar ordem original (determinística)
        return ativos_correlacionados
    
    def _load_ativos_da_semana_editorial(
        self,
        week_start: Optional[date] = None,
        week_end: Optional[date] = None,
    ) -> Dict:
        """
        Carrega "Ativos da Semana" da config editorial.
        Lista de monitoramento editorial/manual com guardrails de realismo.
        
        Args:
            week_start: Data de início da semana
            week_end: Data de fim da semana
        
        Returns:
            {
                "status": "ok" | "unavailable",
                "reason": str (se unavailable),
                "ftmo_snapshot_date": str (se ok),
                "items": List[Dict] (sem scenario_role, sem confidence_editorial),
                "fallback": Dict,
            }
        """
        from config.ativos_da_semana_editorial import load_ativos_da_semana_config
        from utils.event_identity import get_week_key
        
        # Determinar week_key
        if week_start and week_end:
            week_key = get_week_key(
                week_start.isoformat() if isinstance(week_start, date) else str(week_start),
                week_end.isoformat() if isinstance(week_end, date) else str(week_end),
            )
        else:
            # Fallback: usar semana fixa padrão
            week_key = get_week_key("2026-01-25", "2026-01-31")
        
        # Carregar config editorial
        config_result = load_ativos_da_semana_config(week_key)
        
        # Retornar formato para frontend (sem _internal)
        return {
            "status": config_result["status"],
            "reason": config_result.get("reason"),
            "ftmo_snapshot_date": config_result.get("ftmo_snapshot_date"),
            "items": config_result.get("items", []),
            "fallback": config_result.get("fallback", {"symbol": "DXY", "label": "Dólar (DXY)", "context": "Fallback institucional."}),
        }
    
    def _ensure_correlated_assets_array(self, assets: Optional[List[Dict]]) -> List[Dict]:
        """
        DEPRECATED: Mantido para compatibilidade temporária.
        Use _load_featured_assets_editorial em vez disso.
        """
        if not assets:
            return []
        
        if isinstance(assets, list):
            return assets
        
        return []
    
    def _build_macro_overview(
        self,
        narrative_text: str = "",
        regional_overview: List[Dict] = None,
        week_start: Optional[date] = None,
        week_end: Optional[date] = None,
    ) -> Dict:
        """
        Constrói macro_overview sempre presente com status, summary, themes e macro_regime.
        Nenhuma chave pode ser undefined. Sempre retorna objeto válido.
        Se dados não disponíveis, retorna status="unavailable" com reason explícito.
        """
        import logging
        logger = logging.getLogger(__name__)
        
        # Verificar se há dados disponíveis
        has_narrative = narrative_text and isinstance(narrative_text, str) and narrative_text.strip()
        has_regional = regional_overview and (
            (isinstance(regional_overview, list) and len(regional_overview) > 0) or
            (isinstance(regional_overview, dict) and len(regional_overview) > 0)
        )
        
        # Se não há dados disponíveis, retornar estado unavailable
        if not has_narrative and not has_regional:
            logger.warning("macro_overview: dados indisponíveis - narrative_text vazio e regional_overview vazio")
            return {
                "status": "unavailable",
                "reason": "fonte indisponível - print não coletado ou narrativa não gerada",
                "summary": "",
                "themes": [],
                "macro_regime": None,  # Não inferir regime - deve ser manual/editorial
                "regime_source": None,
            }
        
        # Gerar narrativa macro semanal para extrair themes e regime
        ro_list = []
        if regional_overview:
            if isinstance(regional_overview, list):
                ro_list = regional_overview
            elif isinstance(regional_overview, dict):
                ro_list = [{"region": k, "content": v} for k, v in regional_overview.items() if v]
        
        try:
            raw_macro = generate_weekly_narrative_assets(
                narrative_text=narrative_text or "",
                regional_overview=ro_list,
                dominant_themes=[],
            ) or {}
        except Exception as e:
            logger.error(f"macro_overview: erro ao gerar narrativa macro - {str(e)}", exc_info=True)
            return {
                "status": "unavailable",
                "reason": f"erro ao processar narrativa macro: {str(e)}",
                "summary": "",
                "themes": [],
                "macro_regime": None,  # Não inferir regime
                "regime_source": None,
            }
        
        # Extrair summary da narrativa (primeiras linhas ou texto padrão)
        summary = ""
        if has_narrative:
            # Usar primeiras 300 caracteres como summary
            summary = narrative_text[:300].strip()
            if len(narrative_text) > 300:
                summary += "..."
        else:
            # Se não há narrativa, não inventar conteúdo
            summary = ""
        
        # Extrair themes
        themes = raw_macro.get("temas_dominantes", [])
        if not themes or not isinstance(themes, list):
            themes = []
        
        # Obter regime macro manual/editorial (PASSO 3: sem inferência)
        from config.week_regime_config import get_regime_for_week, get_regime_source
        from utils.event_identity import get_week_key
        
        # Tentar determinar week_key da análise (se disponível)
        week_key = None
        # Se não houver week_key explícito, usar semana fixa padrão
        week_key = get_week_key("2026-01-25", "2026-01-31")
        
        macro_regime = get_regime_for_week(week_key)
        regime_source = get_regime_source() if macro_regime else None
        
        # Determinar status
        if has_narrative or len(themes) > 0:
            status = "ok"
        elif has_regional:
            status = "partial"
        else:
            status = "unavailable"
        
        result = {
            "status": status,
            "reason": "" if status == "ok" else ("dados parciais disponíveis" if status == "partial" else "fonte indisponível - print não coletado ou narrativa não gerada"),
            "summary": str(summary),
            "themes": list(themes),
        }
        
        # Adicionar regime apenas se configurado manualmente
        if macro_regime:
            result["macro_regime"] = str(macro_regime)
            result["regime_source"] = regime_source
        else:
            # Não incluir macro_regime se não configurado (não inferir)
            result["macro_regime"] = None
            result["regime_source"] = None
        
        return result
    
    def _format_metadata_response(self, analysis: Dict) -> Dict:
        """
        Formata metadata de análise (sem conteúdo completo).
        
        Args:
            analysis: Análise raw do repository
        
        Returns:
            Dict: Metadata formatada
        """
        return {
            "week_start": analysis["week_start"].isoformat(),
            "week_end": analysis["week_end"].isoformat(),
            "generated_at": analysis["generated_at"].isoformat(),
            "analyst": analysis["analyst"],
            "source": analysis["source"],
            "is_frozen": analysis["is_frozen"],
        }
    
    # ========================================================================
    # ADDITIONAL HELPERS
    # ========================================================================
    
    def get_analysis_by_id(self, record_id: int) -> Optional[Dict]:
        """
        Recupera análise por ID (interno, não exposto via API principal).
        
        Args:
            record_id: ID do registro
        
        Returns:
            Dict: Análise completa ou None
        """
        analysis = self.repository.get_by_id(record_id)
        
        if not analysis:
            return None
        
        return self._format_analysis_response(analysis)
    
    def get_analyses_by_date_range(
        self,
        start_date: date,
        end_date: date
    ) -> List[Dict]:
        """
        Recupera análises dentro de um range de datas.
        
        Note:
            Implementação simplificada. Para produção, considerar
            adicionar filtro de range no repository.
        
        Args:
            start_date: Data inicial
            end_date: Data final
        
        Returns:
            List[Dict]: Lista de análises no range
        """
        # Recuperar todas e filtrar
        # (não otimizado, mas funcional para MVP)
        all_analyses = self.repository.list_analyses(limit=100, order="DESC")
        
        filtered = [
            a for a in all_analyses
            if start_date <= a["week_start"] <= end_date
        ]
        
        return [self._format_analysis_response(a) for a in filtered]


# ============================================================================
# FACTORY FUNCTION
# ============================================================================

def get_macro_analysis_handler(
    repository: Optional[MacroAnalysisRepository] = None
) -> MacroAnalysisHandler:
    """
    Factory para criar instância de MacroAnalysisHandler.
    
    Args:
        repository: Instância de repository (opcional)
    
    Returns:
        MacroAnalysisHandler: Handler configurado
    
    Example:
        >>> handler = get_macro_analysis_handler()
        >>> latest = handler.get_latest()
    """
    return MacroAnalysisHandler(repository=repository)


# ============================================================================
# CONVENIENCE FUNCTIONS (para uso direto)
# ============================================================================

# Instância global (singleton pattern)
_default_handler: Optional[MacroAnalysisHandler] = None


def get_default_handler() -> MacroAnalysisHandler:
    """
    Retorna handler padrão (singleton).
    
    Útil para uso rápido sem configuração.
    
    Returns:
        MacroAnalysisHandler: Instância singleton
    """
    global _default_handler
    
    if _default_handler is None:
        _default_handler = get_macro_analysis_handler()
    
    return _default_handler


# Convenience functions usando handler padrão
def get_latest_analysis() -> Optional[Dict]:
    """Shortcut para get_latest() usando handler padrão"""
    return get_default_handler().get_latest()


def get_analysis_for_week(week_start: date) -> Optional[Dict]:
    """Shortcut para get_analysis() usando handler padrão"""
    return get_default_handler().get_analysis(week_start)


def list_all_analyses(limit: int = 10) -> List[Dict]:
    """Shortcut para list_analyses() usando handler padrão"""
    return get_default_handler().list_analyses(limit=limit)