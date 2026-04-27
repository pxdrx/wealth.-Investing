import { Img, Section, Text } from '@react-email/components';
import * as React from 'react';
import { CTAButton, EmailShell, PullQuote, TradeRow } from '../components';
import type { Locale, WeeklyRecapProps } from '../types';
import { colors, fontStacks, fontSize, fontWeight, lineHeight, spacing } from '../tokens';

const COPY: Record<Locale, {
  preheader: (pct: string) => string;
  title: string;
  greeting: (name: string) => string;
  subtitle: string;
  pnlLabel: string;
  winRateLabel: string;
  ctaLabel: string;
  tradesLabel: string;
}> = {
  'pt-BR': {
    preheader: (pct) => `Sua semana fechou em ${pct}. Trades, drawdown e a lição da semana.`,
    title: 'Recap semanal',
    greeting: (name) => `Olá, ${name}.`,
    subtitle: 'Domingo de revisão. Aqui está sua semana.',
    pnlLabel: 'PnL DA SEMANA',
    winRateLabel: 'TAXA DE ACERTO',
    ctaLabel: 'Abrir dashboard',
    tradesLabel: 'OPERAÇÕES',
  },
  'en-US': {
    preheader: (pct) => `Your week closed at ${pct}. Trades, drawdown and the lesson of the week.`,
    title: 'Weekly recap',
    greeting: (name) => `Hi, ${name}.`,
    subtitle: 'Sunday review. Here is your week.',
    pnlLabel: 'WEEKLY PNL',
    winRateLabel: 'WIN RATE',
    ctaLabel: 'Open dashboard',
    tradesLabel: 'TRADES',
  },
};

function formatPct(pct: number): string {
  const sign = pct > 0 ? '+' : pct < 0 ? '−' : '';
  return `${sign}${Math.abs(pct).toFixed(2)}%`;
}

export function WeeklyRecap(props: WeeklyRecapProps) {
  const { date, locale, firstName, trades, pnlPct, winRate, lesson, unsubscribeUrl, appUrl } = props;
  const copy = COPY[locale];
  const pnlColor = pnlPct >= 0 ? colors.green : colors.danger;

  const labelStyle: React.CSSProperties = {
    margin: 0,
    fontFamily: fontStacks.mono,
    fontSize: fontSize.xs,
    letterSpacing: '0.08em',
    color: colors.ink2,
    textTransform: 'uppercase',
    fontWeight: fontWeight.semibold,
  };

  return (
    <EmailShell
      preheader={copy.preheader(formatPct(pnlPct))}
      title={`${copy.title} — ${date}`}
      locale={locale}
      unsubscribeUrl={unsubscribeUrl}
    >
      {/* Greeting */}
      <Section>
        <Text
          style={{
            margin: 0,
            fontFamily: fontStacks.serif,
            fontSize: fontSize.xl,
            fontWeight: fontWeight.semibold,
            color: colors.ink,
            lineHeight: lineHeight.tight,
            letterSpacing: '-0.015em',
          }}
        >
          {copy.greeting(firstName)}
        </Text>
        <Text
          style={{
            margin: `${spacing[1]}px 0 0 0`,
            fontSize: fontSize.base,
            color: colors.ink2,
            lineHeight: lineHeight.snug,
          }}
        >
          {copy.subtitle}
        </Text>
      </Section>

      {/* PnL + Win rate hero */}
      <Section
        style={{
          marginTop: spacing[5],
          padding: spacing[5],
          backgroundColor: colors.paper2,
          borderRadius: 12,
        }}
      >
        <table cellPadding={0} cellSpacing={0} role="presentation" style={{ width: '100%' }}>
          <tbody>
            <tr>
              <td style={{ verticalAlign: 'top', width: '50%' }}>
                <Text style={labelStyle}>{copy.pnlLabel}</Text>
                <Text
                  style={{
                    margin: `${spacing[2]}px 0 0 0`,
                    fontFamily: fontStacks.mono,
                    fontSize: fontSize.display,
                    fontWeight: fontWeight.semibold,
                    color: pnlColor,
                    lineHeight: lineHeight.tight,
                  }}
                >
                  {formatPct(pnlPct)}
                </Text>
              </td>
              <td style={{ verticalAlign: 'top', width: '50%' }}>
                <Text style={labelStyle}>{copy.winRateLabel}</Text>
                <Text
                  style={{
                    margin: `${spacing[2]}px 0 0 0`,
                    fontFamily: fontStacks.mono,
                    fontSize: fontSize.display,
                    fontWeight: fontWeight.semibold,
                    color: colors.ink,
                    lineHeight: lineHeight.tight,
                  }}
                >
                  {`${(winRate * 100).toFixed(0)}%`}
                </Text>
              </td>
            </tr>
          </tbody>
        </table>
      </Section>

      {/* Equity curve placeholder · Track B injects signed URL at render time */}
      <Section style={{ marginTop: spacing[5], textAlign: 'center' }}>
        {/* Track B: inject signed URL (e.g. server-side chart render). src='' renders nothing. */}
        <Img
          src=""
          alt="Equity curve"
          width={536}
          height={180}
          style={{ display: 'block', borderRadius: 8, width: '100%', height: 'auto' }}
        />
      </Section>

      {/* Trades */}
      <Section style={{ marginTop: spacing[5] }}>
        <Text style={labelStyle}>{copy.tradesLabel}</Text>
        <div style={{ marginTop: spacing[2] }}>
          {trades.map((t, i) => (
            <TradeRow key={`${t.asset}-${i}`} {...t} locale={locale} />
          ))}
        </div>
      </Section>

      {/* Lesson */}
      <PullQuote quote={lesson} />

      {/* CTA */}
      <Section style={{ marginTop: spacing[4] }}>
        <CTAButton href={appUrl} label={copy.ctaLabel} variant="primary" />
      </Section>
    </EmailShell>
  );
}

export default WeeklyRecap;
