import { Section, Text } from '@react-email/components';
import * as React from 'react';
import { colors, fontStacks, fontSize, fontWeight, lineHeight, spacing } from '../tokens';

export interface PullQuoteProps {
  quote: string;
  attribution?: string;
}

export function PullQuote({ quote, attribution }: PullQuoteProps) {
  return (
    <Section
      style={{
        marginTop: spacing[6],
        marginBottom: spacing[6],
        paddingLeft: spacing[5],
        borderLeft: `3px solid ${colors.green}`,
      }}
    >
      <Text
        style={{
          margin: 0,
          fontFamily: fontStacks.serif,
          fontSize: 22,
          fontStyle: 'italic',
          color: colors.ink,
          lineHeight: lineHeight.snug,
          letterSpacing: '-0.005em',
        }}
      >
        “{quote}”
      </Text>
      {attribution ? (
        <Text
          style={{
            margin: `${spacing[2]}px 0 0 0`,
            fontSize: fontSize.xs,
            color: colors.ink2,
            fontWeight: fontWeight.medium,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          — {attribution}
        </Text>
      ) : null}
    </Section>
  );
}

export default PullQuote;
