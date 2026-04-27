import { render } from '@react-email/render';
import { describe, expect, it } from 'vitest';
import { DailyBriefing, WeeklyRecap, Welcome, Upgrade } from '../templates';
import type {
  DailyBriefingProps,
  WeeklyRecapProps,
  WelcomeProps,
  UpgradeProps,
} from '../types';

const dailyProps: DailyBriefingProps = {
  date: '2026-04-27',
  locale: 'pt-BR',
  plan: 'pro',
  marketBias: 'risk-off',
  overnight: 'Asia abriu pesada após Treasuries de 10y subirem 6bps.',
  today: [
    { time: '09:30', ticker: 'CPI', label: 'US CPI YoY · cons. 3.1%', impact: 'high' },
    { time: '11:00', ticker: 'BCB', label: 'Ata do Copom', impact: 'med' },
  ],
  tomorrow: 'FOMC quinta. Reduzir tamanho até 14:00.',
  principle: { quote: 'O risco vem de não saber o que se está fazendo.', attribution: 'Howard Marks' },
  unsubscribeUrl: 'https://wealth.investing/u?t=test',
  appUrl: 'https://wealth.investing/app',
};

const weeklyProps: WeeklyRecapProps = {
  date: '2026-04-26',
  locale: 'pt-BR',
  firstName: 'Pedro',
  trades: [
    { asset: 'EURUSD', direction: 'long', pnl: 312.5, pnlPct: 0.62, note: 'CPI miss' },
    { asset: 'WIN', direction: 'short', pnl: -180.0, pnlPct: -0.36 },
  ],
  pnlPct: 1.42,
  winRate: 0.6,
  lesson: 'Reduza tamanho na contra-tendência.',
  unsubscribeUrl: 'https://wealth.investing/u?t=test',
  appUrl: 'https://wealth.investing/app',
};

const welcomeProps: WelcomeProps = {
  firstName: 'Pedro',
  locale: 'pt-BR',
  trialEndsAt: '2026-05-10T23:59:59Z',
  unsubscribeUrl: 'https://wealth.investing/u?t=test',
  appUrl: 'https://wealth.investing/app',
};

const upgradeProps: UpgradeProps = {
  firstName: 'Pedro',
  locale: 'pt-BR',
  currentPlan: 'pro',
  targetPlan: 'ultra',
  couponCode: 'IMERSAOHSM',
  couponPctOff: 30,
  validUntil: '2026-05-15T23:59:59Z',
  unsubscribeUrl: 'https://wealth.investing/u?t=test',
  pricingUrl: 'https://wealth.investing/pricing',
};

describe('email templates', () => {
  it('DailyBriefing renders to HTML', async () => {
    const html = await render(<DailyBriefing {...dailyProps} />);
    expect(html).toContain('wealth.Investing');
    expect(html).toContain('Bom dia');
    expect(html).toContain('CPI');
    expect(html).toContain('Howard Marks');
    expect(html).toMatchSnapshot();
  });

  it('DailyBriefing free plan trims to 2 events', async () => {
    const html = await render(<DailyBriefing {...dailyProps} plan="free" today={[
      ...dailyProps.today,
      { time: '14:30', ticker: 'EIA', label: 'Estoques de petróleo', impact: 'med' },
    ]} />);
    expect(html).toContain('CPI');
    expect(html).not.toContain('EIA');
  });

  it('WeeklyRecap renders to HTML', async () => {
    const html = await render(<WeeklyRecap {...weeklyProps} />);
    expect(html).toContain('Recap semanal');
    expect(html).toContain('EURUSD');
    expect(html).toContain('Reduza tamanho');
    expect(html).toMatchSnapshot();
  });

  it('Welcome renders to HTML', async () => {
    const html = await render(<Welcome {...welcomeProps} />);
    expect(html).toContain('Bem-vindo, Pedro');
    expect(html).toContain('Importe sua corretora');
    expect(html).toMatchSnapshot();
  });

  it('Upgrade renders coupon block when provided', async () => {
    const html = await render(<Upgrade {...upgradeProps} />);
    expect(html).toContain('IMERSAOHSM');
    expect(html).toContain('30% off');
    expect(html).toMatchSnapshot();
  });

  it('Upgrade omits coupon block when absent', async () => {
    const html = await render(<Upgrade {...upgradeProps} couponCode={undefined} couponPctOff={undefined} />);
    expect(html).not.toContain('IMERSAOHSM');
    expect(html).not.toContain('CUPOM');
  });

  it('en-US locale renders English copy', async () => {
    const html = await render(<DailyBriefing {...dailyProps} locale="en-US" />);
    expect(html).toContain('Good morning');
    expect(html).toContain('Unsubscribe');
  });
});
