"""
Schema Pydantic para análise institucional.
"""

from pydantic import BaseModel, Field, field_validator
from datetime import date
from typing import List, Optional, Literal


class Probability(BaseModel):
    """Probabilidades por cenário."""
    alta: Literal["Alta", "Média", "Baixa"]
    lateral: Literal["Alta", "Média", "Baixa"]
    baixa: Literal["Alta", "Média", "Baixa"]


class Asset(BaseModel):
    """Análise de ativo individual."""
    name: str
    scenario_base: Literal["Alta", "Lateral", "Baixa"]
    driver_macro: str
    probability: Probability


class RegionalOverview(BaseModel):
    """Panorama de região."""
    region: Literal["Américas", "Europa", "Ásia-Pacífico"]
    content: str


class Narrative(BaseModel):
    """Narrativa institucional."""
    politica_monetaria: str
    crescimento_economico: str
    inflacao_pressoes: str
    risco_apetite: str


class Conclusion(BaseModel):
    """Conclusão operacional."""
    sintese_semana: str
    precificacao_mercado: str


class DominantAsset(BaseModel):
    """Ativo dominante da semana."""
    ativo: str
    justificativa: str


class CorrelatedAsset(BaseModel):
    """Ativo correlacionado da semana."""
    ativo: str
    justificativa: str


class RiskFlow(BaseModel):
    """Fluxo de risco global."""
    classificacao: Literal["Risk-On", "Risk-Off", "Rotacional"]
    ativos_migracao: str
    justificativa: str


class ScenarioBase(BaseModel):
    """Cenário base da semana."""
    direcao: Literal["Bullish", "Bearish", "Neutro"]
    ativos_beneficiados: List[str]
    justificativa: str


class ScenarioAlternativo(BaseModel):
    """Cenário alternativo."""
    condicao_ativacao: str
    ativos_beneficiados: List[str]
    justificativa: str


class ZonaRuido(BaseModel):
    """Zona de ruído a evitar."""
    condicoes: str
    ativos_evitar: List[str]
    justificativa: str


class DistribuicaoProbabilidades(BaseModel):
    """Distribuição de probabilidades entre cenários."""
    cenario_base: int
    cenario_alternativo: int
    ruido: int


class MapaConviccao(BaseModel):
    """Mapa de convicção por ativo."""
    ativo: str
    conviccao: Literal["Alta", "Média", "Baixa"]
    motivo_resumido: str


class CondicoesExecucao(BaseModel):
    """Condições de execução para trading."""
    condicao_macro: str
    condicao_de_preco: str
    condicao_de_volatilidade: str


class SizingInstitucional(BaseModel):
    """Sizing institucional sugerido por ativo."""
    ativo: str
    sizing: Literal["Agressivo", "Normal", "Reduzido", "Evitar"]
    justificativa: str


class RiscoPrimario(BaseModel):
    """Risco primário (Kill Switch)."""
    evento_de_risco: str
    impacto_esperado: str
    ativos_mais_afetados: List[str]
    janela_temporal: Optional[str] = None


class AlertaAdaptativo(BaseModel):
    """Alerta adaptativo de monitoramento."""
    tipo: Literal["Enfraquecimento", "MudancaDeRegime", "AumentoDeRisco"]
    severidade: Literal["Baixa", "Media", "Alta"]
    descricao: str
    ativos_afetados: List[str] = Field(max_length=5)
    gatilho_detectado: str
    janela_temporal: Optional[str] = None


class MonitoramentoCenario(BaseModel):
    """Monitoramento do status do cenário base."""
    status_cenario_base: Literal["Estavel", "Enfraquecendo", "Invalidado"]
    motivo_resumido: str
    ultimo_check: str  # ISO timestamp


