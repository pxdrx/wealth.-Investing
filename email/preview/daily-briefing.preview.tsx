import * as React from 'react';
import DailyBriefing from '../templates/DailyBriefing';

const PROPS = {
  date: '2026-04-25',
  locale: 'pt-BR' as const,
  plan: 'pro' as const,
  marketBias: 'risk-off' as const,
  firstName: 'João',
  editionNumber: 42,
  overnight:
    'CPI americano às 09:30 é o evento que define o tom da semana. Mercado precifica leitura abaixo do consenso — qualquer surpresa pra cima joga DXY pra 105+ e pressiona ativos de risco. ECB às 14:30 e Selic às 16:00 são previsíveis: sem corte.',
  today: [
    { time: '09:30', ticker: 'USD', label: 'CPI MoM & Core CPI YoY', impact: 'high' as const },
    { time: '14:30', ticker: 'EUR', label: 'ECB Rate Decision', impact: 'high' as const },
    { time: '16:00', ticker: 'BRL', label: 'Selic Meeting Minutes', impact: 'med' as const },
    { time: '17:30', ticker: 'USD', label: 'Fed Speech (Powell)', impact: 'low' as const },
  ],
  tomorrow: 'FOMC quinta. Vol esperado em DXY e duration; reduzir tamanho até 14:00 BRT.',
  principle: {
    quote: 'O risco vem de não saber o que se está fazendo.',
    attribution: 'Howard Marks',
  },
  yesterdaySession: { trades: 3, pnl: 240, winRate: 67 },
  streak: { days: 4, nextMarker: 7 },
  headlines: [
    { title: 'Fed sinaliza pausa em corte; mercado precifica 60% de hold em junho', source: 'Reuters', hoursAgo: 4 },
    { title: 'Petróleo recua 2% com estoques americanos em alta surpreendente', source: 'Bloomberg', hoursAgo: 6 },
    { title: 'Lagarde: "ECB segue dependente de dados, sem compromisso"', source: 'FT', hoursAgo: 8 },
  ],
  assetImpacts: [
    { ticker: 'DXY', arrow: 'up' as const },
    { ticker: 'EURUSD', arrow: 'down' as const },
    { ticker: 'IBOV', arrow: 'down' as const },
    { ticker: 'GOLD', arrow: 'flat' as const },
    { ticker: 'BTC', arrow: 'flat' as const },
  ],
  unsubscribeUrl: 'https://owealthinvesting.com/u?t=preview',
  appUrl: 'https://owealthinvesting.com/app',
};

export default function Preview() {
  return <DailyBriefing {...PROPS} />;
}
