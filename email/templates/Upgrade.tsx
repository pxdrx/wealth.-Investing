import { Section, Text } from '@react-email/components';
import * as React from 'react';
import { CTAButton, EmailShell } from '../components';
import type { Locale, Plan, UpgradeProps } from '../types';
import { colors, fontStacks, fontSize, fontWeight, lineHeight, spacing } from '../tokens';

const COPY: Record<Locale, {
  preheader: (off?: number) => string;
  title: string;
  hero: (target: Plan) => string;
  subtitle: string;
  couponLabel: string;
  validUntil: (date: string) => string;
  ctaLabel: string;
  planLabels: Record<Plan, string>;
  features: { label: string; free: string; pro: string; ultra: string }[];
}> = {
  'pt-BR': {
    preheader: (off) => (off ? `Upgrade com ${off}% off por tempo limitado.` : 'Upgrade liberado pra você.'),
    title: 'Upgrade',
    hero: (target) => `Pronto pro ${target}?`,
    subtitle:
      'Mais ferramentas, briefing mais profundo, alertas em tempo real. Compare e escolha o plano certo.',
    couponLabel: 'CUPOM',
    validUntil: (d) => `Válido até ${new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}.`,
    ctaLabel: 'Ver planos',
    planLabels: { free: 'FREE', pro: 'PRO', ultra: 'ULTRA' },
    features: [
      { label: 'Briefing macro', free: '2 eventos', pro: 'Completo', ultra: 'Análise extra' },
      { label: 'Alertas tempo real', free: '—', pro: 'Sim', ultra: 'Sim' },
      { label: 'Coach IA', free: '—', pro: '20/dia', ultra: 'Ilimitado' },
      { label: 'Multi-conta', free: '1', pro: '5', ultra: '∞' },
    ],
  },
  'en-US': {
    preheader: (off) => (off ? `Upgrade with ${off}% off for a limited time.` : 'Upgrade unlocked for you.'),
    title: 'Upgrade',
    hero: (target) => `Ready for ${target}?`,
    subtitle: 'More tools, deeper briefings, realtime alerts. Compare and pick the right plan.',
    couponLabel: 'COUPON',
    validUntil: (d) => `Valid until ${new Date(d).toLocaleDateString('en-US', { day: '2-digit', month: 'long' })}.`,
    ctaLabel: 'See plans',
    planLabels: { free: 'FREE', pro: 'PRO', ultra: 'ULTRA' },
    features: [
      { label: 'Macro briefing', free: '2 events', pro: 'Full', ultra: 'Extra analysis' },
      { label: 'Realtime alerts', free: '—', pro: 'Yes', ultra: 'Yes' },
      { label: 'AI Coach', free: '—', pro: '20/day', ultra: 'Unlimited' },
      { label: 'Multi-account', free: '1', pro: '5', ultra: '∞' },
    ],
  },
};

export function Upgrade(props: UpgradeProps) {
  const { firstName, locale, currentPlan: _current, targetPlan, couponCode, couponPctOff, validUntil, unsubscribeUrl, pricingUrl } = props;
  const copy = COPY[locale];

  const cellHead: React.CSSProperties = {
    padding: `${spacing[3]}px ${spacing[2]}px`,
    fontFamily: fontStacks.mono,
    fontSize: fontSize.xs,
    letterSpacing: '0.08em',
    color: colors.ink2,
    textTransform: 'uppercase',
    fontWeight: fontWeight.semibold,
    borderBottom: `1px solid ${colors.line}`,
  };

  const cellBody: React.CSSProperties = {
    padding: `${spacing[3]}px ${spacing[2]}px`,
    fontSize: fontSize.sm,
    color: colors.ink,
    borderBottom: `1px solid ${colors.line}`,
    lineHeight: lineHeight.snug,
  };

  function highlight(plan: Plan): React.CSSProperties {
    return plan === targetPlan
      ? { backgroundColor: colors.paper2, fontWeight: fontWeight.semibold, color: colors.greenDeep }
      : {};
  }

  return (
    <EmailShell
      preheader={copy.preheader(couponPctOff)}
      title={copy.title}
      locale={locale}
      unsubscribeUrl={unsubscribeUrl}
    >
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
          {firstName}, {copy.hero(targetPlan)}
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
      </Section>

      {/* Coupon hero */}
      {couponCode && couponPctOff ? (
        <Section
          style={{
            marginTop: spacing[5],
            padding: spacing[5],
            backgroundColor: colors.greenDeep,
            borderRadius: 12,
          }}
        >
          <Text
            style={{
              margin: 0,
              fontFamily: fontStacks.mono,
              fontSize: fontSize.xs,
              letterSpacing: '0.08em',
              color: colors.paper,
              textTransform: 'uppercase',
              fontWeight: fontWeight.semibold,
              opacity: 0.8,
            }}
          >
            {copy.couponLabel}
          </Text>
          <Text
            style={{
              margin: `${spacing[2]}px 0 0 0`,
              fontFamily: fontStacks.mono,
              fontSize: fontSize.xl,
              fontWeight: fontWeight.bold,
              color: '#FFFFFF',
              letterSpacing: '0.08em',
            }}
          >
            {couponCode} · {couponPctOff}% off
          </Text>
          {validUntil ? (
            <Text style={{ margin: `${spacing[2]}px 0 0 0`, fontSize: fontSize.xs, color: colors.paper, opacity: 0.85 }}>
              {copy.validUntil(validUntil)}
            </Text>
          ) : null}
        </Section>
      ) : null}

      {/* Comparison table */}
      <Section style={{ marginTop: spacing[5] }}>
        <table cellPadding={0} cellSpacing={0} role="presentation" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ ...cellHead, textAlign: 'left' }}>—</th>
              <th style={{ ...cellHead, textAlign: 'center', ...highlight('free') }}>{copy.planLabels.free}</th>
              <th style={{ ...cellHead, textAlign: 'center', ...highlight('pro') }}>{copy.planLabels.pro}</th>
              <th style={{ ...cellHead, textAlign: 'center', ...highlight('ultra') }}>{copy.planLabels.ultra}</th>
            </tr>
          </thead>
          <tbody>
            {copy.features.map((f) => (
              <tr key={f.label}>
                <td style={{ ...cellBody, textAlign: 'left', color: colors.ink2 }}>{f.label}</td>
                <td style={{ ...cellBody, textAlign: 'center', ...highlight('free') }}>{f.free}</td>
                <td style={{ ...cellBody, textAlign: 'center', ...highlight('pro') }}>{f.pro}</td>
                <td style={{ ...cellBody, textAlign: 'center', ...highlight('ultra') }}>{f.ultra}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section style={{ marginTop: spacing[5] }}>
        <CTAButton href={pricingUrl} label={copy.ctaLabel} variant="primary" />
      </Section>
    </EmailShell>
  );
}

export default Upgrade;
