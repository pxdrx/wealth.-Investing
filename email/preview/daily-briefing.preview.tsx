import * as React from 'react';
import DailyBriefing from '../templates/DailyBriefing';

const PROPS = {
  date: '2026-04-27',
  locale: 'pt-BR' as const,
  plan: 'pro' as const,
  marketBias: 'risk-off' as const,
  overnight:
    'Asia abriu pesada após Treasuries de 10y subirem 6bps na sessão noturna. Yen consolidou abaixo de 152, dólar avançou contra G10. Comentários hawkish do BoJ trouxeram volatilidade extra em pares JPY. Petróleo cedeu 1.2% com inventários acima do esperado.',
  today: [
    { time: '09:30', ticker: 'CPI', label: 'US CPI YoY · cons. 3.1% · prev. 3.2%', impact: 'high' as const },
    { time: '11:00', ticker: 'BCB', label: 'Ata do Copom · viés do BC pós-corte', impact: 'med' as const },
    { time: '14:30', ticker: 'EIA', label: 'Estoques de petróleo bruto · cons. -2.5M', impact: 'med' as const },
    { time: '15:00', ticker: 'POW', label: 'Powell discursa em Brookings', impact: 'high' as const },
    { time: '17:00', ticker: 'AAPL', label: 'Earnings Q1 · pós-fechamento', impact: 'med' as const },
  ],
  tomorrow: 'FOMC quinta. Vol esperado em DXY e duration; reduzir tamanho até 14:00 BRT.',
  principle: {
    quote: 'O risco vem de não saber o que se está fazendo.',
    attribution: 'Howard Marks',
  },
  unsubscribeUrl: 'https://wealth.investing/u?t=preview',
  appUrl: 'https://wealth.investing/app',
};

export default function Preview() {
  return <DailyBriefing {...PROPS} />;
}
