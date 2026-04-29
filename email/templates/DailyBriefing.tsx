// Pixel-rebuild of the proposal mockup at marketing/Marketing Hub.html
// (#email-v2). Standalone — does not use EmailShell since the proposal
// has a dark hero + light body + custom footer that the generic shell
// cannot accommodate.
//
// All styles inlined for max email-client compatibility (Gmail strips
// <style> blocks).

import { Body, Container, Head, Hr, Html, Img, Link, Preview, Section, Text } from '@react-email/components';
import * as React from 'react';
import type { DailyBriefingProps, Locale, Plan, BriefingEvent } from '../types';

// ──────────────────────────────────────────────────────────────────────
// Extended props (optional, additive — preserves shared contract).
// Track B engine populates these per-user where applicable.
// ──────────────────────────────────────────────────────────────────────

export interface YesterdaySession {
  trades: number;
  pnl: number; // signed USD/BRL
  winRate: number; // 0..100
  /** ISO date YYYY-MM-DD of the session — drives the "ontem" / weekday label. Optional for backward compat. */
  date?: string;
}

export interface StreakInfo {
  days: number;
  nextMarker: number;
}

export interface BriefingHeadline {
  title: string;
  source: string; // 'Reuters' | 'Bloomberg' | 'FT' …
  hoursAgo: number;
}

export interface AssetImpact {
  ticker: string; // 'DXY' | 'EURUSD' | …
  arrow: 'up' | 'down' | 'flat';
}

export interface DailyBriefingTemplateProps extends DailyBriefingProps {
  firstName?: string;
  editionNumber?: number;
  yesterdaySession?: YesterdaySession;
  streak?: StreakInfo;
  headlines?: BriefingHeadline[];
  assetImpacts?: AssetImpact[];
}

// ──────────────────────────────────────────────────────────────────────
// Tokens (mirror proposal CSS vars, hex literals)
// ──────────────────────────────────────────────────────────────────────

const C = {
  ink: '#0A0F0D',
  ink2: '#1F2A24',
  ink3: '#5C6B62',
  paper: '#FAFAF7',
  paper2: '#F0EFEA',
  paper3: '#E8E8E3',
  green: '#2DB469',
  greenDeep: '#1F3A2E',
  greenSoft: '#9BC6A3',
  accent: '#E8A317',
  danger: '#D85A5A',
  line: '#E8E8E8',
  white: '#FFFFFF',
};

const FONT_SERIF = "'Fraunces', 'Times New Roman', Georgia, serif";
const FONT_SANS = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, sans-serif";
const FONT_MONO = "'JetBrains Mono', 'SF Mono', Menlo, Consolas, monospace";

// ──────────────────────────────────────────────────────────────────────
// i18n
// ──────────────────────────────────────────────────────────────────────

