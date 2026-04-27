import { Section, Text } from '@react-email/components';
import * as React from 'react';
import type { BriefingEvent, MarketBias, Locale } from '../types';
import { colors, fontStacks, fontSize, fontWeight, lineHeight, spacing } from '../tokens';

export interface BriefingCardProps {
  date: string;                   // ISO yyyy-MM-dd
  marketBias: MarketBias;
  overnight: string;
  today: BriefingEvent[];
  tomorrow: string;
  locale?: Locale;
  // CalendarRow é renderizado pelo template, não pelo card.
  // Card mostra OVERNIGHT + TOMORROW e o template injeta as rows entre eles.
  children?: React.ReactNode;     // slot opcional pra injetar CalendarRows entre seções
}

const BIAS_COLOR: Record<MarketBias, string> = {
  'risk-on': colors.green,
  'risk-off': colors.danger,
  neutral: colors.ink2,
};

const SECTION_LABELS: Record<Locale, { overnight: string; today: string; tomorrow: string }> = {
  'pt-BR': { overnight: 'OVERNIGHT', today: 'HOJE', tomorrow: 'AMANHÃ' },
  'en-US': { overnight: 'OVERNIGHT', today: 'TODAY', tomorrow: 'TOMORROW' },
};

function formatDate(iso: string, locale: Locale): string {
  const d = new Date(iso + 'T00:00:00');
  return d
    .toLocaleDateString(locale, { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
    .toUpperCase();
}

export function BriefingCard({
  date,
  marketBias,
  overnight,
  today: _today,
  tomorrow,
  locale = 'pt-BR',
  children,
}: BriefingCardProps) {
  const labels = SECTION_LABELS[locale];

  const sectionLabel: React.CSSProperties = {
    margin: 0,
    fontFamily: fontStacks.mono,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    letterSpacing: '0.08em',
    color: colors.ink2,
    textTransform: 'uppercase',
  };

  const bodyText: React.CSSProperties = {
    margin: `${spacing[2]}px 0 0 0`,
    fontSize: fontSize.base,
    lineHeight: lineHeight.normal,
    color: colors.ink,
  };

  return (
    <Section
      style={{
        backgroundColor: colors.paper2,
        borderRadius: 12,
        padding: `${spacing[5]}px`,
        marginTop: spacing[5],
      }}
    >
      {/* Header: data + bias dot */}
      <table cellPadding={0} cellSpacing={0} role="presentation" style={{ width: '100%' }}>
        <tbody>
          <tr>
            <td style={{ verticalAlign: 'middle' }}>
              <Text
                style={{
                  margin: 0,
                  fontFamily: fontStacks.mono,
                  fontSize: fontSize.xs,
                  letterSpacing: '0.08em',
                  color: colors.ink2,
                  textTransform: 'uppercase',
                }}
              >
                {formatDate(date, locale)}
              </Text>
            </td>
            <td style={{ verticalAlign: 'middle', textAlign: 'right' }}>
              <span
                style={{
                  display: 'inline-block',
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  backgroundColor: BIAS_COLOR[marketBias],
                  verticalAlign: 'middle',
                }}
              />
              <span
                style={{
                  marginLeft: 6,
                  fontFamily: fontStacks.mono,
                  fontSize: fontSize.xs,
                  letterSpacing: '0.08em',
                  color: colors.ink2,
                  textTransform: 'uppercase',
                  verticalAlign: 'middle',
                }}
              >
                {marketBias}
              </span>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Overnight */}
      <Section style={{ marginTop: spacing[4] }}>
        <Text style={sectionLabel}>{labels.overnight}</Text>
        <Text style={bodyText}>{overnight}</Text>
      </Section>

      {/* Today (calendar rows are slot children) */}
      <Section style={{ marginTop: spacing[5] }}>
        <Text style={sectionLabel}>{labels.today}</Text>
        {children ? <div style={{ marginTop: spacing[2] }}>{children}</div> : null}
      </Section>

      {/* Tomorrow */}
      <Section style={{ marginTop: spacing[5] }}>
        <Text style={sectionLabel}>{labels.tomorrow}</Text>
        <Text style={bodyText}>{tomorrow}</Text>
      </Section>
    </Section>
  );
}

export default BriefingCard;
