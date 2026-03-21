import React from 'react';
import RegionalOverview from './RegionalOverview';
import NarrativeSection from './NarrativeSection';
import AssetsTable from './AssetsTable';
import PanoramaMacroSection from './PanoramaMacroSection';
// ConclusionSection REMOVIDO - bloco "Perspectiva Semanal" não mais utilizado
import DecisionIntelligenceSection from './DecisionIntelligenceSection';
import ErrorBoundary from './ErrorBoundary';

const MacroDashboard = ({ analysisData, fearGreedValue: propFearGreed, vixValue: propVix }) => {
  // INSTRUMENTAÇÃO: provar que este componente está sendo executado
  console.log('[MACRODASHBOARD_RUNTIME] MacroDashboard renderizou', { hasAnalysisData: !!analysisData });
  
  // Normalização defensiva: garantir que valores sempre existem (null se indisponível)
  // Primeiro tenta usar props, depois tenta derivar de analysisData, por fim null
  const fearGreedValue = propFearGreed ?? 
    analysisData?.fearGreed?.value ?? 
    analysisData?.fearGreedIndex?.value ?? 
    null;
  
  const vixValue = propVix ?? 
    analysisData?.vix?.value ?? 
    null;
  
  // Blindagem defensiva: sempre renderizar PanoramaMacroSection mesmo se analysisData for null/undefined
  // O componente PanoramaMacroSection já tem fallbacks internos
  const macroOverview = analysisData?.macro_overview || null;

  if (!analysisData || typeof analysisData !== 'object') {
    // Renderizar apenas PanoramaMacroSection com fallback quando não há dados
    return (
      <div className="space-y-6">
        <PanoramaMacroSection macroOverview={null} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Panorama Macro Semanal - BANNER PAI que engloba os banners filhos */}
      <PanoramaMacroSection macroOverview={macroOverview}>
        {/* Banners filhos: renderizados dentro do Panorama Macro Semanal quando expandido */}
        {/* 1. Análise Macro Regional */}
        {analysisData.panorama_macro && 
         typeof analysisData.panorama_macro === 'object' && 
         Object.keys(analysisData.panorama_macro).length > 0 && (
          <RegionalOverview panoramaMacro={analysisData.panorama_macro} />
        )}
        {/* 2. Interpretação Narrativa */}
        {analysisData.interpretacao_narrativa && 
         typeof analysisData.interpretacao_narrativa === 'object' && 
         Object.keys(analysisData.interpretacao_narrativa).length > 0 && (
          <NarrativeSection 
            interpretacaoNarrativa={analysisData.interpretacao_narrativa}
            fearGreedValue={fearGreedValue}
            vixValue={vixValue}
          />
        )}
        {/* 3. Análise de Ativos */}
        {analysisData.ativos && 
         Array.isArray(analysisData.ativos) && 
         analysisData.ativos.length > 0 && (
          <AssetsTable ativos={analysisData.ativos} />
        )}
        {/* 4. Ativos da Semana */}
        <ErrorBoundary>
          <DecisionIntelligenceSection
            ativosDaSemana={analysisData.ativos_da_semana}
            direcionamentoSemanal={analysisData.direcionamento_semanal}
            interpretacaoNarrativaAtivo={analysisData.interpretacao_narrativa_ativo}
            fluxoRisco={analysisData.fluxo_risco}
          />
        </ErrorBoundary>
      </PanoramaMacroSection>
    </div>
  );
};

export default MacroDashboard;
