import React, { useState, useEffect } from 'react';
import AnimatedICTChart from './AnimatedICTChart';

// Banco de conhecimento ICT - BILÍNGUE
const ICT_CONCEPTS_DATA = {
  fvg: {
    id: 'fvg',
    category: 'basics',
    pt: {
      title: 'Fair Value Gap (FVG)',
      description: 'Um Fair Value Gap (FVG) é um desequilíbrio de preço que ocorre quando o mercado se move tão rapidamente que deixa um gap entre candles consecutivos. Este gap representa uma área onde o preço se moveu muito rápido, criando uma ineficiência na entrega de preço.',
      keyPoints: [
        'Criado por movimento rápido de preço em uma direção',
        'Representa ineficiência institucional',
        'O preço frequentemente retorna para "preencher" o gap',
        'Pode atuar como zonas de suporte/resistência',
        'FVGs de timeframes maiores são mais significativos'
      ],
      howToTrade: [
        'Identifique o gap entre 3 candles consecutivos',
        'Aguarde o preço retornar à zona do FVG',
        'Entre na direção do impulso original',
        'Coloque stop loss além do FVG',
        'Alvo em máximas/mínimas anteriores ou zonas de liquidez'
      ]
    },
    en: {
      title: 'Fair Value Gap (FVG)',
      description: 'A Fair Value Gap (FVG) is a price imbalance that occurs when the market moves so rapidly that it leaves a gap between consecutive candles. This gap represents an area where price moved too quickly, creating an inefficiency in price delivery.',
      keyPoints: [
        'Created by rapid price movement in one direction',
        'Represents institutional inefficiency',
        'Price often returns to "fill" the gap',
        'Can act as support/resistance zones',
        'Higher timeframe FVGs are more significant'
      ],
      howToTrade: [
        'Identify the gap between 3 consecutive candles',
        'Wait for price to return to the FVG zone',
        'Enter in the direction of the original impulse',
        'Place stop loss beyond the FVG',
        'Target previous highs/lows or liquidity zones'
      ]
    }
  },
  orderblock: {
    id: 'orderblock',
    category: 'basics',
    pt: {
      title: 'Order Block (OB)',
      description: 'Um Order Block é o último candle bullish ou bearish antes de um forte movimento de mercado. Representa áreas onde ordens institucionais foram colocadas, criando zonas de alta probabilidade de reversões ou continuações.',
      keyPoints: [
        'Último candle antes de movimento de impulso forte',
        'Representa posicionamento institucional',
        'OB Bullish: Último candle de baixa antes da alta',
        'OB Bearish: Último candle de alta antes da queda',
        'Frequentemente coincide com zonas de liquidez'
      ],
      howToTrade: [
        'Identifique movimento de impulso forte (displacement)',
        'Marque o último candle oposto antes do impulso',
        'Aguarde o preço retornar à zona do OB',
        'Entre com confirmação (pavio de rejeição)',
        'Alvo em liquidez ou OB oposto'
      ]
    },
    en: {
      title: 'Order Block (OB)',
      description: 'An Order Block is the last bullish or bearish candle before a strong market move. It represents areas where institutional orders were placed, creating zones of high probability reversals or continuations.',
      keyPoints: [
        'Last candle before strong impulse move',
        'Represents institutional positioning',
        'Bullish OB: Last down candle before rally',
        'Bearish OB: Last up candle before drop',
        'Often coincides with liquidity zones'
      ],
      howToTrade: [
        'Identify strong impulse move (displacement)',
        'Mark the last opposite candle before impulse',
        'Wait for price to return to OB zone',
        'Enter with confirmation (rejection wick)',
        'Target liquidity or opposite OB'
      ]
    }
  },
  killzone: {
    id: 'killzone',
    category: 'basics',
    pt: {
      title: 'Kill Zones',
      description: 'Kill Zones são janelas de tempo específicas quando traders institucionais estão mais ativos. Estes períodos veem o maior volume e os movimentos de preço mais significativos, tornando-os ideais para oportunidades de trading.',
      keyPoints: [
        'London Kill Zone: 02:00-05:00 EST (07:00-10:00 UTC)',
        'New York Kill Zone: 07:00-10:00 EST (12:00-15:00 UTC)',
        'Asian Kill Zone: 20:00-00:00 EST (01:00-05:00 UTC)',
        'Setups de maior probabilidade ocorrem nestes horários',
        'Combine com outros conceitos ICT para confluência'
      ],
      howToTrade: [
        'Identifique qual Kill Zone está ativa',
        'Procure varreduras de liquidez na abertura da sessão',
        'Aguarde mudança de estrutura ou formação de FVG',
        'Entre durante a janela da Kill Zone',
        'Alvo definido durante sessão anterior'
      ]
    },
    en: {
      title: 'Kill Zones',
      description: 'Kill Zones are specific time windows when institutional traders are most active. These periods see the highest volume and most significant price moves, making them optimal for trading opportunities.',
      keyPoints: [
        'London Kill Zone: 02:00-05:00 EST (07:00-10:00 UTC)',
        'New York Kill Zone: 07:00-10:00 EST (12:00-15:00 UTC)',
        'Asian Kill Zone: 20:00-00:00 EST (01:00-05:00 UTC)',
        'Highest probability setups occur in these times',
        'Combine with other ICT concepts for confluence'
      ],
      howToTrade: [
        'Identify which Kill Zone is active',
        'Look for liquidity sweeps at session open',
        'Wait for structure shift or FVG formation',
        'Enter during the Kill Zone window',
        'Target set during previous session'
      ]
    }
  },
  po3: {
    id: 'po3',
    category: 'advanced',
    pt: {
      title: 'Power of Three (PO3)',
      description: 'Power of Three descreve como players institucionais manipulam a ação do preço através de três fases distintas: Acumulação (lateralização), Manipulação (falso rompimento) e Distribuição (movimento real). Este padrão se repete em todos os timeframes.',
      keyPoints: [
        'Fase 1: Acumulação - Preço consolida',
        'Fase 2: Manipulação - Falso rompimento/caça stops',
        'Fase 3: Distribuição - Movimento real começa',
        'Arma traders de varejo com sinais falsos',
        'Ocorre durante todas as sessões de trading'
      ],
      howToTrade: [
        'Identifique range de consolidação (Acumulação)',
        'Observe falso rompimento (Manipulação)',
        'Aguarde reversão de volta ao range',
        'Entre na direção oposta da manipulação',
        'Alvo na liquidez do lado oposto'
      ]
    },
    en: {
      title: 'Power of Three (PO3)',
      description: 'Power of Three describes how institutional players manipulate price action through three distinct phases: Accumulation (ranging), Manipulation (false breakout), and Distribution (true move). This pattern repeats across all timeframes.',
      keyPoints: [
        'Phase 1: Accumulation - Price consolidates',
        'Phase 2: Manipulation - False breakout/stop hunt',
        'Phase 3: Distribution - Real move begins',
        'Traps retail traders with false signals',
        'Occurs during every trading session'
      ],
      howToTrade: [
        'Identify consolidation range (Accumulation)',
        'Watch for false breakout (Manipulation)',
        'Wait for reversal back into range',
        'Enter in opposite direction of manipulation',
        'Target liquidity on opposite side'
      ]
    }
  },
  silverbullet: {
    id: 'silverbullet',
    category: 'advanced',
    pt: {
      title: 'Silver Bullet',
      description: 'O Silver Bullet é um setup de alta probabilidade que ocorre durante janelas de tempo específicas: 03:00-04:00 EST (Londres) e 10:00-11:00 EST (Nova York). Estas janelas de uma hora frequentemente contêm o melhor trade do dia.',
      keyPoints: [
        'London Silver Bullet: 03:00-04:00 EST',
        'New York Silver Bullet: 10:00-11:00 EST',
        'Procure FVG ou Order Block durante a janela',
        'Padrões de reversão de alta probabilidade',
        'Um dos conceitos ICT mais poderosos'
      ],
      howToTrade: [
        'Aguarde a janela de tempo específica',
        'Identifique formação de FVG ou OB',
        'Procure varredura de liquidez primeiro',
        'Entre no retração ao FVG/OB',
        'Alvo 20-40 pips (scalp a intraday)'
      ]
    },
    en: {
      title: 'Silver Bullet',
      description: 'The Silver Bullet is a high-probability setup that occurs during specific time windows: 03:00-04:00 EST (London) and 10:00-11:00 EST (New York). These one-hour windows often contain the best trade of the day.',
      keyPoints: [
        'London Silver Bullet: 03:00-04:00 EST',
        'New York Silver Bullet: 10:00-11:00 EST',
        'Look for FVG or Order Block during window',
        'High probability reversal patterns',
        'One of the most powerful ICT concepts'
      ],
      howToTrade: [
        'Wait for the specific time window',
        'Identify FVG or OB formation',
        'Look for liquidity sweep first',
        'Enter on retracement to FVG/OB',
        'Target 20-40 pips (scalp to intraday)'
      ]
    }
  },
  mss: {
    id: 'mss',
    category: 'basics',
    pt: {
      title: 'Market Structure Shift (MSS)',
      description: 'Uma Mudança de Estrutura de Mercado ocorre quando o preço quebra uma máxima ou mínima significativa, indicando uma potencial mudança na direção da tendência. MSS é crucial para identificar pontos de virada principais no mercado.',
      keyPoints: [
        'MSS Bullish: Quebra acima de máxima anterior',
        'MSS Bearish: Quebra abaixo de mínima anterior',
        'Indica potencial reversão de tendência',
        'MSS de timeframe maior é mais significativo',
        'Frequentemente precedido por varredura de liquidez'
      ],
      howToTrade: [
        'Identifique a estrutura de mercado atual',
        'Aguarde quebra de nível chave',
        'Procure reteste da estrutura quebrada',
        'Entre com confirmação (FVG, OB)',
        'Siga a nova direção da tendência'
      ]
    },
    en: {
      title: 'Market Structure Shift (MSS)',
      description: 'A Market Structure Shift occurs when price breaks a significant high or low, indicating a potential change in trend direction. MSS is crucial for identifying major turning points in the market.',
      keyPoints: [
        'Bullish MSS: Break above previous high',
        'Bearish MSS: Break below previous low',
        'Indicates potential trend reversal',
        'Higher timeframe MSS more significant',
        'Often preceded by liquidity sweep'
      ],
      howToTrade: [
        'Identify the current market structure',
        'Wait for break of key level',
        'Look for retest of broken structure',
        'Enter on confirmation (FVG, OB)',
        'Ride the new trend direction'
      ]
    }
  },
  liquidity: {
    id: 'liquidity',
    category: 'advanced',
    pt: {
      title: 'Liquidity Sweeps',
      description: 'Varreduras de Liquidez ocorrem quando o preço move-se temporariamente além de máximas/mínimas óbvias para acionar stop losses, depois rapidamente reverte. Instituições usam estes movimentos para preencher ordens grandes antes do movimento real.',
      keyPoints: [
        'Buyside Liquidity: Stops acima das máximas',
        'Sellside Liquidity: Stops abaixo das mínimas',
        'Máximas/mínimas iguais = pools de liquidez',
        'Instituições precisam de liquidez para ordens grandes',
        'Varredura frequentemente precede reversão forte'
      ],
      howToTrade: [
        'Identifique máximas ou mínimas iguais (liquidez)',
        'Aguarde preço varrer além delas',
        'Procure rejeição/reversão rápida',
        'Entre após confirmação da varredura',
        'Alvo na liquidez do lado oposto'
      ]
    },
    en: {
      title: 'Liquidity Sweeps',
      description: 'Liquidity Sweeps occur when price temporarily moves beyond obvious highs/lows to trigger stop losses, then quickly reverses. Institutions use these moves to fill large orders before the real move.',
      keyPoints: [
        'Buyside Liquidity: Stops above highs',
        'Sellside Liquidity: Stops below lows',
        'Equal highs/lows = liquidity pools',
        'Institutions need liquidity for large orders',
        'Sweep often precedes strong reversal'
      ],
      howToTrade: [
        'Identify equal highs or lows (liquidity)',
        'Wait for price to sweep beyond them',
        'Look for quick rejection/reversal',
        'Enter after sweep confirmation',
        'Target opposite side liquidity'
      ]
    }
  },
  breakerblock: {
    id: 'breakerblock',
    category: 'advanced',
    pt: {
      title: 'Breaker Block',
      description: 'Um Breaker Block é um Order Block falhado que foi quebrado. Uma vez quebrado, frequentemente atua como suporte/resistência na direção oposta, fornecendo setups de trade de alta probabilidade.',
      keyPoints: [
        'Order Block falhado torna-se Breaker',
        'Mudança de polaridade: Suporte vira resistência',
        'Zona de rejeição forte após quebra',
        'Combina conceitos de OB e MSS',
        'Muito confiável para entradas'
      ],
      howToTrade: [
        'Identifique Order Block que é quebrado',
        'Aguarde preço retornar ao OB quebrado',
        'Procure rejeição no nível do Breaker',
        'Entre na nova direção da tendência',
        'Alvo na próxima zona de liquidez'
      ]
    },
    en: {
      title: 'Breaker Block',
      description: 'A Breaker Block is a failed Order Block that has been broken through. Once broken, it often acts as support/resistance in the opposite direction, providing high-probability trade setups.',
      keyPoints: [
        'Failed Order Block becomes Breaker',
        'Polarity switch: Support becomes resistance',
        'Strong rejection zone after break',
        'Combines OB and MSS concepts',
        'Very reliable for entries'
      ],
      howToTrade: [
        'Identify Order Block that gets broken',
        'Wait for price to return to broken OB',
        'Look for rejection at Breaker level',
        'Enter in new trend direction',
        'Target next liquidity zone'
      ]
    }
  },
  nwog: {
    id: 'nwog',
    category: 'basics',
    pt: {
      title: 'New Week Opening Gap (NWOG)',
      description: 'NWOG é o gap entre o fechamento de sexta-feira e a abertura de domingo. O preço frequentemente move-se para preencher este gap durante a semana, tornando-o um ponto de referência chave para viés semanal e alvos.',
      keyPoints: [
        'Gap entre fechamento de sexta e abertura de domingo',
        'Preço tende a preencher o gap durante a semana',
        'Pode atuar como ímã para o preço',
        'Ajuda a determinar viés semanal',
        'Combine com gaps diários/de sessão (NDOG)'
      ],
      howToTrade: [
        'Identifique o gap na abertura de domingo',
        'Note se o gap está acima ou abaixo do preço',
        'Espere movimento em direção ao gap durante a semana',
        'Use como alvo ou zona de entrada',
        'Observe rejeição no preenchimento do gap'
      ]
    },
    en: {
      title: 'New Week Opening Gap (NWOG)',
      description: 'NWOG is the gap between Friday close and Sunday open. Price often moves to fill this gap during the week, making it a key reference point for weekly bias and targets.',
      keyPoints: [
        'Gap between Friday close and Sunday open',
        'Price tends to fill gap during week',
        'Can act as magnet for price',
        'Helps determine weekly bias',
        'Combine with daily/session gaps (NDOG)'
      ],
      howToTrade: [
        'Identify gap on Sunday open',
        'Note if gap is above or below price',
        'Expect move toward gap during week',
        'Use as target or entry zone',
        'Watch for rejection at gap fill'
      ]
    }
  },
  ote: {
    id: 'ote',
    category: 'advanced',
    pt: {
      title: 'Optimal Trade Entry (OTE)',
      description: 'OTE refere-se à zona de entrada ideal dentro de um retração, tipicamente o nível de retração Fibonacci de 62-79%. Esta zona oferece o melhor risco-recompensa para entrar a favor da tendência.',
      keyPoints: [
        'Sweet spot: Retração Fibonacci de 62-79%',
        'Nível de 70.5% é a "zona dourada"',
        'Onde instituições re-entram em posições',
        'Combina com FVG e OB para confluência',
        'Paciência necessária para aguardar OTE'
      ],
      howToTrade: [
        'Identifique movimento de impulso forte',
        'Desenhe Fibonacci de mínima a máxima (ou reverso)',
        'Aguarde retração à zona de 62-79%',
        'Procure FVG ou OB no nível OTE',
        'Entre com stop apertado para excelente R:R'
      ]
    },
    en: {
      title: 'Optimal Trade Entry (OTE)',
      description: 'OTE refers to the ideal entry zone within a retracement, typically the 62-79% Fibonacci retracement level. This zone offers the best risk-reward for entering with trend.',
      keyPoints: [
        'Sweet spot: 62-79% Fibonacci retracement',
        '70.5% level is the "golden zone"',
        'Where institutions re-enter positions',
        'Combines with FVG and OB for confluence',
        'Patience required to wait for OTE'
      ],
      howToTrade: [
        'Identify strong impulse move',
        'Draw Fibonacci from low to high (or reverse)',
        'Wait for retracement to 62-79% zone',
        'Look for FVG or OB at OTE level',
        'Enter with tight stop for excellent R:R'
      ]
    }
  },
  displacement: {
    id: 'displacement',
    category: 'basics',
    pt: {
      title: 'Displacement',
      description: 'Displacement é um movimento de preço rápido e forte que quebra estrutura de mercado e frequentemente cria Fair Value Gaps. Sinaliza participação institucional e potencial mudança de tendência.',
      keyPoints: [
        'Movimento de preço rápido e forte',
        'Frequentemente cria múltiplos FVGs',
        'Quebra estrutura de mercado anterior',
        'Indica atividade institucional',
        'Precede nova tendência ou continuação'
      ],
      howToTrade: [
        'Aguarde displacement completar',
        'Identifique FVGs criados durante o movimento',
        'Espere retração ao FVG',
        'Entre na direção do displacement',
        'Espere continuação após retração'
      ]
    },
    en: {
      title: 'Displacement',
      description: 'Displacement is a rapid, strong price move that breaks market structure and often creates Fair Value Gaps. It signals institutional participation and potential trend change.',
      keyPoints: [
        'Rapid, strong price movement',
        'Often creates multiple FVGs',
        'Breaks previous market structure',
        'Indicates institutional activity',
        'Precedes new trend or continuation'
      ],
      howToTrade: [
        'Wait for displacement to complete',
        'Identify FVGs created during move',
        'Wait for retracement to FVG',
        'Enter in direction of displacement',
        'Expect continuation after retracement'
      ]
    }
  },
  imbalance: {
    id: 'imbalance',
    category: 'basics',
    pt: {
      title: 'Imbalance / Inefficiency',
      description: 'Imbalance (também chamado ineficiência) ocorre quando o preço move-se sem leilão adequado de dois lados. Estas áreas representam preços injustos que o mercado procura reequilibrar.',
      keyPoints: [
        'Mesmo conceito que Fair Value Gap',
        'Preço moveu sem negociação adequada',
        'Cria zonas de efeito magnético',
        'Mercado busca reequilibrar preço',
        'Múltiplos tipos: FVG, SIBI, BISI'
      ],
      howToTrade: [
        'Identifique imbalance no gráfico',
        'Note a direção do imbalance',
        'Aguarde preço revisitar a zona',
        'Entre quando preço reequilibra',
        'Alvo no próximo imbalance ou liquidez'
      ]
    },
    en: {
      title: 'Imbalance / Inefficiency',
      description: 'Imbalance (also called inefficiency) occurs when price moves without adequate two-sided auction. These areas represent unfair prices that the market seeks to rebalance.',
      keyPoints: [
        'Same concept as Fair Value Gap',
        'Price moved without proper trading',
        'Creates zones of magnetic effect',
        'Market seeks to rebalance price',
        'Multiple types: FVG, SIBI, BISI'
      ],
      howToTrade: [
        'Identify imbalance on chart',
        'Note the imbalance direction',
        'Wait for price to revisit zone',
        'Enter when price rebalances',
        'Target next imbalance or liquidity'
      ]
    }
  }
};

