# ETAPA 7.2 — NOVO ARQUIVO (NÃO EXISTIA ANTES)
"""
MRKT Edge — Macro Analysis Repository

CRUD operations para análise institucional.

Responsabilidades:
- Create: Criar nova análise institucional
- Read: Recuperar análises (por week_start, latest, list)
- Update: Atualizar análise existente (respeitando mutabilidade)
- Delete: Não implementado (análises não devem ser deletadas)

Regras de Negócio:
- Apenas 1 análise por week_start (unique constraint)
- Análise mutável durante a semana (is_frozen=False)
- Análise imutável após week_end (is_frozen=True)
- Update bloqueado se is_frozen=True

Integração:
- Usa adapter.py para acessar backend/database.py
- Não modifica código existente
- Adiciona apenas lógica específica de macro_analysis

Conformidade:
- Cláusula de Preservação de Código (ATIVA)
- Zero modificação em arquivos existentes
"""

import json
from datetime import date, datetime
from typing import Dict, List, Optional, Tuple

from .models import TABLE_NAME, validate_week_start, validate_is_frozen
from ..config import is_week_frozen, get_week_end


# ============================================================================
# EXCEPTIONS
# ============================================================================

class RepositoryError(Exception):
    """Erro base do repository"""
    pass


class AnalysisNotFoundError(RepositoryError):
    """Análise não encontrada"""
    pass


class AnalysisFrozenError(RepositoryError):
    """Tentativa de modificar análise congelada"""
    pass


class DuplicateAnalysisError(RepositoryError):
    """Análise já existe para essa week_start"""
    pass


class InvalidDataError(RepositoryError):
    """Dados inválidos fornecidos"""
    pass


# ============================================================================
# REPOSITORY CLASS
# ============================================================================

