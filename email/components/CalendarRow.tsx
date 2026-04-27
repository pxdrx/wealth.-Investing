import * as React from 'react';
import type { BriefingEvent, Impact } from '../types';
import { colors, fontStacks, fontSize, fontWeight, lineHeight, spacing } from '../tokens';

export type CalendarRowProps = BriefingEvent;

const IMPACT_COLOR: Record<Impact, string> = {
  low: colors.line,
  med: colors.accent,
  high: colors.danger,
};

export function CalendarRow({ time, ticker, label, impact }: CalendarRowProps) {
  return (
    <table
      cellPadding={0}
      cellSpacing={0}
      role="presentation"
      style={{
        width: '100%',
        borderBottom: `1px solid ${colors.line}`,
      }}
    >
      <tbody>
        <tr>
          <td
            style={{
              width: 4,
              backgroundColor: IMPACT_COLOR[impact],
              padding: 0,
            }}
          />
          <td style={{ padding: `${spacing[3]}px ${spacing[3]}px ${spacing[3]}px ${spacing[3]}px`, verticalAlign: 'middle' }}>
            <table cellPadding={0} cellSpacing={0} role="presentation" style={{ width: '100%' }}>
              <tbody>
                <tr>
                  <td style={{ width: 60, verticalAlign: 'middle' }}>
                    <span
                      style={{
                        fontFamily: fontStacks.mono,
                        fontSize: fontSize.sm,
                        color: colors.ink2,
                        fontWeight: fontWeight.medium,
                      }}
                    >
                      {time}
                    </span>
                  </td>
                  <td style={{ width: 70, verticalAlign: 'middle' }}>
                    <span
                      style={{
                        fontFamily: fontStacks.mono,
                        fontSize: fontSize.sm,
                        color: colors.ink,
                        fontWeight: fontWeight.semibold,
                        letterSpacing: '0.04em',
                      }}
                    >
                      {ticker}
                    </span>
                  </td>
                  <td style={{ verticalAlign: 'middle' }}>
                    <span
                      style={{
                        fontSize: fontSize.sm,
                        color: colors.ink,
                        lineHeight: lineHeight.snug,
                      }}
                    >
                      {label}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>
      </tbody>
    </table>
  );
}

export default CalendarRow;
