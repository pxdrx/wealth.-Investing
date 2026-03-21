"""
MRKT Edge — Decision Intelligence Generator

Gera campos de inteligência orientada a decisão baseado em análise macro institucional.

Responsabilidades:
- Identificar ativo dominante da semana
- Determinar direcionamento semanal (Bullish/Bearish/Neutro)
- Gerar interpretação narrativa do ativo
- Classificar fluxo de risco global (Risk-On/Risk-Off/Rotacional)

Conformidade:
- Utiliza exclusivamente ativos do universo FTMO oficial
- Valida e normaliza símbolos antes de processar
- Respeita clusters macro institucionais
"""

from typing import Dict, Optional, List
from schemas.institutional_analysis_schema import (
    InstitutionalAnalysis,
    DominantAsset,
    CorrelatedAsset,
    RiskFlow,
    ScenarioBase,
    ScenarioAlternativo,
    ZonaRuido,
    DistribuicaoProbabilidades,
    MapaConviccao,
    CondicoesExecucao,
    SizingInstitucional,
    RiscoPrimario,
    AlertaAdaptativo,
    MonitoramentoCenario
)
from macro_analysis.assets.ftmo_assets import (
    FTMO_SYMBOLS,
    is_ftmo_asset,
    validate_and_normalize,
    get_correlated_assets,
    get_ftmo_asset,
    ALL_FTMO_ASSETS
)


