import { Section, Text } from '@react-email/components';
import * as React from 'react';
import { CTAButton, EmailShell } from '../components';
import type { Locale, WelcomeProps } from '../types';
import { colors, fontStacks, fontSize, fontWeight, lineHeight, spacing } from '../tokens';

const COPY: Record<Locale, {
  preheader: string;
  title: string;
  greeting: (n: string) => string;
  subtitle: string;
  trial: (date: string) => string;
  steps: { label: string; title: string; body: string }[];
  ctaLabel: string;
}> = {
  'pt-BR': {
    preheader: 'Bem-vindo à wealth.Investing. Comece em 3 passos.',
    title: 'Bem-vindo',
    greeting: (n) => `Bem-vindo, ${n}.`,
    subtitle: 'Em poucos minutos sua mesa de trabalho está pronta. Comece pelos 3 passos abaixo.',
    trial: (date) =>
      `Seu trial vai até ${new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}.`,
    steps: [
      {
        label: '01',
        title: 'Importe sua corretora',
        body: 'CSV do MetaTrader, Tradovate ou NinjaTrader. O parser adapta o formato.',
      },
      {
        label: '02',
        title: 'Defina seu risco',
        body: 'Configure DD máximo, regra do dia e alvo. A plataforma monitora sozinha.',
      },
      {
        label: '03',
        title: 'Receba o briefing macro',
        body: 'Eventos, sentimento e contexto chegam todo dia às 7h BRT.',
      },
    ],
    ctaLabel: 'Abrir dashboard',
  },
  'en-US': {
    preheader: 'Welcome to wealth.Investing. Get started in 3 steps.',
    title: 'Welcome',
    greeting: (n) => `Welcome, ${n}.`,
    subtitle: 'Your workspace is ready in minutes. Start with the 3 steps below.',
    trial: (date) =>
      `Your trial ends on ${new Date(date).toLocaleDateString('en-US', { day: '2-digit', month: 'long' })}.`,
    steps: [
      {
        label: '01',
        title: 'Import your broker',
        body: 'MetaTrader, Tradovate or NinjaTrader CSV. The parser adapts to the format.',
      },
      {
        label: '02',
        title: 'Set your risk',
        body: 'Configure max drawdown, daily rule and target. The platform watches it for you.',
      },
      {
        label: '03',
        title: 'Receive the macro briefing',
        body: 'Events, sentiment and context arrive every day at 7am BRT.',
      },
    ],
    ctaLabel: 'Open dashboard',
  },
};

export function Welcome({ firstName, locale, trialEndsAt, unsubscribeUrl, appUrl }: WelcomeProps) {
  const copy = COPY[locale];

  return (
    <EmailShell preheader={copy.preheader} title={copy.title} locale={locale} unsubscribeUrl={unsubscribeUrl}>
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
            margin: `${spacing[2]}px 0 0 0`,
            fontSize: fontSize.base,
            color: colors.ink2,
            lineHeight: lineHeight.normal,
          }}
        >
          {copy.subtitle}
        </Text>
        <Text
          style={{
            margin: `${spacing[3]}px 0 0 0`,
            fontFamily: fontStacks.mono,
            fontSize: fontSize.xs,
            color: colors.greenDeep,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            fontWeight: fontWeight.medium,
          }}
        >
          {copy.trial(trialEndsAt)}
        </Text>
      </Section>

      {/* 3 step cards */}
      <Section style={{ marginTop: spacing[5] }}>
        {copy.steps.map((s) => (
          <table
            key={s.label}
            cellPadding={0}
            cellSpacing={0}
            role="presentation"
            style={{
              width: '100%',
              marginBottom: spacing[3],
              backgroundColor: colors.paper2,
              borderRadius: 12,
            }}
          >
            <tbody>
              <tr>
                <td style={{ padding: spacing[5], verticalAlign: 'top', width: 56 }}>
                  <span
                    style={{
                      fontFamily: fontStacks.mono,
                      fontSize: fontSize.lg,
                      color: colors.green,
                      fontWeight: fontWeight.semibold,
                    }}
                  >
                    {s.label}
                  </span>
                </td>
                <td style={{ padding: `${spacing[5]}px ${spacing[5]}px ${spacing[5]}px 0`, verticalAlign: 'top' }}>
                  <Text
                    style={{
                      margin: 0,
                      fontFamily: fontStacks.serif,
                      fontSize: fontSize.md,
                      fontWeight: fontWeight.semibold,
                      color: colors.ink,
                      lineHeight: lineHeight.tight,
                    }}
                  >
                    {s.title}
                  </Text>
                  <Text
                    style={{
                      margin: `${spacing[2]}px 0 0 0`,
                      fontSize: fontSize.sm,
                      color: colors.ink2,
                      lineHeight: lineHeight.snug,
                    }}
                  >
                    {s.body}
                  </Text>
                </td>
              </tr>
            </tbody>
          </table>
        ))}
      </Section>

      <Section style={{ marginTop: spacing[5] }}>
        <CTAButton href={appUrl} label={copy.ctaLabel} variant="primary" />
      </Section>
    </EmailShell>
  );
}

export default Welcome;