class InstitutionalAnalysis(BaseModel):
    """Análise institucional completa."""
    week_start: date
    week_end: date
    generated_at: date
    analyst: str
    source: str
    regional_overview: List[RegionalOverview] = Field(min_length=3, max_length=3)
    narrative: Narrative
    conclusion: Conclusion
    assets: List[Asset] = Field(min_length=8, max_length=8)  # 8 ativos fixos e imutáveis
    additional_notes: Optional[str] = None
    # Novos campos de inteligência orientada a decisão
    ativo_dominante_semana: Optional[DominantAsset] = None
    ativos_correlacionados_semana: Optional[List[CorrelatedAsset]] = Field(default=None, max_length=5)
    direcionamento_semanal: Optional[Literal["Bullish", "Bearish", "Neutro"]] = None
    interpretacao_narrativa_ativo: Optional[str] = None
    fluxo_risco: Optional[RiskFlow] = None
    # Fase 3 - Controle Institucional
    cenario_base: Optional[ScenarioBase] = None
    cenario_alternativo: Optional[ScenarioAlternativo] = None
    zona_ruido: Optional[ZonaRuido] = None
    distribuicao_probabilidades: Optional[DistribuicaoProbabilidades] = None
    # Fase 4 - Decisão Acionável
    mapa_conviccao: Optional[List[MapaConviccao]] = Field(default=None, max_length=10)
    condicoes_execucao: Optional[CondicoesExecucao] = None
    sizing_institucional: Optional[List[SizingInstitucional]] = Field(default=None, max_length=10)
    risco_primario: Optional[RiscoPrimario] = None
    # Fase 5 - Monitoramento Adaptativo
    alertas_adaptativos: Optional[List[AlertaAdaptativo]] = Field(default=None, max_length=3)
    monitoramento_cenario: Optional[MonitoramentoCenario] = None
    
    @field_validator('week_start')
    @classmethod
    def validate_week_start_is_sunday(cls, v):
        if v.weekday() != 6:  # 6 = domingo
            raise ValueError(f"week_start deve ser domingo, recebido {v.strftime('%A')}")
        return v
    
    def to_dict(self):
        """Converte para dict JSON-serializável."""
        return {
            "metadata": {
                "week_start": self.week_start.isoformat(),
                "week_end": self.week_end.isoformat(),
                "generated_at": self.generated_at.isoformat(),
                "analyst": self.analyst,
                "source": self.source
            },
            "panorama_macro": {
                region.region: region.content
                for region in self.regional_overview
            },
            "interpretacao_narrativa": {
                "politica_monetaria": self.narrative.politica_monetaria,
                "crescimento_economico": self.narrative.crescimento_economico,
                "inflacao_pressoes": self.narrative.inflacao_pressoes,
                "risco_apetite": self.narrative.risco_apetite
            },
            "conclusao_operacional": {
                "sintese_semana": self.conclusion.sintese_semana,
                "precificacao_mercado": self.conclusion.precificacao_mercado
            },
            "ativos": [
                {
                    "name": asset.name,
                    "scenario_base": asset.scenario_base,
                    "driver_macro": asset.driver_macro,
                    "probability": {
                        "alta": asset.probability.alta,
                        "lateral": asset.probability.lateral,
                        "baixa": asset.probability.baixa
                    }
                }
                for asset in self.assets
            ],
            "notas_adicionais": self.additional_notes,
            "ativo_dominante_semana": {
                "ativo": self.ativo_dominante_semana.ativo,
                "justificativa": self.ativo_dominante_semana.justificativa
            } if self.ativo_dominante_semana else None,
            "ativos_correlacionados_semana": [
                {
                    "ativo": asset.ativo,
                    "justificativa": asset.justificativa
                }
                for asset in self.ativos_correlacionados_semana
            ] if self.ativos_correlacionados_semana else None,
            "direcionamento_semanal": self.direcionamento_semanal,
            "interpretacao_narrativa_ativo": self.interpretacao_narrativa_ativo,
            "fluxo_risco": {
                "classificacao": self.fluxo_risco.classificacao,
                "ativos_migracao": self.fluxo_risco.ativos_migracao,
                "justificativa": self.fluxo_risco.justificativa
            } if self.fluxo_risco else None,
            "cenario_base": {
                "direcao": self.cenario_base.direcao,
                "ativos_beneficiados": self.cenario_base.ativos_beneficiados,
                "justificativa": self.cenario_base.justificativa
            } if self.cenario_base else None,
            "cenario_alternativo": {
                "condicao_ativacao": self.cenario_alternativo.condicao_ativacao,
                "ativos_beneficiados": self.cenario_alternativo.ativos_beneficiados,
                "justificativa": self.cenario_alternativo.justificativa
            } if self.cenario_alternativo else None,
            "zona_ruido": {
                "condicoes": self.zona_ruido.condicoes,
                "ativos_evitar": self.zona_ruido.ativos_evitar,
                "justificativa": self.zona_ruido.justificativa
            } if self.zona_ruido else None,
            "distribuicao_probabilidades": {
                "cenario_base": self.distribuicao_probabilidades.cenario_base,
                "cenario_alternativo": self.distribuicao_probabilidades.cenario_alternativo,
                "ruido": self.distribuicao_probabilidades.ruido
            } if self.distribuicao_probabilidades else None,
            "mapa_conviccao": [
                {
                    "ativo": conv.ativo,
                    "conviccao": conv.conviccao,
                    "motivo_resumido": conv.motivo_resumido
                }
                for conv in self.mapa_conviccao
            ] if self.mapa_conviccao else None,
            "condicoes_execucao": {
                "condicao_macro": self.condicoes_execucao.condicao_macro,
                "condicao_de_preco": self.condicoes_execucao.condicao_de_preco,
                "condicao_de_volatilidade": self.condicoes_execucao.condicao_de_volatilidade
            } if self.condicoes_execucao else None,
            "sizing_institucional": [
                {
                    "ativo": sizing.ativo,
                    "sizing": sizing.sizing,
                    "justificativa": sizing.justificativa
                }
                for sizing in self.sizing_institucional
            ] if self.sizing_institucional else None,
            "risco_primario": {
                "evento_de_risco": self.risco_primario.evento_de_risco,
                "impacto_esperado": self.risco_primario.impacto_esperado,
                "ativos_mais_afetados": self.risco_primario.ativos_mais_afetados,
                "janela_temporal": self.risco_primario.janela_temporal
            } if self.risco_primario else None,
            "alertas_adaptativos": [
                {
                    "tipo": alerta.tipo,
                    "severidade": alerta.severidade,
                    "descricao": alerta.descricao,
                    "ativos_afetados": alerta.ativos_afetados,
                    "gatilho_detectado": alerta.gatilho_detectado,
                    "janela_temporal": alerta.janela_temporal
                }
                for alerta in self.alertas_adaptativos
            ] if self.alertas_adaptativos else None,
            "monitoramento_cenario": {
                "status_cenario_base": self.monitoramento_cenario.status_cenario_base,
                "motivo_resumido": self.monitoramento_cenario.motivo_resumido,
                "ultimo_check": self.monitoramento_cenario.ultimo_check
            } if self.monitoramento_cenario else None
        }