class DecisionIntelligenceGenerator:
    """
    Gera campos de inteligência orientada a decisão baseado em análise macro.
    
    Utiliza exclusivamente o universo oficial de ativos FTMO.
    """
    
    def __init__(self):
        """Inicializa gerador com universo FTMO."""
        # Lista de símbolos FTMO para busca rápida
        self.ftmo_symbols = FTMO_SYMBOLS
    
    def generate(self, analysis: InstitutionalAnalysis) -> Dict:
        """
        Gera todos os campos de inteligência orientada a decisão.
        
        Args:
            analysis: Análise institucional validada
            
        Returns:
            Dict com os 4 novos campos:
            {
                "ativo_dominante_semana": {...},
                "direcionamento_semanal": "Bullish|Bearish|Neutro",
                "interpretacao_narrativa_ativo": "...",
                "fluxo_risco": {...}
            }
        """
        # 1. Identificar ativo dominante
        dominant_asset = self._identify_dominant_asset(analysis)
        
        # 1.5. Identificar ativos correlacionados
        correlated_assets = self._identify_correlated_assets(analysis, dominant_asset)
        
        # 2. Determinar direcionamento
        direction = self._determine_direction(analysis, dominant_asset)
        
        # 3. Gerar interpretação narrativa
        narrative_interpretation = self._generate_narrative_interpretation(
            analysis, dominant_asset, direction
        )
        
        # 4. Classificar fluxo de risco
        risk_flow = self._classify_risk_flow(analysis)
        
        # 5. Gerar Fase 3 - Controle Institucional
        phase3_controls = self._generate_phase3_controls(
            analysis, dominant_asset, correlated_assets, direction, risk_flow
        )
        
        # 6. Gerar Fase 4 - Decisão Acionável
        phase4_actionable = self._generate_phase4_actionable(
            analysis, dominant_asset, correlated_assets, direction, risk_flow, phase3_controls
        )
        
        # Fase 5 - Monitoramento Adaptativo REMOVIDO (não mais utilizado)
        
        return {
            "ativo_dominante_semana": dominant_asset,
            "ativos_correlacionados_semana": correlated_assets,
            "direcionamento_semanal": direction,
            "interpretacao_narrativa_ativo": narrative_interpretation,
            "fluxo_risco": risk_flow,
            **phase3_controls,
            **phase4_actionable
        }
    
    def _identify_dominant_asset(self, analysis: InstitutionalAnalysis) -> Optional[DominantAsset]:
        """
        Identifica qual ativo se beneficia em ≥80% da narrativa macro.
        
        Analisa:
        - Panorama macro regional
        - Narrativa (política monetária, crescimento, inflação, risco)
        - Análise de ativos
        - Conclusão operacional
        
        Conformidade:
        - Utiliza exclusivamente ativos do universo FTMO
        - Normaliza símbolos antes de processar
        - Valida que resultado final é FTMO válido
        """
        # Contar menções e benefícios por ativo (apenas FTMO)
        asset_scores = {}
        
        # Priorizar ativos já analisados na lista de assets
        # Normalizar e validar como FTMO
        analyzed_assets = {}
        for asset in analysis.assets:
            normalized = validate_and_normalize(asset.name)
            if normalized:
                analyzed_assets[normalized] = asset
                analyzed_assets[asset.name] = asset  # Manter original para busca
        
        # Analisar panorama macro
        for region in analysis.regional_overview:
            content = region.content.lower()
            # Buscar ativos analisados primeiro (normalizados)
            for asset_name in analyzed_assets.keys():
                normalized = validate_and_normalize(asset_name)
                if normalized and normalized not in asset_scores:
                    if asset_name.lower() in content or any(
                        word in content for word in asset_name.lower().split()
                    ):
                        asset_scores[normalized] = asset_scores.get(normalized, 0) + 2
            
            # Buscar outros ativos FTMO mencionados no texto
            for ftmo_symbol in self.ftmo_symbols:
                if ftmo_symbol.lower() in content:
                    if ftmo_symbol not in asset_scores:
                        asset_scores[ftmo_symbol] = asset_scores.get(ftmo_symbol, 0) + 1
        
        # Analisar narrativa
        narrative_text = (
            analysis.narrative.politica_monetaria.lower() +
            " " + analysis.narrative.crescimento_economico.lower() +
            " " + analysis.narrative.inflacao_pressoes.lower() +
            " " + analysis.narrative.risco_apetite.lower()
        )
        
        # Priorizar ativos analisados (normalizados)
        for asset_name in analyzed_assets.keys():
            normalized = validate_and_normalize(asset_name)
            if normalized:
                if asset_name.lower() in narrative_text or any(
                    word in narrative_text for word in asset_name.lower().split()
                ):
                    asset_scores[normalized] = asset_scores.get(normalized, 0) + 3
        
        # Buscar ativos FTMO mencionados na narrativa
        for ftmo_symbol in self.ftmo_symbols:
            if ftmo_symbol.lower() in narrative_text:
                asset_scores[ftmo_symbol] = asset_scores.get(ftmo_symbol, 0) + 2
        
        # Analisar ativos com cenário positivo (PESO MAIOR) - normalizar
        for asset in analysis.assets:
            normalized = validate_and_normalize(asset.name)
            if normalized:
                if asset.scenario_base == "Alta":
                    asset_scores[normalized] = asset_scores.get(normalized, 0) + 5
                elif asset.scenario_base == "Lateral":
                    asset_scores[normalized] = asset_scores.get(normalized, 0) + 2
                elif asset.scenario_base == "Baixa":
                    asset_scores[normalized] = asset_scores.get(normalized, 0) + 1
        
        # Analisar conclusão
        conclusion_text = (
            analysis.conclusion.sintese_semana.lower() +
            " " + analysis.conclusion.precificacao_mercado.lower()
        )
        
        for asset_name in analyzed_assets.keys():
            normalized = validate_and_normalize(asset_name)
            if normalized:
                if asset_name.lower() in conclusion_text or any(
                    word in conclusion_text for word in asset_name.lower().split()
                ):
                    asset_scores[normalized] = asset_scores.get(normalized, 0) + 3
        
        # Buscar ativos FTMO mencionados na conclusão
        for ftmo_symbol in self.ftmo_symbols:
            if ftmo_symbol.lower() in conclusion_text:
                asset_scores[ftmo_symbol] = asset_scores.get(ftmo_symbol, 0) + 2
        
        # Filtrar apenas ativos FTMO válidos
        valid_asset_scores = {
            symbol: score for symbol, score in asset_scores.items()
            if is_ftmo_asset(symbol)
        }
        
        # Identificar ativo dominante
        if not valid_asset_scores:
            # Fallback: usar o primeiro ativo analisado com cenário "Alta" (normalizado)
            for asset in analysis.assets:
                normalized = validate_and_normalize(asset.name)
                if normalized and asset.scenario_base == "Alta":
                    return DominantAsset(
                        ativo=normalized,
                        justificativa=f"{normalized} apresenta cenário base de alta, "
                                     f"com driver macro {asset.driver_macro.lower()}."
                    )
            # Se não houver, usar o primeiro ativo analisado (normalizado)
            if analysis.assets:
                first_asset = analysis.assets[0]
                normalized = validate_and_normalize(first_asset.name)
                if normalized:
                    return DominantAsset(
                        ativo=normalized,
                        justificativa=f"{normalized} é o ativo principal analisado nesta semana, "
                                     f"com cenário base {first_asset.scenario_base.lower()}."
                    )
            return None
        
        dominant = max(valid_asset_scores.items(), key=lambda x: x[1])
        dominant_name = dominant[0]
        dominant_score = dominant[1]
        
        # Garantir que é FTMO válido
        if not is_ftmo_asset(dominant_name):
            normalized = validate_and_normalize(dominant_name)
            if normalized:
                dominant_name = normalized
            else:
                # Fallback seguro
                return None
        
        # Gerar justificativa
        justification = self._build_dominant_justification(
            analysis, dominant_name, dominant_score
        )
        
        return DominantAsset(
            ativo=dominant_name,
            justificativa=justification
        )
    
    def _build_dominant_justification(
        self,
        analysis: InstitutionalAnalysis,
        asset_name: str,
        score: int
    ) -> str:
        """Constrói justificativa institucional para ativo dominante."""
        # Normalizar símbolo para buscar na análise
        asset_name_normalized = validate_and_normalize(asset_name)
        asset_info = None
        for asset in analysis.assets:
            asset_normalized = validate_and_normalize(asset.name)
            if asset_normalized == asset_name_normalized or asset.name == asset_name:
                asset_info = asset
                break
        
        justification_parts = []
        
        # Baseado no score
        if score >= 5:
            justification_parts.append(
                f"{asset_name} emerge como o ativo central da semana, "
                f"com forte alinhamento à narrativa macro dominante."
            )
        else:
            justification_parts.append(
                f"{asset_name} apresenta destaque na análise macro semanal, "
                f"com relevância significativa para o contexto institucional."
            )
        
        # Adicionar contexto do driver macro
        if asset_info:
            justification_parts.append(
                f"O driver macro principal é {asset_info.driver_macro.lower()}, "
                f"com cenário base {asset_info.scenario_base.lower()}."
            )
        
        # Adicionar contexto da narrativa
        narrative_context = []
        if "dólar" in analysis.narrative.politica_monetaria.lower() or "usd" in analysis.narrative.politica_monetaria.lower():
            if "USD" in asset_name or "DXY" in asset_name:
                narrative_context.append("política monetária dos EUA")
        
        if "euro" in analysis.narrative.politica_monetaria.lower() or "eur" in analysis.narrative.politica_monetaria.lower():
            if "EUR" in asset_name:
                narrative_context.append("política monetária do BCE")
        
        if "ouro" in analysis.narrative.risco_apetite.lower() or "gold" in analysis.narrative.risco_apetite.lower():
            if "XAU" in asset_name or "ouro" in asset_name.lower():
                narrative_context.append("sentimento de risco")
        
        if narrative_context:
            justification_parts.append(
                f"O contexto macro favorece {asset_name} através de "
                f"{', '.join(narrative_context)}."
            )
        
        return " ".join(justification_parts)
    
    def _identify_correlated_assets(
        self,
        analysis: InstitutionalAnalysis,
        dominant_asset: Optional[DominantAsset]
    ) -> Optional[List[CorrelatedAsset]]:
        """
        Identifica ativos correlacionados ao ativo dominante.
        
        Regras:
        - Máximo de 5 ativos
        - Não repetir o ativo dominante
        - Selecionar ativos com correlação macro clara
        - Justificativa deve explicar o porquê macro, não técnico
        """
        if not dominant_asset:
            return None
        
        # Normalizar ativo dominante
        dominant_normalized = validate_and_normalize(dominant_asset.ativo)
        if not dominant_normalized:
            return None
        
        dominant_name = dominant_normalized
        correlated = []
        
        # Mapeamento de correlações macro por cluster (FTMO)
        correlation_clusters = self._get_correlation_clusters(dominant_name)
        
        # Analisar ativos já analisados na lista (normalizar e validar FTMO)
        analyzed_assets = {}
        for asset in analysis.assets:
            normalized = validate_and_normalize(asset.name)
            if normalized and normalized != dominant_name:
                analyzed_assets[normalized] = asset
        
        # Priorizar ativos com cenário positivo e correlação macro
        candidate_scores = {}
        
        for asset_name_normalized, asset in analyzed_assets.items():
            if asset_name_normalized == dominant_name:
                continue
            
            # Verificar se está no mesmo cluster macro (usando símbolos FTMO)
            is_correlated = asset_name_normalized in correlation_clusters
            
            if is_correlated:
                score = 0
                # Pontuar por cenário base
                if asset.scenario_base == "Alta":
                    score += 3
                elif asset.scenario_base == "Lateral":
                    score += 1
                
                # Pontuar por menções na narrativa
                narrative_text = (
                    analysis.narrative.politica_monetaria.lower() +
                    " " + analysis.narrative.crescimento_economico.lower() +
                    " " + analysis.narrative.inflacao_pressoes.lower() +
                    " " + analysis.narrative.risco_apetite.lower()
                )
                
                if asset_name_normalized.lower() in narrative_text:
                    score += 2
                
                # Pontuar por menções no panorama regional
                for region in analysis.regional_overview:
                    if asset_name_normalized.lower() in region.content.lower():
                        score += 1
                
                if score > 0:
                    candidate_scores[asset_name_normalized] = (score, asset)
        
        # Também considerar ativos do cluster que não estão na lista analisada
        for cluster_symbol in correlation_clusters:
            if cluster_symbol not in candidate_scores and cluster_symbol != dominant_name:
                # Verificar se é mencionado na narrativa
                narrative_text = (
                    analysis.narrative.politica_monetaria.lower() +
                    " " + analysis.narrative.crescimento_economico.lower() +
                    " " + analysis.narrative.inflacao_pressoes.lower() +
                    " " + analysis.narrative.risco_apetite.lower()
                )
                if cluster_symbol.lower() in narrative_text:
                    # Criar asset dummy para pontuação
                    candidate_scores[cluster_symbol] = (1, None)
        
        # Ordenar por score e pegar top 5
        sorted_candidates = sorted(
            candidate_scores.items(),
            key=lambda x: x[1][0],
            reverse=True
        )[:5]
        
        # Gerar objetos CorrelatedAsset (apenas FTMO válidos)
        for asset_symbol, (score, asset) in sorted_candidates:
            if not is_ftmo_asset(asset_symbol):
                continue
            
            if asset:
                justification = self._build_correlated_justification(
                    analysis, asset_symbol, asset, dominant_name
                )
            else:
                # Asset não analisado, mas mencionado na narrativa
                justification = (
                    f"{asset_symbol} apresenta correlação macro com {dominant_name}, "
                    "compartilhando drivers econômicos e fluxos de capital institucional."
                )
            
            correlated.append(CorrelatedAsset(
                ativo=asset_symbol,
                justificativa=justification
            ))
        
        return correlated if correlated else None
    
    def _get_correlation_clusters(self, asset_name: str) -> List[str]:
        """
        Retorna clusters de correlação macro para um ativo usando universo FTMO.
        
        Utiliza a função get_correlated_assets do módulo FTMO para garantir
        que apenas ativos FTMO sejam retornados.
        
        Exemplos:
        - EURUSD → [GBPUSD, EURGBP, EURJPY] (FX europeu)
        - XAUUSD → [XAGUSD] (metais preciosos)
        - SPX500 → [NAS100, US30, DXY] (índices US)
        """
        # Normalizar símbolo primeiro
        normalized = validate_and_normalize(asset_name)
        if not normalized:
            return []
        
        # Usar função FTMO para obter correlações
        correlated = get_correlated_assets(normalized)
        
        # Validar que todos são FTMO válidos
        valid_correlated = [
            symbol for symbol in correlated
            if is_ftmo_asset(symbol)
        ]
        
        return valid_correlated
    
    def _build_correlated_justification(
        self,
        analysis: InstitutionalAnalysis,
        asset_name: str,
        asset,
        dominant_name: str
    ) -> str:
        """Constrói justificativa macro para ativo correlacionado."""
        justification_parts = []
        
        # Baseado na correlação com o dominante
        clusters = self._get_correlation_clusters(dominant_name)
        if asset_name in clusters:
            if "EUR" in asset_name.upper() and "EUR" in dominant_name.upper():
                justification_parts.append(
                    f"{asset_name} apresenta correlação macro direta com {dominant_name}, "
                    "compartilhando exposição à política monetária europeia e fluxos institucionais."
                )
            elif "USD" in asset_name.upper() and "USD" in dominant_name.upper():
                justification_parts.append(
                    f"{asset_name} está correlacionado a {dominant_name} através da exposição ao dólar, "
                    "com movimentos influenciados pela mesma narrativa macro dos EUA."
                )
            elif "XAU" in asset_name.upper() or "XAG" in asset_name.upper():
                justification_parts.append(
                    f"{asset_name} compartilha o mesmo cluster macro de metais preciosos com {dominant_name}, "
                    "sendo influenciado pelo mesmo sentimento de risco e preferências institucionais."
                )
            else:
                justification_parts.append(
                    f"{asset_name} apresenta correlação macro com {dominant_name}, "
                    "compartilhando drivers econômicos e fluxos de capital institucional."
                )
        
        # Adicionar contexto do cenário base (se asset disponível)
        if asset:
            if asset.scenario_base == "Alta":
                justification_parts.append(
                    f"O cenário base de alta para {asset_name} reforça a narrativa macro positiva, "
                    "alinhando-se ao direcionamento institucional da semana."
                )
            elif asset.scenario_base == "Lateral":
                justification_parts.append(
                    f"O cenário lateral de {asset_name} indica estabilidade macro, "
                    "com correlação moderada ao movimento do ativo dominante."
                )
            
            # Adicionar contexto do driver macro se relevante
            if asset.driver_macro:
                justification_parts.append(
                    f"O driver macro {asset.driver_macro.lower()} também influencia {asset_name}, "
                    "criando correlação estrutural com o ativo dominante."
                )
        
        # Se não houver justificativa, criar uma genérica
        if not justification_parts:
            justification_parts.append(
                f"{asset_name} apresenta correlação macro com {dominant_name}, "
                "compartilhando drivers econômicos e fluxos de capital institucional."
            )
        
        return " ".join(justification_parts)
    
    def _determine_direction(
        self,
        analysis: InstitutionalAnalysis,
        dominant_asset: Optional[DominantAsset]
    ) -> Optional[str]:
        """
        Determina direcionamento semanal (Bullish/Bearish/Neutro).
        
        Baseado em:
        - Política monetária
        - Dados macro
        - Fluxo institucional
        - Sentimento de risco
        """
        if not dominant_asset:
            return None
        
        # Normalizar símbolo do ativo dominante
        asset_name_normalized = validate_and_normalize(dominant_asset.ativo)
        if not asset_name_normalized:
            return "Neutro"
        
        # Encontrar análise do ativo (buscar por símbolo normalizado ou original)
        asset_analysis = None
        for asset in analysis.assets:
            asset_normalized = validate_and_normalize(asset.name)
            if asset_normalized == asset_name_normalized or asset.name == dominant_asset.ativo:
                asset_analysis = asset
                break
        
        if not asset_analysis:
            return "Neutro"
        
        # Baseado no cenário base
        if asset_analysis.scenario_base == "Alta":
            return "Bullish"
        elif asset_analysis.scenario_base == "Baixa":
            return "Bearish"
        else:
            # Analisar probabilidades
            prob_alta = asset_analysis.probability.alta
            prob_baixa = asset_analysis.probability.baixa
            
            if prob_alta == "Alta" and prob_baixa != "Alta":
                return "Bullish"
            elif prob_baixa == "Alta" and prob_alta != "Alta":
                return "Bearish"
            else:
                return "Neutro"
    
    def _generate_narrative_interpretation(
        self,
        analysis: InstitutionalAnalysis,
        dominant_asset: Optional[DominantAsset],
        direction: Optional[str]
    ) -> Optional[str]:
        """
        Gera interpretação narrativa explicando por que o ativo é central.
        """
        if not dominant_asset or not direction:
            return None
        
        # Normalizar símbolo do ativo dominante
        asset_name_normalized = validate_and_normalize(dominant_asset.ativo)
        if not asset_name_normalized:
            return None
        
        # Encontrar análise do ativo (buscar por símbolo normalizado ou original)
        asset_analysis = None
        for asset in analysis.assets:
            asset_normalized = validate_and_normalize(asset.name)
            if asset_normalized == asset_name_normalized or asset.name == dominant_asset.ativo:
                asset_analysis = asset
                break
        
        if not asset_analysis:
            return None
        
        # Usar o nome do ativo dominante
        asset_name = dominant_asset.ativo
        
        interpretation_parts = []
        
        # Introdução
        interpretation_parts.append(
            f"{asset_name} configura-se como o ativo dominante desta semana, "
            f"com direcionamento {direction.lower()} baseado exclusivamente na narrativa macro atual."
        )
        
        # Contexto do driver macro
        interpretation_parts.append(
            f"O driver macro principal — {asset_analysis.driver_macro.lower()} — "
            f"estabelece o contexto institucional que favorece ou limita o movimento de {asset_name}."
        )
        
        # Contexto da narrativa
        if "política monetária" in analysis.narrative.politica_monetaria.lower():
            interpretation_parts.append(
                "A política monetária global, especialmente dos principais bancos centrais, "
                f"exerce influência direta sobre {asset_name}, moldando expectativas institucionais."
            )
        
        if "risco" in analysis.narrative.risco_apetite.lower():
            if "XAU" in asset_name or "ouro" in asset_name.lower():
                interpretation_parts.append(
                    "O sentimento de risco e apetite de mercado direciona fluxos de capital "
                    f"para {asset_name}, refletindo preferências institucionais por segurança ou retorno."
                )
        
        # Síntese
        interpretation_parts.append(
            f"A narrativa macro atual posiciona {asset_name} como o centro das atenções institucionais, "
            f"com o direcionamento {direction.lower()} fundamentado em fatores macroeconômicos estruturais, "
            "não em sinais técnicos ou previsões de preço."
        )
        
        return " ".join(interpretation_parts)
    
    def _classify_risk_flow(self, analysis: InstitutionalAnalysis) -> Optional[RiskFlow]:
        """
        Classifica fluxo de risco global (Risk-On/Risk-Off/Rotacional).
        
        Analisa:
        - Narrativa de risco e apetite
        - Panorama macro regional
        - Análise de ativos (especialmente índices e commodities)
        """
        # Analisar narrativa de risco
        risk_narrative = analysis.narrative.risco_apetite.lower()
        
        # Palavras-chave Risk-On
        risk_on_keywords = [
            "apetite", "otimismo", "crescimento", "expansão",
            "liquidez", "retorno", "risco", "momentum positivo"
        ]
        
        # Palavras-chave Risk-Off
        risk_off_keywords = [
            "aversão", "fuga", "segurança", "proteção",
            "incerteza", "tensão", "cautela", "defensivo"
        ]
        
        risk_on_score = sum(1 for keyword in risk_on_keywords if keyword in risk_narrative)
        risk_off_score = sum(1 for keyword in risk_off_keywords if keyword in risk_narrative)
        
        # Analisar ativos de risco (normalizados FTMO)
        risk_assets_ftmo = ['SPX500', 'NAS100', 'BTCUSD', 'US30']
        safe_assets_ftmo = ['XAUUSD', 'DXY', 'USDJPY', 'XAGUSD', 'USDCHF']
        
        # Normalizar e validar ativos analisados
        risk_assets_positive = 0
        safe_assets_positive = 0
        risk_assets_list = []
        safe_assets_list = []
        
        for asset in analysis.assets:
            normalized = validate_and_normalize(asset.name)
            if normalized and asset.scenario_base == "Alta":
                if normalized in risk_assets_ftmo:
                    risk_assets_positive += 1
                    risk_assets_list.append(normalized)
                elif normalized in safe_assets_ftmo:
                    safe_assets_positive += 1
                    safe_assets_list.append(normalized)
        
        # Classificar
        if risk_on_score > risk_off_score and risk_assets_positive > safe_assets_positive:
            classification = "Risk-On"
            migration_assets = ", ".join(risk_assets_list) if risk_assets_list else "SPX500, NAS100, BTCUSD"
        elif risk_off_score > risk_on_score and safe_assets_positive > risk_assets_positive:
            classification = "Risk-Off"
            migration_assets = ", ".join(safe_assets_list) if safe_assets_list else "XAUUSD, DXY, USDJPY"
        else:
            classification = "Rotacional"
            migration_assets = "Migração seletiva entre ativos de risco e segurança"
        
        # Gerar justificativa
        justification = self._build_risk_flow_justification(
            analysis, classification, risk_on_score, risk_off_score
        )
        
        return RiskFlow(
            classificacao=classification,
            ativos_migracao=migration_assets if migration_assets else "Aguardando definição de fluxo",
            justificativa=justification
        )
    
    def _build_risk_flow_justification(
        self,
        analysis: InstitutionalAnalysis,
        classification: str,
        risk_on_score: int,
        risk_off_score: int
    ) -> str:
        """Constrói justificativa para classificação de fluxo de risco."""
        justification_parts = []
        
        if classification == "Risk-On":
            justification_parts.append(
                "O ambiente macro atual favorece apetite por risco, com capital migrando "
                "para ativos de maior retorno potencial, como índices de ações e criptomoedas."
            )
            if risk_on_score > 0:
                justification_parts.append(
                    f"A narrativa de risco indica {risk_on_score} indicador(es) de apetite por risco, "
                    "sugerindo confiança institucional em crescimento e liquidez."
                )
        elif classification == "Risk-Off":
            justification_parts.append(
                "O ambiente macro atual favorece aversão ao risco, com capital migrando "
                "para ativos de segurança, como ouro, dólar e títulos governamentais."
            )
            if risk_off_score > 0:
                justification_parts.append(
                    f"A narrativa de risco indica {risk_off_score} indicador(es) de aversão ao risco, "
                    "sugerindo cautela institucional e busca por proteção de capital."
                )
        else:  # Rotacional
            justification_parts.append(
                "O ambiente macro atual apresenta características mistas, com fluxo de capital "
                "rotacionando entre ativos de risco e segurança conforme desenvolvimentos específicos."
            )
            justification_parts.append(
                "A narrativa macro não apresenta direcionamento claro de risco, "
                "indicando ambiente seletivo e dependente de fatores específicos por ativo."
            )
        
        # Adicionar contexto da narrativa
        if "política monetária" in analysis.narrative.politica_monetaria.lower():
            justification_parts.append(
                "A política monetária global influencia diretamente o fluxo de risco, "
                "moldando preferências institucionais por retorno versus segurança."
            )
        
        return " ".join(justification_parts)
    
    def _generate_phase3_controls(
        self,
        analysis: InstitutionalAnalysis,
        dominant_asset: Optional[DominantAsset],
        correlated_assets: Optional[List[CorrelatedAsset]],
        direction: Optional[str],
        risk_flow: Optional[RiskFlow]
    ) -> Dict:
        """
        Gera campos da Fase 3 - Controle Institucional.
        Retorna dict vazio por enquanto (implementação futura).
        """
        return {}
    
    def _generate_phase4_actionable(
        self,
        analysis: InstitutionalAnalysis,
        dominant_asset: Optional[DominantAsset],
        correlated_assets: Optional[List[CorrelatedAsset]],
        direction: Optional[str],
        risk_flow: Optional[RiskFlow],
        phase3_controls: Dict
    ) -> Dict:
        """
        Gera campos da Fase 4 - Decisão Acionável.
        
        Regras:
        - Usar apenas ativos FTMO normalizados
        - VIX influencia convicção e sizing
        - Zona de ruído limita agressividade
        - Fallbacks obrigatórios
        """
        result = {}
        
        # Obter VIX (simulado - em produção viria de API)
        vix_value = self._get_vix_value()  # Retorna None se não disponível
        
        # 1. Mapa de Convicção
        mapa_conviccao = self._build_mapa_conviccao(
            analysis, dominant_asset, correlated_assets, direction, 
            risk_flow, phase3_controls, vix_value
        )
        if mapa_conviccao:
            result["mapa_conviccao"] = mapa_conviccao
        
        # 2. Condições de Execução
        condicoes_execucao = self._build_condicoes_execucao(
            analysis, direction, risk_flow, vix_value
        )
        if condicoes_execucao:
            result["condicoes_execucao"] = condicoes_execucao
        
        # 3. Sizing Institucional
        sizing_institucional = self._build_sizing_institucional(
            analysis, dominant_asset, correlated_assets, phase3_controls, vix_value
        )
        if sizing_institucional:
            result["sizing_institucional"] = sizing_institucional
        
        # 4. Risco Primário (Kill Switch)
        risco_primario = self._build_risco_primario(analysis, risk_flow)
        if risco_primario:
            result["risco_primario"] = risco_primario
        
        return result
    
    def _get_vix_value(self) -> Optional[float]:
        """
        Obtém valor do VIX Index.
        
        Em produção, isso viria de uma API externa.
        Por enquanto, retorna None (fallback).
        """
        # TODO: Integrar com API de VIX quando disponível
        return None
    
    def _build_mapa_conviccao(
        self,
        analysis: InstitutionalAnalysis,
        dominant_asset: Optional[DominantAsset],
        correlated_assets: Optional[List[CorrelatedAsset]],
        direction: Optional[str],
        risk_flow: Optional[RiskFlow],
        phase3_controls: Dict,
        vix_value: Optional[float]
    ) -> Optional[List[MapaConviccao]]:
        """Constrói mapa de convicção por ativo."""
        mapa = []
        
        # Distribuição de probabilidades
        distribuicao = phase3_controls.get("distribuicao_probabilidades")
        cenario_base_pct = distribuicao.cenario_base if distribuicao else 50
        
        # Zona de ruído
        zona_ruido = phase3_controls.get("zona_ruido")
        ruido_dominante = zona_ruido and (
            distribuicao and distribuicao.ruido >= 25
        )
        
        # Ativo dominante
        if dominant_asset:
            dominant_normalized = validate_and_normalize(dominant_asset.ativo)
            if dominant_normalized:
                # Calcular convicção
                conviccao = "Baixa"
                
                # Regras para Convicção Alta
                if not ruido_dominante:
                    if cenario_base_pct >= 55 and direction and direction != "Neutro":
                        if risk_flow and risk_flow.classificacao in ["Risk-On", "Risk-Off"]:
                            # VIX não deve limitar (se disponível)
                            if vix_value is None or vix_value < 25:
                                conviccao = "Alta"
                
                # Regras para Convicção Média
                if conviccao == "Baixa":
                    if cenario_base_pct >= 45 and direction:
                        if vix_value is None or vix_value < 30:
                            conviccao = "Média"
                
                # Se zona de ruído dominante, máximo é Média
                if ruido_dominante and conviccao == "Alta":
                    conviccao = "Média"
                
                # Convicção Relativa: se dominante tem Alta, correlacionados automaticamente Média
                # (ajuste conceitual - será aplicado na geração dos correlacionados)
                
                # Motivo resumido
                motivo_parts = []
                if conviccao == "Alta":
                    motivo_parts.append(f"Cenário base com {cenario_base_pct}% de probabilidade.")
                    if direction:
                        motivo_parts.append(f"Direção {direction} clara.")
                    if risk_flow:
                        motivo_parts.append(f"Fluxo de risco {risk_flow.classificacao} alinhado.")
                elif conviccao == "Média":
                    motivo_parts.append(f"Cenário base com {cenario_base_pct}% de probabilidade.")
                    if ruido_dominante:
                        motivo_parts.append("Zona de ruído presente limita convicção.")
                    elif vix_value and vix_value >= 18:
                        motivo_parts.append("VIX elevado reduz convicção.")
                else:
                    motivo_parts.append("Baixa clareza direcional ou alta incerteza.")
                
                motivo = " ".join(motivo_parts[:3])  # Máx 3 linhas
                
                mapa.append(MapaConviccao(
                    ativo=dominant_normalized,
                    conviccao=conviccao,
                    motivo_resumido=motivo
                ))
        
        # Ativos correlacionados
        # Convicção Relativa: se dominante tem Alta, correlacionados automaticamente Média
        conviccao_dominante = mapa[0].conviccao if mapa else None
        
        if correlated_assets:
            for asset in correlated_assets[:5]:  # Limitar a 5
                asset_normalized = validate_and_normalize(asset.ativo)
                if asset_normalized and asset_normalized not in [m.ativo for m in mapa]:
                    # Convicção Relativa: se dominante Alta, correlacionados Média
                    if conviccao_dominante == "Alta":
                        conviccao = "Média"
                        motivo = f"Ativo correlacionado ao dominante. Compartilha narrativa, mas convicção reduzida por exposição indireta."
                    else:
                        # Convicção menor que o dominante
                        conviccao = "Média" if cenario_base_pct >= 50 else "Baixa"
                        if ruido_dominante:
                            conviccao = "Baixa"
                        motivo = f"Ativo correlacionado ao dominante. Convicção reduzida por exposição indireta."
                    
                    mapa.append(MapaConviccao(
                        ativo=asset_normalized,
                        conviccao=conviccao,
                        motivo_resumido=motivo
                    ))
        
        return mapa if mapa else None
    
    def _build_condicoes_execucao(
        self,
        analysis: InstitutionalAnalysis,
        direction: Optional[str],
        risk_flow: Optional[RiskFlow],
        vix_value: Optional[float]
    ) -> Optional[CondicoesExecucao]:
        """Constrói condições de execução."""
        # Condição macro
        narrative_text = (
            analysis.narrative.politica_monetaria.lower() +
            " " + analysis.narrative.risco_apetite.lower()
        )
        
        condicao_macro_parts = []
        if direction:
            condicao_macro_parts.append(f"Direção {direction} estabelecida.")
        if risk_flow:
            condicao_macro_parts.append(f"Ambiente {risk_flow.classificacao}.")
        if "política monetária" in narrative_text:
            condicao_macro_parts.append("Política monetária definindo fluxos.")
        
        condicao_macro = " ".join(condicao_macro_parts) if condicao_macro_parts else "Aguardando clareza macro."
        
        # Condição de preço
        conclusion_text = analysis.conclusion.precificacao_mercado.lower()
        if "sobrecomprado" in conclusion_text or "sobrecompra" in conclusion_text:
            condicao_preco = "Aguardar correção técnica antes de entrada."
        elif "sobrevendido" in conclusion_text or "sobrevenda" in conclusion_text:
            condicao_preco = "Oportunidade de entrada em níveis técnicos favoráveis."
        else:
            condicao_preco = "Preço em zona neutra. Entrada conforme setup técnico."
        
        # Condição de volatilidade (VIX) - ranges fixos
        if vix_value is not None:
            if vix_value < 14:
                condicao_vol = "Baixa volatilidade (VIX < 14). Ambiente favorável para posições direcionais."
            elif vix_value < 18:
                condicao_vol = "Volatilidade normal (14 ≤ VIX < 18). Condições padrão de execução."
            elif vix_value < 25:
                condicao_vol = "Atenção: Volatilidade elevada (18 ≤ VIX < 25). Reduzir sizing e aumentar stops."
            else:
                condicao_vol = "Stress: Alta volatilidade (VIX ≥ 25). Evitar novas posições, proteger capital."
        else:
            condicao_vol = "VIX não disponível. Monitorar volatilidade via outros indicadores."
        
        return CondicoesExecucao(
            condicao_macro=condicao_macro,
            condicao_de_preco=condicao_preco,
            condicao_de_volatilidade=condicao_vol
        )
    
    def _build_sizing_institucional(
        self,
        analysis: InstitutionalAnalysis,
        dominant_asset: Optional[DominantAsset],
        correlated_assets: Optional[List[CorrelatedAsset]],
        phase3_controls: Dict,
        vix_value: Optional[float]
    ) -> Optional[List[SizingInstitucional]]:
        """Constrói sizing institucional sugerido."""
        sizing_list = []
        
        # Zona de ruído
        zona_ruido = phase3_controls.get("zona_ruido")
        ativos_evitar = zona_ruido.ativos_evitar if zona_ruido else []
        
        # Ativo dominante
        if dominant_asset:
            dominant_normalized = validate_and_normalize(dominant_asset.ativo)
            if dominant_normalized:
                # Determinar sizing
                sizing = "Normal"
                justificativa_parts = []
                
                # VIX ≥ 18 → nunca Agressivo
                if vix_value and vix_value >= 18:
                    sizing = "Reduzido"
                    justificativa_parts.append(f"VIX em {vix_value:.1f} limita agressividade.")
                elif vix_value and vix_value < 14:
                    # VIX baixo permite agressividade se outras condições forem favoráveis
                    distribuicao = phase3_controls.get("distribuicao_probabilidades")
                    if distribuicao and distribuicao.cenario_base >= 60:
                        sizing = "Agressivo"
                        justificativa_parts.append("VIX baixo e alta probabilidade de cenário base.")
                
                # Zona de ruído → Evitar ou Reduzido
                if dominant_normalized in ativos_evitar:
                    sizing = "Evitar"
                    justificativa_parts.append("Ativo na zona de ruído identificada.")
                elif zona_ruido and zona_ruido.condicoes:
                    sizing = "Reduzido" if sizing == "Agressivo" else sizing
                    justificativa_parts.append("Zona de ruído presente reduz sizing.")
                
                if not justificativa_parts:
                    justificativa_parts.append("Sizing padrão institucional.")
                
                sizing_list.append(SizingInstitucional(
                    ativo=dominant_normalized,
                    sizing=sizing,
                    justificativa=" ".join(justificativa_parts)
                ))
        
        # Ativos correlacionados
        if correlated_assets:
            for asset in correlated_assets[:5]:
                asset_normalized = validate_and_normalize(asset.ativo)
                if asset_normalized and asset_normalized not in [s.ativo for s in sizing_list]:
                    sizing = "Reduzido"
                    justificativa = "Ativo correlacionado. Sizing reduzido por exposição indireta."
                    
                    if asset_normalized in ativos_evitar:
                        sizing = "Evitar"
                        justificativa = "Ativo na zona de ruído."
                    elif vix_value and vix_value >= 18:
                        justificativa = f"VIX elevado ({vix_value:.1f}) e exposição indireta."
                    
                    sizing_list.append(SizingInstitucional(
                        ativo=asset_normalized,
                        sizing=sizing,
                        justificativa=justificativa
                    ))
        
        return sizing_list if sizing_list else None
    
    def _build_risco_primario(
        self,
        analysis: InstitutionalAnalysis,
        risk_flow: Optional[RiskFlow]
    ) -> Optional[RiscoPrimario]:
        """Constrói risco primário (Kill Switch)."""
        # Identificar eventos de risco na narrativa
        narrative_text = (
            analysis.narrative.politica_monetaria.lower() +
            " " + analysis.narrative.risco_apetite.lower() +
            " " + analysis.conclusion.sintese_semana.lower()
        )
        
        evento_parts = []
        if "geopolítico" in narrative_text or "geopolitico" in narrative_text:
            evento_parts.append("Eventos geopolíticos")
        if "crise" in narrative_text or "colapso" in narrative_text:
            evento_parts.append("Crises sistêmicas")
        if "banco central" in narrative_text or "fed" in narrative_text:
            evento_parts.append("Mudanças abruptas de política monetária")
        
        evento_de_risco = (
            evento_parts[0] if evento_parts
            else "Mudança estrutural na narrativa macro dominante"
        )
        
        # Impacto esperado
        if risk_flow and risk_flow.classificacao == "Risk-Off":
            impacto = "Fuga para segurança. Vendas generalizadas em ativos de risco."
        elif risk_flow and risk_flow.classificacao == "Risk-On":
            impacto = "Correção de posições defensivas. Movimento para ativos de risco."
        else:
            impacto = "Volatilidade elevada e movimentos erráticos entre ativos."
        
        # Ativos mais afetados (FTMO)
        ativos_afetados = []
        if risk_flow:
            # Parse ativos de migração
            if risk_flow.ativos_migracao:
                # Tentar extrair símbolos FTMO do texto
                for symbol in self.ftmo_symbols:
                    if symbol in risk_flow.ativos_migracao.upper():
                        normalized = validate_and_normalize(symbol)
                        if normalized:
                            ativos_afetados.append(normalized)
        
        # Fallback: usar ativos comuns
        if not ativos_afetados:
            if risk_flow and risk_flow.classificacao == "Risk-Off":
                ativos_afetados = ["SPX500", "NAS100", "BTCUSD"]
            elif risk_flow and risk_flow.classificacao == "Risk-On":
                ativos_afetados = ["XAUUSD", "USDJPY", "USDCHF"]
            else:
                ativos_afetados = ["EURUSD", "GBPUSD", "XAUUSD"]
        
        # Validar e normalizar
        ativos_afetados = [
            validate_and_normalize(a) for a in ativos_afetados
            if validate_and_normalize(a)
        ][:5]
        
        # Janela temporal (opcional)
        janela_temporal = None
        if "geopolítico" in narrative_text or "geopolitico" in narrative_text:
            janela_temporal = "Próximas 48-72h"
        elif "crise" in narrative_text or "colapso" in narrative_text:
            janela_temporal = "Próximas 24-48h"
        elif "banco central" in narrative_text or "fed" in narrative_text:
            janela_temporal = "Próximas 72-120h"
        
        return RiscoPrimario(
            evento_de_risco=evento_de_risco,
            impacto_esperado=impacto,
            ativos_mais_afetados=ativos_afetados,
            janela_temporal=janela_temporal
        )
    
    def _generate_phase5_monitoring_REMOVED(
        self,
        analysis: InstitutionalAnalysis,
        dominant_asset: Optional[DominantAsset],
        correlated_assets: Optional[List[CorrelatedAsset]],
        direction: Optional[str],
        risk_flow: Optional[RiskFlow],
        phase3_controls: Dict,
        phase4_actionable: Dict
    ) -> Dict:
        """
        Fase 5 - Monitoramento Adaptativo REMOVIDO.
        Este método não gera mais nenhum dado.
        """
        return {}  # Retornar vazio - funcionalidade removida
    
    def _build_monitoramento_cenario(
        self,
        analysis: InstitutionalAnalysis,
        phase3_controls: Dict,
        phase4_actionable: Dict,
        vix_value: Optional[float]
    ) -> Optional[MonitoramentoCenario]:
        """Constrói monitoramento do status do cenário base."""
        from datetime import datetime
        
        distribuicao = phase3_controls.get("distribuicao_probabilidades")
        zona_ruido = phase3_controls.get("zona_ruido")
        mapa_conviccao = phase4_actionable.get("mapa_conviccao")
        
        # Determinar status
        status = "Estavel"
        motivo_parts = []
        
        # Verificar enfraquecimento
        if distribuicao:
            # Se ruído aumentou significativamente
            if distribuicao.ruido >= 30:
                status = "Enfraquecendo"
                motivo_parts.append(f"Ruído aumentou para {distribuicao.ruido}%.")
            
            # Se cenário base caiu abaixo de 50%
            elif distribuicao.cenario_base < 50:
                status = "Enfraquecendo"
                motivo_parts.append(f"Probabilidade do cenário base caiu para {distribuicao.cenario_base}%.")
        
        # Verificar invalidação
        if zona_ruido and zona_ruido.condicoes:
            if "crise" in zona_ruido.condicoes.lower() or "colapso" in zona_ruido.condicoes.lower():
                status = "Invalidado"
                motivo_parts.append("Evento sistêmico detectado invalida cenário base.")
        
        # Verificar VIX
        if vix_value and vix_value >= 25:
            if status == "Estavel":
                status = "Enfraquecendo"
            motivo_parts.append(f"VIX em stress ({vix_value:.1f}) indica ambiente de alta incerteza.")
        
        # Verificar convicção
        if mapa_conviccao:
            convicoes_baixas = sum(1 for m in mapa_conviccao if m.conviccao == "Baixa")
            if convicoes_baixas >= len(mapa_conviccao) * 0.5:  # 50% ou mais com baixa convicção
                if status == "Estavel":
                    status = "Enfraquecendo"
                motivo_parts.append("Maioria dos ativos com convicção baixa.")
        
        motivo = " ".join(motivo_parts) if motivo_parts else "Cenário base mantém estabilidade."
        
        return MonitoramentoCenario(
            status_cenario_base=status,
            motivo_resumido=motivo,
            ultimo_check=datetime.now().isoformat()
        )
    
    def _build_alertas_adaptativos(
        self,
        analysis: InstitutionalAnalysis,
        dominant_asset: Optional[DominantAsset],
        correlated_assets: Optional[List[CorrelatedAsset]],
        direction: Optional[str],
        risk_flow: Optional[RiskFlow],
        phase3_controls: Dict,
        phase4_actionable: Dict,
        vix_value: Optional[float],
        monitoramento: MonitoramentoCenario
    ) -> Optional[List[AlertaAdaptativo]]:
        """Constrói alertas adaptativos (máx. 3)."""
        alertas = []
        
        distribuicao = phase3_controls.get("distribuicao_probabilidades")
        zona_ruido = phase3_controls.get("zona_ruido")
        mapa_conviccao = phase4_actionable.get("mapa_conviccao")
        
        # 1. Alerta de Enfraquecimento
        if monitoramento.status_cenario_base == "Enfraquecendo":
            # Coletar ativos afetados
            ativos_afetados = []
            if dominant_asset:
                dominant_normalized = validate_and_normalize(dominant_asset.ativo)
                if dominant_normalized:
                    ativos_afetados.append(dominant_normalized)
            if correlated_assets:
                for asset in correlated_assets[:3]:
                    asset_normalized = validate_and_normalize(asset.ativo)
                    if asset_normalized and asset_normalized not in ativos_afetados:
                        ativos_afetados.append(asset_normalized)
            
            # Validar FTMO
            ativos_afetados = [
                validate_and_normalize(a) for a in ativos_afetados
                if validate_and_normalize(a)
            ][:5]
            
            if ativos_afetados:
                # Determinar severidade
                severidade = "Media"
                if distribuicao and distribuicao.ruido >= 35:
                    severidade = "Alta"
                elif vix_value and vix_value >= 25:
                    severidade = "Alta"
                
                gatilho = "Queda na probabilidade do cenário base"
                if distribuicao:
                    gatilho = f"Cenário base caiu para {distribuicao.cenario_base}%"
                
                descricao = (
                    f"O cenário base está enfraquecendo. "
                    f"Reduzir exposição em {', '.join(ativos_afetados[:3])} "
                    f"e monitorar desenvolvimentos macro."
                )
                
                alertas.append(AlertaAdaptativo(
                    tipo="Enfraquecimento",
                    severidade=severidade,
                    descricao=descricao,
                    ativos_afetados=ativos_afetados,
                    gatilho_detectado=gatilho,
                    janela_temporal="Próximas 24-48h"
                ))
        
        # 2. Alerta de Mudança de Regime
        if distribuicao and distribuicao.cenario_alternativo >= 40:
            # Mudança de regime quando alternativo ganha peso
            ativos_afetados = []
            cenario_alternativo = phase3_controls.get("cenario_alternativo")
            if cenario_alternativo and cenario_alternativo.ativos_beneficiados:
                ativos_afetados = [
                    validate_and_normalize(a) for a in cenario_alternativo.ativos_beneficiados
                    if validate_and_normalize(a)
                ][:5]
            
            if ativos_afetados:
                severidade = "Media"
                if distribuicao.cenario_alternativo >= 50:
                    severidade = "Alta"
                
                gatilho = f"Cenário alternativo ganhando peso ({distribuicao.cenario_alternativo}%)"
                
                descricao = (
                    f"Mudança de regime detectada. "
                    f"Cenário alternativo com {distribuicao.cenario_alternativo}% de probabilidade. "
                    f"Monitorar {', '.join(ativos_afetados[:3])}."
                )
                
                alertas.append(AlertaAdaptativo(
                    tipo="MudancaDeRegime",
                    severidade=severidade,
                    descricao=descricao,
                    ativos_afetados=ativos_afetados,
                    gatilho_detectado=gatilho,
                    janela_temporal="Próximas 48-72h"
                ))
        
        # 3. Alerta de Aumento de Risco
        risco_aumentado = False
        if vix_value and vix_value >= 18:
            # VIX subindo de faixa
            if vix_value >= 25:
                risco_aumentado = True
            elif vix_value >= 18:
                # Verificar se subiu de faixa (comparar com histórico - simulado)
                risco_aumentado = True
        
        if risco_aumentado or (zona_ruido and "crise" in zona_ruido.condicoes.lower()):
            ativos_afetados = []
            if dominant_asset:
                dominant_normalized = validate_and_normalize(dominant_asset.ativo)
                if dominant_normalized:
                    ativos_afetados.append(dominant_normalized)
            
            # Adicionar ativos de risco
            if risk_flow and risk_flow.classificacao == "Risk-Off":
                risk_assets = ["SPX500", "NAS100", "BTCUSD"]
                for asset in risk_assets:
                    if is_ftmo_asset(asset) and asset not in ativos_afetados:
                        ativos_afetados.append(asset)
            
            ativos_afetados = ativos_afetados[:5]
            
            if ativos_afetados:
                severidade = "Alta" if (vix_value and vix_value >= 25) else "Media"
                
                gatilho = "Aumento de volatilidade sistêmica"
                if vix_value:
                    gatilho = f"VIX em {vix_value:.1f} ({'Stress' if vix_value >= 25 else 'Atenção'})"
                
                descricao = (
                    f"Risco sistêmico aumentando. "
                    f"Proteger posições em {', '.join(ativos_afetados[:3])} "
                    f"e reduzir exposição geral."
                )
                
                alertas.append(AlertaAdaptativo(
                    tipo="AumentoDeRisco",
                    severidade=severidade,
                    descricao=descricao,
                    ativos_afetados=ativos_afetados,
                    gatilho_detectado=gatilho,
                    janela_temporal="Próximas 24-48h"
                ))
        
        # Limitar a 3 alertas
        return alertas[:3] if alertas else None
