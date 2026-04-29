import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';
import type { Locale } from '../types';
import { colors, fontStacks, fontSize, fontWeight, lineHeight } from '../tokens';

export interface EmailShellProps {
  preheader: string;            // ≤90 chars · oculto, mostrado em inbox preview
  title: string;
  locale: Locale;
  unsubscribeUrl: string;
  children: React.ReactNode;
}

const COMPANY_ADDRESS =
  process.env.COMPANY_ADDRESS ??
  'Av. Paulista, 1000 — Bela Vista, São Paulo - SP, 01310-100, Brasil';
const ADDRESS_LINE = `wealth.Investing · ${COMPANY_ADDRESS}`;

const FOOTER_COPY: Record<Locale, { reason: string; unsubscribe: string }> = {
  'pt-BR': {
    reason: 'Você recebe este email porque é membro da plataforma wealth.Investing.',
    unsubscribe: 'Cancelar inscrição',
  },
  'en-US': {
    reason: 'You are receiving this email because you are a wealth.Investing member.',
    unsubscribe: 'Unsubscribe',
  },
};

export function EmailShell({ preheader, title, locale, unsubscribeUrl, children }: EmailShellProps) {
  const copy = FOOTER_COPY[locale];
  return (
    <Html lang={locale}>
      <Head>
        <title>{title}</title>
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
      </Head>
      <Preview>{preheader.slice(0, 90)}</Preview>
      <Body
        style={{
          backgroundColor: colors.paper,
          fontFamily: fontStacks.sans,
          margin: 0,
          padding: 0,
          color: colors.ink,
        }}
      >
        <Container
          style={{
            maxWidth: 600,
            width: '100%',
            backgroundColor: '#FFFFFF',
            margin: '0 auto',
            padding: 0,
          }}
        >
          {/* Header */}
          <Section style={{ padding: '32px 32px 16px 32px' }}>
            <Text
              style={{
                margin: 0,
                fontFamily: fontStacks.serif,
                fontSize: fontSize.lg,
                fontWeight: fontWeight.semibold,
                letterSpacing: '-0.01em',
                color: colors.ink,
                lineHeight: lineHeight.tight,
              }}
            >
              wealth.Investing
            </Text>
            <Hr style={{ borderColor: colors.line, marginTop: 16, marginBottom: 0 }} />
          </Section>

          {/* Body */}
          <Section style={{ padding: '0 32px 32px 32px' }}>{children}</Section>

          {/* Footer */}
          <Hr style={{ borderColor: colors.line, margin: '0 32px' }} />
          <Section style={{ padding: '24px 32px 32px 32px' }}>
            <Text
              style={{
                margin: 0,
                fontSize: fontSize.xs,
                color: colors.ink2,
                lineHeight: lineHeight.snug,
              }}
            >
              {copy.reason}
            </Text>
            <Text
              style={{
                margin: '8px 0 0 0',
                fontSize: fontSize.xs,
                color: colors.ink2,
                lineHeight: lineHeight.snug,
              }}
            >
              {ADDRESS_LINE}
            </Text>
            <Text style={{ margin: '12px 0 0 0', fontSize: fontSize.xs }}>
              <Link href={unsubscribeUrl} style={{ color: colors.greenDeep, textDecoration: 'underline' }}>
                {copy.unsubscribe}
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export default EmailShell;