const COPY: Record<Locale, {
  greeting: string; eyebrow: string; biasTitle: string; agendaTitle: string;
  agendaCount: (n: number) => string; eventsLabelHigh: string; eventsLabelMed: string;
  eventsLabelLow: string; sessionTitle: string; trades: string; pnl: string;
  winRate: string; streakLine: (d: number, m: number) => string;
  headlinesTitle: string; ctaLabel: string; ctaSub: string;
  footerReason: string; footerUnsub: string; footerView: string;
  footerPrefs: string; toneRiskOff: string; toneRiskOn: string; toneNeutral: string;
}> = {
  'pt-BR': {
    greeting: 'Bom dia',
    eyebrow: 'Briefing · 06:00 BRT',
    biasTitle: 'Viés do dia · Dexter',
    agendaTitle: 'Agenda · hoje',
    agendaCount: (n) => `${n} evento${n === 1 ? '' : 's'}`,
    eventsLabelHigh: 'Crítico',
    eventsLabelMed: 'Hold',
    eventsLabelLow: 'Watch',
    sessionTitle: 'Sua última sessão',
    trades: 'Trades',
    pnl: 'P&L',
    winRate: 'Win rate',
    streakLine: (d, m) => `🔥 ${d} dia${d === 1 ? '' : 's'} consecutivo${d === 1 ? '' : 's'} seguindo o plano. Próximo marco: ${m} dias.`,
    headlinesTitle: 'Headlines · 24h',
    ctaLabel: 'Abrir o terminal',
    ctaSub: 'owealthinvesting.com/app',
    footerReason: 'Você recebe esse briefing como assinante de wealth.Investing.',
    footerUnsub: 'Cancelar inscrição',
    footerView: 'Ver no navegador',
    footerPrefs: 'Preferências',
    toneRiskOff: '▲ Risk-off',
    toneRiskOn: '▼ Risk-on',
    toneNeutral: '→ Neutral',
  },
  'en-US': {
    greeting: 'Good morning',
    eyebrow: 'Briefing · 06:00 BRT',
    biasTitle: "Today's bias · Dexter",
    agendaTitle: 'Agenda · today',
    agendaCount: (n) => `${n} event${n === 1 ? '' : 's'}`,
    eventsLabelHigh: 'Critical',
    eventsLabelMed: 'Hold',
    eventsLabelLow: 'Watch',
    sessionTitle: 'Your last session',
    trades: 'Trades',
    pnl: 'P&L',
    winRate: 'Win rate',
    streakLine: (d, m) => `🔥 ${d} day${d === 1 ? '' : 's'} following the plan. Next milestone: ${m} days.`,
    headlinesTitle: 'Headlines · 24h',
    ctaLabel: 'Open terminal',
    ctaSub: 'owealthinvesting.com/app',
    footerReason: 'You receive this briefing as a wealth.Investing subscriber.',
    footerUnsub: 'Unsubscribe',
    footerView: 'View in browser',
    footerPrefs: 'Preferences',
    toneRiskOff: '▲ Risk-off',
    toneRiskOn: '▼ Risk-on',
    toneNeutral: '→ Neutral',
  },
};

// ──────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────