const ICTKnowledgeModalV2 = ({ isOpen, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedConcept, setSelectedConcept] = useState('fvg');
  const [activeCategory, setActiveCategory] = useState('all');
  const [language, setLanguage] = useState('pt'); // pt ou en

  // Carregar preferência de idioma do localStorage
  useEffect(() => {
    const savedLang = localStorage.getItem('ict_language');
    if (savedLang) {
      setLanguage(savedLang);
    }
  }, []);

  // Salvar preferência de idioma
  const toggleLanguage = () => {
    const newLang = language === 'pt' ? 'en' : 'pt';
    setLanguage(newLang);
    localStorage.setItem('ict_language', newLang);
  };

  if (!isOpen) return null;

  const concept = ICT_CONCEPTS_DATA[selectedConcept];
  const content = concept[language];

  // Textos da interface em PT e EN
  const ui = {
    pt: {
      title: 'Central de Conhecimento ICT',
      subtitle: 'Aprenda conceitos Inner Circle Trader',
      search: 'Buscar conceitos...',
      all: 'Todos',
      basics: '📊 Básico',
      advanced: '⚡ Avançado',
      whatIsIt: '💡 O que é?',
      visualization: '🎬 Visualização',
      keyPoints: '🎯 Pontos Chave',
      howToTrade: '🎓 Como Operar',
      educational: 'ℹ️ Conteúdo educacional - Não é aconselhamento financeiro',
      close: 'Fechar',
      noResults: 'Nenhum conceito encontrado'
    },
    en: {
      title: 'ICT Knowledge Hub',
      subtitle: 'Learn Inner Circle Trader concepts',
      search: 'Search concepts...',
      all: 'All',
      basics: '📊 Basics',
      advanced: '⚡ Advanced',
      whatIsIt: '💡 What is it?',
      visualization: '🎬 Visualization',
      keyPoints: '🎯 Key Points',
      howToTrade: '🎓 How to Trade',
      educational: 'ℹ️ Educational content - Not financial advice',
      close: 'Close',
      noResults: 'No concepts found'
    }
  };

  const t = ui[language];

  // Filtrar conceitos
  const filteredConcepts = Object.values(ICT_CONCEPTS_DATA).filter(c => {
    const conceptContent = c[language];
    const matchesSearch = conceptContent.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         conceptContent.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeCategory === 'all' || c.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-fadeIn">
      <div className="bg-gray-900 rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden border border-gray-800 shadow-2xl flex flex-col">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-900 to-blue-900 p-6 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="text-4xl">📚</span>
            <div>
              <h2 className="text-white text-2xl font-bold">{t.title}</h2>
              <p className="text-gray-300 text-sm">{t.subtitle}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Language Toggle */}
            <button
              onClick={toggleLanguage}
              className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2"
            >
              <span className="text-xl">{language === 'pt' ? '🇧🇷' : '🇺🇸'}</span>
              <span>{language === 'pt' ? 'PT' : 'EN'}</span>
            </button>
            
            <button
              onClick={onClose}
              className="text-gray-300 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar - Lista de conceitos */}
          <div className="w-80 bg-gray-950 border-r border-gray-800 overflow-y-auto">
            <div className="p-4">
              {/* Search */}
              <div className="mb-4">
                <div className="relative">
                  <input
                    type="text"
                    placeholder={t.search}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 pl-10 bg-gray-900 border border-gray-800 rounded-lg text-white focus:outline-none focus:border-purple-500 transition-colors"
                  />
                  <svg className="w-5 h-5 text-gray-500 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>

              {/* Category Filter */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setActiveCategory('all')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                    activeCategory === 'all' 
                      ? 'bg-purple-600 text-white' 
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {t.all}
                </button>
                <button
                  onClick={() => setActiveCategory('basics')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                    activeCategory === 'basics' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {t.basics}
                </button>
                <button
                  onClick={() => setActiveCategory('advanced')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                    activeCategory === 'advanced' 
                      ? 'bg-orange-600 text-white' 
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {t.advanced}
                </button>
              </div>

              {/* Concepts List */}
              <div className="space-y-2">
                {filteredConcepts.map((c) => {
                  const cContent = c[language];
                  return (
                    <button
                      key={c.id}
                      onClick={() => setSelectedConcept(c.id)}
                      className={`w-full text-left p-3 rounded-lg transition-all ${
                        selectedConcept === c.id
                          ? 'bg-purple-600 text-white shadow-lg'
                          : 'bg-gray-900 text-gray-300 hover:bg-gray-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm">{cContent.title}</span>
                        {c.category === 'basics' && (
                          <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">
                            {language === 'pt' ? 'Básico' : 'Basic'}
                          </span>
                        )}
                        {c.category === 'advanced' && (
                          <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded">
                            {language === 'pt' ? 'Avançado' : 'Advanced'}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {filteredConcepts.length === 0 && (
                <div className="text-center py-10">
                  <p className="text-gray-500">{t.noResults}</p>
                </div>
              )}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {concept && (
              <>
                {/* Title */}
                <div className="mb-6">
                  <h3 className="text-white text-3xl font-bold mb-2">{content.title}</h3>
                  <span className={`text-xs px-3 py-1 rounded-full font-bold ${
                    concept.category === 'basics' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-orange-600 text-white'
                  }`}>
                    {concept.category === 'basics' 
                      ? (language === 'pt' ? '📊 BÁSICO' : '📊 BASICS')
                      : (language === 'pt' ? '⚡ AVANÇADO' : '⚡ ADVANCED')
                    }
                  </span>
                </div>

                {/* Description */}
                <div className="mb-6">
                  <h4 className="text-purple-400 font-semibold mb-2 flex items-center gap-2">
                    <span>{t.whatIsIt}</span>
                  </h4>
                  <p className="text-gray-300 leading-relaxed">{content.description}</p>
                </div>

                {/* Animated Chart */}
                <div className="mb-6">
                  <h4 className="text-purple-400 font-semibold mb-3 flex items-center gap-2">
                    <span>{t.visualization}</span>
                  </h4>
                  <AnimatedICTChart concept={selectedConcept} language={language} />
                </div>

                {/* Key Points */}
                <div className="mb-6">
                  <h4 className="text-purple-400 font-semibold mb-3 flex items-center gap-2">
                    <span>{t.keyPoints}</span>
                  </h4>
                  <ul className="space-y-2">
                    {content.keyPoints.map((point, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-gray-300">
                        <span className="text-purple-400 mt-1">•</span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* How to Trade */}
                <div className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 rounded-lg p-6 border border-purple-800/30">
                  <h4 className="text-purple-400 font-semibold mb-3 flex items-center gap-2">
                    <span>{t.howToTrade}</span>
                  </h4>
                  <ol className="space-y-3">
                    {content.howToTrade.map((step, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-gray-300">
                        <span className="bg-purple-600 text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-sm font-bold">
                          {idx + 1}
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-950 border-t border-gray-800 p-4 flex justify-between items-center">
          <p className="text-gray-500 text-sm">
            {t.educational}
          </p>
          <button
            onClick={onClose}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
          >
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ICTKnowledgeModalV2;