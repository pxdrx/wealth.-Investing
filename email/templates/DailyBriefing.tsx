import { Section, Text } from '@react-email/components';
import * as React from 'react';
import {
  EmailShell,
  BriefingCard,
  CalendarRow,
  CTAButton,
  PullQuote,
} from '../components';
import type { DailyBriefingProps, Locale, Plan } from '../types';
import { colors, fontStacks, fontSize, fontWeight, lineHeight, spacing } from '../tokens';

const GREETING: Record<Locale, string> = {
  'pt-BR': 'Bom dia',
  'en-US': 'Good morning',
};

const SUBTITLE: Record<Locale, string> = {
  'pt-BR': 'Seu briefing macro de hoje',
  'en-US': 'Your macro briefing for today',
};

const CTA_LABEL: Record<Locale, string> = {
  'pt-BR': 'Ver no app',
  'en-US': 'Open app',
};

const PREHEADER: Record<Locale, (bias: string) => string> = {
  'pt-BR': (bias) => `Mercado ${bias}. Eventos do dia, contexto overnight, princípio do dia.`,
  'en-US': (bias) => `Market ${bias}. Today's events, overnight context, principle of the day.`,
};

const EXTRA_LABEL: Record<Locale, string> = {
  'pt-BR': 'ANÁLISE EXTRA',
  'en-US': 'EXTRA ANALYSIS',
};

interface DailyBriefingTemplateProps extends DailyBriefingProps {
  /** Track A→B coordination: optional ultra-only block. Track B can skip if not provided. */
  extraAnalysis?: string;
}

function eventsForPlan(events: DailyBriefingProps['today'], plan: Plan): DailyBriefingProps['today'] {
  if (plan === 'free') return events.slice(0, 2);
  return events;
}

export function DailyBriefing(props: DailyBriefingTemplateProps) {
  const {
    date,
    locale,
    plan,
    marketBias,
    overnight,
    today,
    tomorrow,
    principle,
    unsubscribeUrl,
    appUrl,
    extraAnalysis,
  } = props;

  const events = eventsForPlan(today, plan);
  const showExtra = plan === 'ultra' && (extraAnalysis ?? '').trim().length > 0;

  return (
    <EmailShell
      preheader={PREHEADER[locale](marketBias)}
      title={`${SUBTITLE[locale]} — ${date}`}
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
            letterSpacing: '-0.015em',
            color: colors.ink,
            lineHeight: lineHeight.tight,
          }}
        >
          {GREETING[locale]}.
        </Text>
        <Text
          style={{
            margin: `${spacing[1]}px 0 0 0`,
            fontSize: fontSize.base,
            color: colors.ink2,
            lineHeight: lineHeight.snug,
          }}
        >
          {SUBTITLE[locale]}.
        </Text>
      </Section>

      {/* Briefing card with calendar rows in Today slot */}
      <BriefingCard
        date={date}
        marketBias={marketBias}
        overnight={overnight}
        today={events}
        tomorrow={tomorrow}
        locale={locale}
      >
        {events.map((ev, i) => (
          <CalendarRow key={`${ev.time}-${ev.ticker}-${i}`} {...ev} />
        ))}
      </BriefingCard>

      {/* Ultra-only extra analysis */}
      {showExtra ? (
        <Section style={{ marginTop: spacing[5] }}>
          <Text
            style={{
              margin: 0,
              fontFamily: fontStacks.mono,
              fontSize: fontSize.xs,
              fontWeight: fontWeight.semibold,
              letterSpacing: '0.08em',
              color: colors.ink2,
              textTransform: 'uppercase',
            }}
          >
            {EXTRA_LABEL[locale]}
          </Text>
          <Text
            style={{
              margin: `${spacing[2]}px 0 0 0`,
              fontSize: fontSize.base,
              color: colors.ink,
              lineHeight: lineHeight.normal,
            }}
          >
            {extraAnalysis}
          </Text>
        </Section>
      ) : null}

      {/* Pull quote */}
      <PullQuote quote={principle.quote} attribution={principle.attribution} />

      {/* CTA */}
      <Section style={{ textAlign: 'left', marginTop: spacing[4] }}>
        <CTAButton href={appUrl} label={CTA_LABEL[locale]} variant="primary" />
      </Section>
    </EmailShell>
  );
}

export default DailyBriefing;
