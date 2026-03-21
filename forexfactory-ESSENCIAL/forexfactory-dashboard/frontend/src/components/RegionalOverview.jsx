import React, { useState } from 'react';

const RegionalOverview = ({ panoramaMacro }) => {
  const [expanded, setExpanded] = useState(false);

  // Blindagem defensiva: garantir que sempre renderiza, mesmo com dados parciais
  if (!panoramaMacro || typeof panoramaMacro !== 'object') {
    return null;
  }
  
  // Se objeto vazio, retornar null (comportamento atual preservado)
  if (Object.keys(panoramaMacro).length === 0) {
    return null;
  }

  const regions = [
    { key: 'Américas', value: panoramaMacro.Américas || panoramaMacro.Americas || null, icon: '🌎', color: 'blue' },
    { key: 'Europa', value: panoramaMacro.Europa || null, icon: '🌍', color: 'green' },
    { key: 'Ásia-Pacífico', value: panoramaMacro['Ásia-Pacífico'] || panoramaMacro['Asia-Pacifico'] || null, icon: '🌏', color: 'purple' },
  ].filter(region => region.value && typeof region.value === 'string' && region.value.trim().length > 0);

  const colorClasses = {
    blue: {
      bg: 'bg-blue-900/20',
      border: 'border-blue-800/50',
      text: 'text-blue-400',
    },
    green: {
      bg: 'bg-green-900/20',
      border: 'border-green-800/50',
      text: 'text-green-400',
    },
    purple: {
      bg: 'bg-purple-900/20',
      border: 'border-purple-800/50',
      text: 'text-purple-400',
    },
  };

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden shadow-xl">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-5 transition-all flex items-center justify-between hover:from-blue-700 hover:to-purple-700 group"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-lg">🌍</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-base leading-tight">Análise Macro Regional</div>
            <div className="text-xs text-white/80 leading-tight">Visão por região geográfica</div>
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
        <div className="p-6 bg-gray-950">
          {regions.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              Dados regionais não disponíveis
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {regions.map((region) => {
                const colors = colorClasses[region.color] || colorClasses.blue;
                const displayValue = typeof region.value === 'string' ? region.value : String(region.value || '');

                return (
                  <div
                    key={region.key}
                    className={`${colors.bg} rounded-lg p-4 border ${colors.border}`}
                  >
                    <div className={`${colors.text} font-bold mb-2 flex items-center gap-2`}>
                      <span>{region.icon}</span>
                      <span>{region.key}</span>
                    </div>
                    <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">
                      {displayValue}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RegionalOverview;