class MacroAnalysisRepository:
    """
    Repository para operações CRUD de análise institucional.
    
    Usa adapter para integração com backend/database.py existente.
    """
    
    def __init__(self, db_adapter):
        """
        Inicializa repository com database adapter.
        
        Args:
            db_adapter: Instância de DatabaseAdapter (adapter.py)
        """
        self.db = db_adapter
        self.table_name = TABLE_NAME
    
    # ========================================================================
    # CREATE
    # ========================================================================
    
    def create(self, analysis_data: Dict) -> int:
        """
        Cria nova análise institucional.
        
        Args:
            analysis_data: Dict com dados da análise (estrutura validada)
        
        Returns:
            int: ID do registro criado
        
        Raises:
            DuplicateAnalysisError: Se já existe análise para week_start
            InvalidDataError: Se dados inválidos
        
        Example:
            >>> repo.create({
            ...     "week_start": date(2026, 1, 4),
            ...     "week_end": date(2026, 1, 10),
            ...     "generated_at": date.today(),
            ...     "analyst": "Sistema MRKT Edge",
            ...     "source": "Trading Economics",
            ...     "regional_overview": {...},
            ...     "narrative": {...},
            ...     "conclusion": {...},
            ...     "assets": [...],
            ...     "additional_notes": "...",
            ... })
            1
        """
        # Validar week_start
        week_start = analysis_data.get("week_start")
        if not week_start or not validate_week_start(week_start):
            raise InvalidDataError(f"week_start inválido: {week_start}")
        
        # Verificar se já existe
        existing = self.get_by_week_start(week_start)
        if existing:
            raise DuplicateAnalysisError(
                f"Análise já existe para week_start={week_start}. "
                f"Use update() para modificar."
            )
        
        # Calcular is_frozen baseado em week_end
        week_end = analysis_data.get("week_end")
        is_frozen_value = is_week_frozen(week_end)
        
        # Preparar dados para insert
        insert_data = {
            "week_start": week_start.isoformat(),
            "week_end": week_end.isoformat(),
            "generated_at": analysis_data["generated_at"].isoformat(),
            "analyst": analysis_data["analyst"],
            "source": analysis_data["source"],
            "regional_overview": json.dumps(analysis_data["regional_overview"], ensure_ascii=False),
            "narrative": json.dumps(analysis_data["narrative"], ensure_ascii=False),
            "conclusion": json.dumps(analysis_data["conclusion"], ensure_ascii=False),
            "assets": json.dumps(analysis_data["assets"], ensure_ascii=False),
            "additional_notes": analysis_data.get("additional_notes"),
            "is_frozen": 1 if is_frozen_value else 0,
        }
        
        # Novos campos opcionais de inteligência orientada a decisão
        if "ativo_dominante_semana" in analysis_data and analysis_data["ativo_dominante_semana"]:
            insert_data["ativo_dominante_semana"] = json.dumps(analysis_data["ativo_dominante_semana"], ensure_ascii=False)
        if "ativos_correlacionados_semana" in analysis_data and analysis_data["ativos_correlacionados_semana"]:
            insert_data["ativos_correlacionados_semana"] = json.dumps(analysis_data["ativos_correlacionados_semana"], ensure_ascii=False)
        if "direcionamento_semanal" in analysis_data:
            insert_data["direcionamento_semanal"] = analysis_data["direcionamento_semanal"]
        if "interpretacao_narrativa_ativo" in analysis_data:
            insert_data["interpretacao_narrativa_ativo"] = analysis_data["interpretacao_narrativa_ativo"]
        if "fluxo_risco" in analysis_data and analysis_data["fluxo_risco"]:
            insert_data["fluxo_risco"] = json.dumps(analysis_data["fluxo_risco"], ensure_ascii=False)
        # Fase 3 - Controle Institucional
        if "cenario_base" in analysis_data and analysis_data["cenario_base"]:
            insert_data["cenario_base"] = json.dumps(analysis_data["cenario_base"], ensure_ascii=False)
        if "cenario_alternativo" in analysis_data and analysis_data["cenario_alternativo"]:
            insert_data["cenario_alternativo"] = json.dumps(analysis_data["cenario_alternativo"], ensure_ascii=False)
        if "zona_ruido" in analysis_data and analysis_data["zona_ruido"]:
            insert_data["zona_ruido"] = json.dumps(analysis_data["zona_ruido"], ensure_ascii=False)
        if "distribuicao_probabilidades" in analysis_data and analysis_data["distribuicao_probabilidades"]:
            insert_data["distribuicao_probabilidades"] = json.dumps(analysis_data["distribuicao_probabilidades"], ensure_ascii=False)
        # Fase 4 - Decisão Acionável
        if "mapa_conviccao" in analysis_data and analysis_data["mapa_conviccao"]:
            insert_data["mapa_conviccao"] = json.dumps(analysis_data["mapa_conviccao"], ensure_ascii=False)
        if "condicoes_execucao" in analysis_data and analysis_data["condicoes_execucao"]:
            insert_data["condicoes_execucao"] = json.dumps(analysis_data["condicoes_execucao"], ensure_ascii=False)
        if "sizing_institucional" in analysis_data and analysis_data["sizing_institucional"]:
            insert_data["sizing_institucional"] = json.dumps(analysis_data["sizing_institucional"], ensure_ascii=False)
        if "risco_primario" in analysis_data and analysis_data["risco_primario"]:
            insert_data["risco_primario"] = json.dumps(analysis_data["risco_primario"], ensure_ascii=False)
        # Fase 5 - Monitoramento Adaptativo
        if "alertas_adaptativos" in analysis_data and analysis_data["alertas_adaptativos"]:
            insert_data["alertas_adaptativos"] = json.dumps(analysis_data["alertas_adaptativos"], ensure_ascii=False)
        if "monitoramento_cenario" in analysis_data and analysis_data["monitoramento_cenario"]:
            insert_data["monitoramento_cenario"] = json.dumps(analysis_data["monitoramento_cenario"], ensure_ascii=False)
        
        # Executar insert via adapter
        record_id = self.db.insert(self.table_name, insert_data)
        
        return record_id
    
    # ========================================================================
    # READ
    # ========================================================================
    
    def get_by_id(self, record_id: int) -> Optional[Dict]:
        """
        Recupera análise por ID.
        
        Args:
            record_id: ID do registro
        
        Returns:
            Dict com dados da análise ou None se não encontrado
        """
        result = self.db.fetch_one(
            self.table_name,
            where={"id": record_id}
        )
        
        if result:
            return self._deserialize_record(result)
        
        return None
    
    def get_by_week_start(self, week_start: date) -> Optional[Dict]:
        """
        Recupera análise por week_start (chave lógica).
        
        Args:
            week_start: Data de início da semana
        
        Returns:
            Dict com dados da análise ou None se não encontrado
        """
        result = self.db.fetch_one(
            self.table_name,
            where={"week_start": week_start.isoformat()}
        )
        
        if result:
            return self._deserialize_record(result)
        
        return None
    
    def get_latest(self) -> Optional[Dict]:
        """
        Recupera análise mais recente (maior week_start).
        
        Returns:
            Dict com dados da análise ou None se não houver análises
        """
        result = self.db.fetch_one(
            self.table_name,
            order_by="week_start DESC"
        )
        
        if result:
            return self._deserialize_record(result)
        
        return None
    
    def list_analyses(
        self, 
        limit: int = 10, 
        offset: int = 0,
        order: str = "DESC"
    ) -> List[Dict]:
        """
        Lista análises disponíveis (ordenadas por week_start).
        
        Args:
            limit: Número máximo de resultados
            offset: Offset para paginação
            order: Ordem (DESC ou ASC)
        
        Returns:
            List[Dict]: Lista de análises
        """
        results = self.db.fetch_all(
            self.table_name,
            order_by=f"week_start {order}",
            limit=limit,
            offset=offset
        )
        
        return [self._deserialize_record(r) for r in results]
    
    def count_analyses(self) -> int:
        """
        Conta total de análises no banco.
        
        Returns:
            int: Total de análises
        """
        return self.db.count(self.table_name)
    
    # ========================================================================
    # UPDATE
    # ========================================================================
    
    def update(self, week_start: date, update_data: Dict) -> bool:
        """
        Atualiza análise existente (respeitando mutabilidade).
        
        Args:
            week_start: Data de início da semana (chave lógica)
            update_data: Dict com campos a atualizar
        
        Returns:
            bool: True se atualizado com sucesso
        
        Raises:
            AnalysisNotFoundError: Se análise não existir
            AnalysisFrozenError: Se análise estiver congelada
            InvalidDataError: Se dados inválidos
        """
        # Verificar se existe
        existing = self.get_by_week_start(week_start)
        if not existing:
            raise AnalysisNotFoundError(
                f"Análise não encontrada para week_start={week_start}"
            )
        
        # Verificar se está congelada
        if existing["is_frozen"]:
            raise AnalysisFrozenError(
                f"Análise para week_start={week_start} está congelada (imutável). "
                f"Não pode ser modificada após week_end."
            )
        
        # Preparar dados para update
        prepared_update = {}
        
        # Campos que podem ser atualizados
        updatable_fields = [
            "generated_at",
            "analyst",
            "source",
            "regional_overview",
            "narrative",
            "conclusion",
            "assets",
            "additional_notes",
            "ativo_dominante_semana",
            "ativos_correlacionados_semana",
            "direcionamento_semanal",
            "interpretacao_narrativa_ativo",
            "fluxo_risco",
            "cenario_base",
            "cenario_alternativo",
            "zona_ruido",
            "distribuicao_probabilidades",
            "mapa_conviccao",
            "condicoes_execucao",
            "sizing_institucional",
            "risco_primario",
            "alertas_adaptativos",
            "monitoramento_cenario",
        ]
        
        for field in updatable_fields:
            if field in update_data:
                value = update_data[field]
                
                # Serializar JSON fields
                json_fields = ["regional_overview", "narrative", "conclusion", "assets", "ativo_dominante_semana", 
                              "ativos_correlacionados_semana", "fluxo_risco", "cenario_base", "cenario_alternativo", 
                              "zona_ruido", "distribuicao_probabilidades", "mapa_conviccao", "condicoes_execucao",
                              "sizing_institucional", "risco_primario", "alertas_adaptativos", "monitoramento_cenario"]
                if field in json_fields:
                    if value is not None:
                        prepared_update[field] = json.dumps(value, ensure_ascii=False)
                    else:
                        prepared_update[field] = None
                elif field == "generated_at" and isinstance(value, date):
                    prepared_update[field] = value.isoformat()
                else:
                    prepared_update[field] = value
        
        # Recalcular is_frozen
        week_end = existing["week_end"]
        is_frozen_value = is_week_frozen(week_end)
        prepared_update["is_frozen"] = 1 if is_frozen_value else 0
        
        # Executar update via adapter
        success = self.db.update(
            self.table_name,
            data=prepared_update,
            where={"week_start": week_start.isoformat()}
        )
        
        return success
    
    # ========================================================================
    # DELETE (Não implementado propositalmente)
    # ========================================================================
    
    def delete(self, week_start: date) -> None:
        """
        Delete não implementado.
        
        Análises institucionais não devem ser deletadas (histórico).
        Para "remover" uma análise, marque como arquivada ou use outro flag.
        
        Raises:
            NotImplementedError: Sempre
        """
        raise NotImplementedError(
            "Delete de análises não é permitido. "
            "Análises devem ser preservadas para histórico."
        )
    
    # ========================================================================
    # MUTABILITY CHECKS
    # ========================================================================
    
    def is_frozen(self, week_start: date) -> bool:
        """
        Verifica se análise está congelada (imutável).
        
        Args:
            week_start: Data de início da semana
        
        Returns:
            bool: True se congelada, False se mutável
        
        Raises:
            AnalysisNotFoundError: Se análise não existir
        """
        analysis = self.get_by_week_start(week_start)
        
        if not analysis:
            raise AnalysisNotFoundError(
                f"Análise não encontrada para week_start={week_start}"
            )
        
        return analysis["is_frozen"]
    
    def freeze(self, week_start: date) -> bool:
        """
        Congela análise manualmente (força is_frozen=True).
        
        Útil para congelar análise antes do week_end se necessário.
        
        Args:
            week_start: Data de início da semana
        
        Returns:
            bool: True se congelado com sucesso
        
        Raises:
            AnalysisNotFoundError: Se análise não existir
        """
        existing = self.get_by_week_start(week_start)
        if not existing:
            raise AnalysisNotFoundError(
                f"Análise não encontrada para week_start={week_start}"
            )
        
        # Se já congelada, nada a fazer
        if existing["is_frozen"]:
            return True
        
        # Congelar
        success = self.db.update(
            self.table_name,
            data={"is_frozen": 1},
            where={"week_start": week_start.isoformat()}
        )
        
        return success
    
    # ========================================================================
    # HELPERS
    # ========================================================================
    
    def _deserialize_record(self, record: Dict) -> Dict:
        """
        Deserializa registro do banco (JSON strings → dicts/lists).
        
        Args:
            record: Registro bruto do banco
        
        Returns:
            Dict: Registro deserializado
        """
        deserialized = record.copy()
        
        # Deserializar JSON fields
        json_fields = ["regional_overview", "narrative", "conclusion", "assets", "ativo_dominante_semana", 
                      "ativos_correlacionados_semana", "fluxo_risco", "cenario_base", "cenario_alternativo", 
                      "zona_ruido", "distribuicao_probabilidades", "mapa_conviccao", "condicoes_execucao",
                      "sizing_institucional", "risco_primario", "alertas_adaptativos", "monitoramento_cenario"]
        for field in json_fields:
            if field in deserialized and deserialized[field]:
                try:
                    deserialized[field] = json.loads(deserialized[field])
                except (json.JSONDecodeError, TypeError):
                    # Se não for JSON válido, manter como está
                    pass
        
        # Converter date strings para date objects
        date_fields = ["week_start", "week_end", "generated_at"]
        for field in date_fields:
            if field in deserialized and isinstance(deserialized[field], str):
                deserialized[field] = date.fromisoformat(deserialized[field])
        
        # Converter timestamps para datetime
        timestamp_fields = ["created_at", "updated_at"]
        for field in timestamp_fields:
            if field in deserialized and isinstance(deserialized[field], str):
                deserialized[field] = datetime.fromisoformat(deserialized[field])
        
        # Converter is_frozen para bool
        if "is_frozen" in deserialized:
            deserialized["is_frozen"] = bool(deserialized["is_frozen"])
        
        return deserialized