import * as React from 'react';
import WeeklyRecap from '../templates/WeeklyRecap';

const PROPS = {
  date: '2026-04-26',
  locale: 'pt-BR' as const,
  firstName: 'Pedro',
  trades: [
    { asset: 'EURUSD', direction: 'long' as const, pnl: 312.5, pnlPct: 0.62, note: 'CPI miss · stop no rompimento' },
    { asset: 'WIN', direction: 'short' as const, pnl: -180.0, pnlPct: -0.36 },
    { asset: 'NQ', direction: 'long' as const, pnl: 540.0, pnlPct: 1.08, note: 'Pullback no VWAP do 5min' },
    { asset: 'GBPJPY', direction: 'short' as const, pnl: -95.25, pnlPct: -0.19 },
    { asset: 'USDJPY', direction: 'long' as const, pnl: 220.0, pnlPct: 0.44 },
    { asset: 'XAUUSD', direction: 'long' as const, pnl: 410.0, pnlPct: 0.82, note: 'Quebra do range asiático' },
  ],
  pnlPct: 2.41,
  winRate: 0.66,
  lesson:
    'Reduza tamanho na contra-tendência. Quatro dos seis trades ganharam tracionando o fluxo dominante; os dois perdedores foram fades.',
  unsubscribeUrl: 'https://wealth.investing/u?t=preview',
  appUrl: 'https://wealth.investing/app',
};

export default function Preview() {
  return <WeeklyRecap {...PROPS} />;
}