function formatDateLong(date: string, locale: Locale): string {
  const d = new Date(`${date}T12:00:00`);
  const fmt = new Intl.DateTimeFormat(locale === 'pt-BR' ? 'pt-BR' : 'en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  let s = fmt.format(d);
  // Capitalize first letter (pt-BR returns "sexta-feira, 25 de abril de 2026")
  s = s.charAt(0).toUpperCase() + s.slice(1);
  return s;
}

function formatPnl(n: number): string {
  const sign = n >= 0 ? '+' : '−';
  return `${sign}$${Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

function impactColor(impact: BriefingEvent['impact']): string {
  if (impact === 'high') return C.danger;
  if (impact === 'med') return C.accent;
  return C.greenSoft;
}

function impactTag(impact: BriefingEvent['impact'], copy: typeof COPY['pt-BR']): string {
  if (impact === 'high') return copy.eventsLabelHigh;
  if (impact === 'med') return copy.eventsLabelMed;
  return copy.eventsLabelLow;
}

function eventCurrencyFromTicker(ev: BriefingEvent): string {
  // The shared contract has ticker = compact code (CPI/FOMC/BCB).
  // We surface a 3-letter ISO currency hint when derivable, else use the
  // ticker as-is. The proposal showed USD/EUR/BRL; engine builds these
  // from country code.
  const t = ev.ticker.toUpperCase();
  if (/^USD|^US$|^EUR|^EU$|^BRL|^BR$|^GBP|^GB$|^JPY|^JP$|^CHF|^CH$|^CAD|^CA$|^AUD|^NZD/.test(t)) {
    return t.slice(0, 3);
  }
  return t;
}

// ──────────────────────────────────────────────────────────────────────
// Inline mascot Dexter (pixel art SVG, 16x16). Mirrors the proposal.
// ──────────────────────────────────────────────────────────────────────

// Mascot served from the production domain (public/email-assets/, deployed
// by Vercel from main). Resend's SDK doesn't expose Content-ID inline
// attachments — hosted URLs are the supported path. NEXT_PUBLIC_APP_URL
// at server-render time gives the canonical absolute URL.
const APP_BASE = process.env.NEXT_PUBLIC_APP_URL ?? 'https://owealthinvesting.com';
export const MASCOT_URL = `${APP_BASE}/email-assets/dexter-64.png`;

function MascotDexter({ size = 32 }: { size?: number }) {
  return (
    <Img
      src={MASCOT_URL}
      alt="Dexter"
      width={size}
      height={size}
      style={{ display: 'block', borderRadius: 4 }}
    />
  );
}

// ──────────────────────────────────────────────────────────────────────
// Main template
// ──────────────────────────────────────────────────────────────────────

function eventsForPlan(events: BriefingEvent[], plan: Plan): BriefingEvent[] {
  if (plan === 'free') return events.slice(0, 2);
  return events;
}

function headlinesForPlan(headlines: BriefingHeadline[] | undefined, plan: Plan): BriefingHeadline[] {
  if (!headlines) return [];
  if (plan === 'free') return headlines.slice(0, 2);
  return headlines.slice(0, 5);
}

function toneFor(bias: DailyBriefingProps['marketBias'], copy: typeof COPY['pt-BR']): string {
  if (bias === 'risk-off') return copy.toneRiskOff;
  if (bias === 'risk-on') return copy.toneRiskOn;
  return copy.toneNeutral;
}

export function DailyBriefing(props: DailyBriefingTemplateProps) {
  const {
    date, locale, plan, marketBias, overnight, today, principle,
    unsubscribeUrl, appUrl, firstName, editionNumber, yesterdaySession,
    streak, headlines, assetImpacts,
  } = props;

  const copy = COPY[locale];
  const events = eventsForPlan(today, plan);
  const heads = headlinesForPlan(headlines, plan);
  const showSession = plan !== 'free' && !!yesterdaySession;
  const showStreak = plan !== 'free' && !!streak;
  const showAssets = plan === 'ultra' && !!assetImpacts && assetImpacts.length > 0;
  const greetingName = firstName ? `${copy.greeting}, ${firstName}.` : `${copy.greeting}.`;

  return (
    <Html lang={locale}>
      <Head>
        <title>{`${copy.greeting} — ${date}`}</title>
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
      </Head>
      <Preview>{`${overnight.slice(0, 88)}`}</Preview>
      <Body
        style={{
          backgroundColor: C.paper2,
          margin: 0,
          padding: 0,
          fontFamily: FONT_SANS,
          color: C.ink,
          WebkitFontSmoothing: 'antialiased',
        }}
      >
        <Container
          style={{
            maxWidth: 600,
            width: '100%',
            margin: '0 auto',
            backgroundColor: C.white,
            borderRadius: 8,
            overflow: 'hidden',
          }}
        >
          {/* ─── HERO (dark) ─── */}
          <Section
            style={{
              backgroundColor: C.ink,
              padding: '32px 32px 28px 32px',
            }}
          >
            <table
              role="presentation"
              cellPadding={0}
              cellSpacing={0}
              border={0}
              width="100%"
              style={{ marginBottom: 24 }}
            >
              <tr>
                <td style={{ width: 32, paddingRight: 12, verticalAlign: 'middle' }}>
                  <MascotDexter size={32} />
                </td>
                <td style={{ verticalAlign: 'middle' }}>
                  <span
                    style={{
                      fontFamily: FONT_SERIF,
                      fontSize: 18,
                      fontWeight: 600,
                      letterSpacing: '-0.01em',
                      color: C.white,
                    }}
                  >
                    <span style={{ color: C.green }}>wealth</span>
                    <span style={{ color: C.green }}>.</span>
                    <span style={{ color: C.white }}>Investing</span>
                  </span>
                </td>
                <td style={{ verticalAlign: 'middle', textAlign: 'right' }}>
                  {typeof editionNumber === 'number' && (
                    <span
                      style={{
                        fontFamily: FONT_MONO,
                        fontSize: 10,
                        color: C.greenSoft,
                        textTransform: 'uppercase',
                        letterSpacing: '0.18em',
                        backgroundColor: 'rgba(45, 180, 105, 0.12)',
                        padding: '4px 10px',
                        borderRadius: 999,
                        border: `1px solid ${C.greenDeep}`,
                      }}
                    >
                      Edição #{String(editionNumber).padStart(3, '0')}
                    </span>
                  )}
                </td>
              </tr>
            </table>

            <Text
              style={{
                margin: 0,
                fontFamily: FONT_MONO,
                fontSize: 11,
                color: C.green,
                textTransform: 'uppercase',
                letterSpacing: '0.18em',
                fontWeight: 600,
              }}
            >
              {copy.eyebrow}
            </Text>
            <Text
              style={{
                margin: '6px 0 0 0',
                fontFamily: FONT_SERIF,
                fontSize: 36,
                fontWeight: 600,
                letterSpacing: '-0.02em',
                lineHeight: 1.1,
                color: C.white,
              }}
            >
              {greetingName}
            </Text>
            <Text
              style={{
                margin: '8px 0 0 0',
                fontSize: 13,
                color: C.ink3,
                lineHeight: 1.4,
              }}
            >
              {formatDateLong(date, locale)}
            </Text>
          </Section>

          {/* ─── color accent strip ─── */}
          <Section style={{ padding: 0 }}>
            <table role="presentation" cellPadding={0} cellSpacing={0} border={0} width="100%">
              <tr>
                <td style={{ height: 4, backgroundColor: C.green, width: '50%' }}>&nbsp;</td>
                <td style={{ height: 4, backgroundColor: C.accent, width: '30%' }}>&nbsp;</td>
                <td style={{ height: 4, backgroundColor: C.danger, width: '20%' }}>&nbsp;</td>
              </tr>
            </table>
          </Section>

          {/* ─── BODY ─── */}
          <Section style={{ padding: '28px 32px 32px 32px', backgroundColor: C.white }}>

            {/* VIÉS DO DIA */}
            <Section
              style={{
                backgroundColor: C.paper2,
                borderRadius: 12,
                padding: 20,
                marginBottom: 20,
                border: `1px solid ${C.line}`,
              }}
            >
              <table role="presentation" cellPadding={0} cellSpacing={0} border={0} width="100%" style={{ marginBottom: 12 }}>
                <tr>
                  <td style={{ width: 28, paddingRight: 10, verticalAlign: 'middle' }}>
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        backgroundColor: C.green,
                        color: C.white,
                        textAlign: 'center',
                        lineHeight: '28px',
                        fontFamily: FONT_SERIF,
                        fontSize: 14,
                        fontWeight: 600,
                      }}
                    >
                      D
                    </div>
                  </td>
                  <td style={{ verticalAlign: 'middle' }}>
                    <span
                      style={{
                        fontFamily: FONT_MONO,
                        fontSize: 11,
                        color: C.ink3,
                        textTransform: 'uppercase',
                        letterSpacing: '0.16em',
                        fontWeight: 600,
                      }}
                    >
                      {copy.biasTitle}
                    </span>
                  </td>
                  <td style={{ verticalAlign: 'middle', textAlign: 'right' }}>
                    <span
                      style={{
                        fontFamily: FONT_MONO,
                        fontSize: 10,
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                        color: marketBias === 'risk-off' ? C.danger : marketBias === 'risk-on' ? C.green : C.ink3,
                        backgroundColor: C.white,
                        padding: '4px 10px',
                        borderRadius: 999,
                        border: `1px solid ${C.line}`,
                      }}
                    >
                      {toneFor(marketBias, copy)}
                    </span>
                  </td>
                </tr>
              </table>
              <Text
                style={{
                  margin: 0,
                  fontSize: 15,
                  lineHeight: 1.6,
                  color: C.ink2,
                }}
              >
                {overnight}
              </Text>

              {showAssets && (
                <table role="presentation" cellPadding={0} cellSpacing={0} border={0} width="100%" style={{ marginTop: 16 }}>
                  <tr>
                    {assetImpacts!.slice(0, 5).map((a, i) => (
                      <td
                        key={`${a.ticker}-${i}`}
                        style={{
                          backgroundColor: C.white,
                          border: `1px solid ${C.line}`,
                          borderRadius: 8,
                          padding: '8px 10px',
                          textAlign: 'center',
                          fontFamily: FONT_MONO,
                          fontSize: 11,
                          fontWeight: 600,
                          color: C.ink2,
                          letterSpacing: '0.05em',
                        }}
                      >
                        {a.ticker}{' '}
                        <span
                          style={{
                            color: a.arrow === 'up' ? C.green : a.arrow === 'down' ? C.danger : C.ink3,
                          }}
                        >
                          {a.arrow === 'up' ? '▲' : a.arrow === 'down' ? '▼' : '→'}
                        </span>
                      </td>
                    ))}
                  </tr>
                </table>
              )}
            </Section>

            {/* SUA ÚLTIMA SESSÃO (Pro+) */}
            {showSession && (
              <Section
                style={{
                  marginBottom: 20,
                  paddingBottom: 16,
                  borderBottom: `1px solid ${C.line}`,
                }}
              >
                <table role="presentation" cellPadding={0} cellSpacing={0} border={0} width="100%" style={{ marginBottom: 12 }}>
                  <tr>
                    <td style={{ verticalAlign: 'middle' }}>
                      <span
                        style={{
                          fontFamily: FONT_MONO,
                          fontSize: 11,
                          color: C.ink3,
                          textTransform: 'uppercase',
                          letterSpacing: '0.16em',
                          fontWeight: 600,
                        }}
                      >
                        {copy.sessionTitle}
                      </span>
                    </td>
                    <td style={{ verticalAlign: 'middle', textAlign: 'right' }}>
                      {yesterdaySession!.date && (
                        <span
                          style={{
                            fontFamily: FONT_MONO,
                            fontSize: 10,
                            color: C.ink3,
                            backgroundColor: C.paper2,
                            padding: '3px 8px',
                            borderRadius: 999,
                          }}
                        >
                          {(() => {
                            const d = new Date(`${yesterdaySession!.date}T12:00:00-03:00`);
                            return new Intl.DateTimeFormat(locale === 'pt-BR' ? 'pt-BR' : 'en-US', {
                              weekday: 'short',
                              day: '2-digit',
                              month: '2-digit',
                            }).format(d);
                          })()}
                        </span>
                      )}
                    </td>
                  </tr>
                </table>
                <table role="presentation" cellPadding={0} cellSpacing={0} border={0} width="100%">
                  <tr>
                    <td style={{ width: '33%', textAlign: 'left' }}>
                      <Text style={{ margin: 0, fontFamily: FONT_SERIF, fontSize: 28, fontWeight: 600, color: C.ink, lineHeight: 1.1 }}>
                        {yesterdaySession!.trades}
                      </Text>
                      <Text style={{ margin: '2px 0 0 0', fontSize: 11, color: C.ink3, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                        {copy.trades}
                      </Text>
                    </td>
                    <td style={{ width: '33%', textAlign: 'left' }}>
                      <Text
                        style={{
                          margin: 0,
                          fontFamily: FONT_SERIF,
                          fontSize: 28,
                          fontWeight: 600,
                          color: yesterdaySession!.pnl >= 0 ? C.green : C.danger,
                          lineHeight: 1.1,
                        }}
                      >
                        {formatPnl(yesterdaySession!.pnl)}
                      </Text>
                      <Text style={{ margin: '2px 0 0 0', fontSize: 11, color: C.ink3, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                        {copy.pnl}
                      </Text>
                    </td>
                    <td style={{ width: '34%', textAlign: 'left' }}>
                      <Text style={{ margin: 0, fontFamily: FONT_SERIF, fontSize: 28, fontWeight: 600, color: C.ink, lineHeight: 1.1 }}>
                        {yesterdaySession!.winRate}%
                      </Text>
                      <Text style={{ margin: '2px 0 0 0', fontSize: 11, color: C.ink3, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                        {copy.winRate}
                      </Text>
                    </td>
                  </tr>
                </table>
                {showStreak && (
                  <Text style={{ margin: '14px 0 0 0', fontSize: 13, color: C.ink2, lineHeight: 1.5 }}>
                    {copy.streakLine(streak!.days, streak!.nextMarker).replace(
                      /\d+ dia[s]?/,
                      (m) => m,
                    )}
                  </Text>
                )}
              </Section>
            )}

            {/* AGENDA · HOJE */}
            <Section style={{ marginBottom: 20 }}>
              <table role="presentation" cellPadding={0} cellSpacing={0} border={0} width="100%" style={{ marginBottom: 10 }}>
                <tr>
                  <td style={{ verticalAlign: 'middle' }}>
                    <span
                      style={{
                        fontFamily: FONT_MONO,
                        fontSize: 11,
                        color: C.ink3,
                        textTransform: 'uppercase',
                        letterSpacing: '0.16em',
                        fontWeight: 600,
                      }}
                    >
                      {copy.agendaTitle}
                    </span>
                  </td>
                  <td style={{ verticalAlign: 'middle', textAlign: 'right' }}>
                    <span
                      style={{
                        fontFamily: FONT_MONO,
                        fontSize: 10,
                        color: C.ink3,
                        backgroundColor: C.paper2,
                        padding: '3px 8px',
                        borderRadius: 999,
                      }}
                    >
                      {copy.agendaCount(events.length)}
                    </span>
                  </td>
                </tr>
              </table>

              {events.map((ev, i) => (
                <table
                  key={`${ev.time}-${ev.ticker}-${i}`}
                  role="presentation"
                  cellPadding={0}
                  cellSpacing={0}
                  border={0}
                  width="100%"
                  style={{ borderBottom: i === events.length - 1 ? 'none' : `1px solid ${C.line}` }}
                >
                  <tr>
                    <td style={{ width: 56, padding: '12px 0', verticalAlign: 'middle' }}>
                      <span style={{ fontFamily: FONT_MONO, fontSize: 13, color: C.ink, fontVariantNumeric: 'tabular-nums' }}>
                        {ev.time}
                      </span>
                    </td>
                    <td style={{ width: 8, padding: '12px 0', verticalAlign: 'middle' }}>
                      <div
                        style={{
                          width: 3,
                          height: 18,
                          backgroundColor: impactColor(ev.impact),
                          borderRadius: 2,
                        }}
                      />
                    </td>
                    <td style={{ padding: '12px 12px', verticalAlign: 'middle' }}>
                      <span
                        style={{
                          fontFamily: FONT_MONO,
                          fontSize: 10,
                          color: C.ink3,
                          backgroundColor: C.paper2,
                          padding: '2px 6px',
                          borderRadius: 4,
                          marginRight: 8,
                          letterSpacing: '0.05em',
                        }}
                      >
                        {eventCurrencyFromTicker(ev)}
                      </span>
                      <span style={{ fontSize: 14, color: C.ink, lineHeight: 1.4 }}>
                        {ev.label}
                      </span>
                    </td>
                    <td style={{ padding: '12px 0', verticalAlign: 'middle', textAlign: 'right' }}>
                      <span
                        style={{
                          fontFamily: FONT_MONO,
                          fontSize: 10,
                          color: impactColor(ev.impact),
                          textTransform: 'uppercase',
                          letterSpacing: '0.1em',
                          fontWeight: 600,
                        }}
                      >
                        {impactTag(ev.impact, copy)}
                      </span>
                    </td>
                  </tr>
                </table>
              ))}
            </Section>

            {/* HEADLINES · 24h */}
            {heads.length > 0 && (
              <Section style={{ marginBottom: 24, paddingTop: 16, borderTop: `1px solid ${C.line}` }}>
                <Text
                  style={{
                    margin: '0 0 10px 0',
                    fontFamily: FONT_MONO,
                    fontSize: 11,
                    color: C.ink3,
                    textTransform: 'uppercase',
                    letterSpacing: '0.16em',
                    fontWeight: 600,
                  }}
                >
                  {copy.headlinesTitle}
                </Text>
                {heads.map((h, i) => (
                  <table
                    key={`hl-${i}`}
                    role="presentation"
                    cellPadding={0}
                    cellSpacing={0}
                    border={0}
                    width="100%"
                    style={{ marginBottom: i === heads.length - 1 ? 0 : 10 }}
                  >
                    <tr>
                      <td style={{ verticalAlign: 'top' }}>
                        <Text style={{ margin: 0, fontSize: 14, color: C.ink, lineHeight: 1.5 }}>
                          {h.title}
                        </Text>
                      </td>
                      <td style={{ width: 110, verticalAlign: 'top', textAlign: 'right', paddingLeft: 12 }}>
                        <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: C.ink3 }}>
                          {h.source} · {h.hoursAgo}h
                        </span>
                      </td>
                    </tr>
                  </table>
                ))}
              </Section>
            )}

            {/* PRINCÍPIO (pull quote) */}
            <Section
              style={{
                marginBottom: 24,
                paddingTop: 16,
                borderTop: `1px solid ${C.line}`,
              }}
            >
              <table role="presentation" cellPadding={0} cellSpacing={0} border={0} width="100%">
                <tr>
                  <td style={{ width: 3, backgroundColor: C.green }}>&nbsp;</td>
                  <td style={{ paddingLeft: 16 }}>
                    <Text
                      style={{
                        margin: 0,
                        fontFamily: FONT_SERIF,
                        fontSize: 16,
                        fontStyle: 'italic',
                        color: C.ink,
                        lineHeight: 1.5,
                      }}
                    >
                      "{principle.quote}"
                    </Text>
                    {principle.attribution && (
                      <Text style={{ margin: '6px 0 0 0', fontFamily: FONT_MONO, fontSize: 11, color: C.ink3, letterSpacing: '0.05em' }}>
                        — {principle.attribution}
                      </Text>
                    )}
                  </td>
                </tr>
              </table>
            </Section>

            {/* CTA */}
            <Section style={{ textAlign: 'center', marginTop: 24 }}>
              <table role="presentation" cellPadding={0} cellSpacing={0} border={0} align="center" style={{ margin: '0 auto' }}>
                <tr>
                  <td>
                    <Link
                      href={appUrl}
                      style={{
                        display: 'inline-block',
                        backgroundColor: C.ink,
                        color: C.white,
                        textDecoration: 'none',
                        fontFamily: FONT_SANS,
                        fontSize: 14,
                        fontWeight: 600,
                        padding: '14px 32px',
                        borderRadius: 999,
                        letterSpacing: '0.01em',
                      }}
                    >
                      {copy.ctaLabel}
                    </Link>
                  </td>
                </tr>
              </table>
              <Text
                style={{
                  margin: '12px 0 0 0',
                  fontFamily: FONT_MONO,
                  fontSize: 11,
                  color: C.ink3,
                  textAlign: 'center',
                }}
              >
                {copy.ctaSub}
              </Text>
            </Section>
          </Section>

          {/* ─── FOOTER ─── */}
          <Section
            style={{
              backgroundColor: C.paper2,
              padding: '24px 32px 28px 32px',
              textAlign: 'center',
              borderTop: `1px solid ${C.line}`,
            }}
          >
            <Text
              style={{
                margin: 0,
                fontFamily: FONT_SERIF,
                fontSize: 14,
                fontWeight: 600,
                color: C.ink,
              }}
            >
              <span style={{ color: C.greenDeep }}>wealth</span>
              <span style={{ color: C.greenDeep }}>.</span>
              <span style={{ color: C.ink }}>Investing</span>
            </Text>
            <Text
              style={{
                margin: '10px 0 0 0',
                fontSize: 11,
                color: C.ink3,
                lineHeight: 1.5,
              }}
            >
              {process.env.COMPANY_ADDRESS ?? 'Av. Paulista, 1000 — Bela Vista, São Paulo - SP, 01310-100, Brasil'}
            </Text>
            <Text
              style={{
                margin: '6px 0 0 0',
                fontSize: 12,
                color: C.ink3,
                lineHeight: 1.5,
              }}
            >
              {copy.footerReason}
            </Text>
            <Text style={{ margin: '12px 0 0 0', fontSize: 11 }}>
              <Link href={`${appUrl}/settings`} style={{ color: C.ink3, textDecoration: 'underline', marginRight: 8 }}>
                {copy.footerPrefs}
              </Link>
              <span style={{ color: C.ink3 }}>·</span>
              <Link href={unsubscribeUrl} style={{ color: C.ink3, textDecoration: 'underline', margin: '0 8px' }}>
                {copy.footerUnsub}
              </Link>
              <span style={{ color: C.ink3 }}>·</span>
              <Link href={appUrl} style={{ color: C.ink3, textDecoration: 'underline', marginLeft: 8 }}>
                {copy.footerView}
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export default DailyBriefing;
