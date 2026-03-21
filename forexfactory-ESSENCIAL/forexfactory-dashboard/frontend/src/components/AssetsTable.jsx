import React, { useState } from 'react';

const AssetsTable = ({ ativos }) => {
  const [expanded, setExpanded] = useState(false);

  // Ativos fixos e imutáveis - sempre os mesmos 8 ativos
  const FIXED_ASSETS = [
    { name: 'DXY', icon: '💵', scenario_base: 'Lateral', driver_macro: 'Índice Dólar - Referência macro global', probability: { alta: 'Baixa', lateral: 'Média', baixa: 'Baixa' } },
    { name: 'EURUSD', icon: '🇪🇺', scenario_base: 'Lateral', driver_macro: 'Paridade EUR/USD - Correlação direta com política monetária', probability: { alta: 'Média', lateral: 'Média', baixa: 'Baixa' } },
    { name: 'GBPUSD', icon: '🇬🇧', scenario_base: 'Lateral', driver_macro: 'Paridade GBP/USD - Exposição ao ciclo monetário', probability: { alta: 'Média', lateral: 'Média', baixa: 'Baixa' } },
    { name: 'XAUUSD', icon: '🥇', scenario_base: 'Lateral', driver_macro: 'Ouro - Ativo de reserva e hedge inflacionário', probability: { alta: 'Baixa', lateral: 'Média', baixa: 'Baixa' } },
    { name: 'XAGUSD', icon: '🥈', scenario_base: 'Lateral', driver_macro: 'Prata - Correlação com ouro e demanda industrial', probability: { alta: 'Baixa', lateral: 'Média', baixa: 'Baixa' } },
    { name: 'NASDAQ', icon: '💻', scenario_base: 'Lateral', driver_macro: 'Índice Nasdaq - Exposição a tecnologia e crescimento', probability: { alta: 'Média', lateral: 'Média', baixa: 'Baixa' } },
    { name: 'SP500', icon: '📈', scenario_base: 'Lateral', driver_macro: 'S&P 500 - Benchmark de risco americano', probability: { alta: 'Média', lateral: 'Média', baixa: 'Baixa' } },
    { name: 'BITCOIN', icon: '₿', scenario_base: 'Lateral', driver_macro: 'Bitcoin - Ativo digital e proxy de risco', probability: { alta: 'Baixa', lateral: 'Média', baixa: 'Baixa' } }
  ];

  // Sempre usar ativos fixos, independente do que vier do backend
  const displayAssets = FIXED_ASSETS;

  const getScenarioColor = (scenario) => {
    switch (scenario) {
      case 'Alta':
        return 'text-green-400';
      case 'Baixa':
        return 'text-red-400';
      case 'Lateral':
        return 'text-yellow-400';
      default:
        return 'text-gray-400';
    }
  };

  const getProbabilityColor = (probability) => {
    switch (probability) {
      case 'Alta':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'Média':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'Baixa':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getAssetIcon = (name) => {
    const asset = FIXED_ASSETS.find(a => a.name === name);
    return asset ? asset.icon : '📊';
  };

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden shadow-xl">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 px-5 transition-all flex items-center justify-between hover:from-indigo-700 hover:to-purple-700 group"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-lg">📊</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-base leading-tight">Análise de Ativos</div>
            <div className="text-xs text-white/80 leading-tight">Cenários e probabilidades</div>
          </div>
        </div>
        <svg
          className={`w-6 h-6 transition-transform duration-300 flex-shrink-0 ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          expanded ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="bg-gray-950 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-900/50 border-b border-gray-700">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400">ATIVO</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400">CENÁRIO BASE</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400">DRIVER MACRO</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400">PROBABILIDADES</th>
            </tr>
          </thead>
          <tbody>
            {displayAssets.map((ativo, index) => {
              const assetName = ativo.name;
              const scenarioBase = ativo.scenario_base;
              const driverMacro = ativo.driver_macro;
              const probability = ativo.probability;

              return (
                <tr
                  key={index}
                  className="border-b border-gray-800 hover:bg-gray-800/30 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{getAssetIcon(assetName)}</span>
                      <div>
                        <div className="font-bold text-white">{assetName}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-bold ${getScenarioColor(scenarioBase)}`}>
                      {scenarioBase}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-gray-300 text-xs">{driverMacro}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1 items-center">
                      {probability ? (
                        <>
                          {probability.alta && (
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium border ${getProbabilityColor(
                                probability.alta
                              )}`}
                            >
                              Alta: {probability.alta}
                            </span>
                          )}
                          {probability.lateral && (
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium border ${getProbabilityColor(
                                probability.lateral
                              )}`}
                            >
                              Lateral: {probability.lateral}
                            </span>
                          )}
                          {probability.baixa && (
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium border ${getProbabilityColor(
                                probability.baixa
                              )}`}
                            >
                              Baixa: {probability.baixa}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-gray-500 text-xs">N/A</span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
};

export default AssetsTable;
