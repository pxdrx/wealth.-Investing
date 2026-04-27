import * as React from 'react';
import type { TradeEntry, Locale } from '../types';
import { colors, fontStacks, fontSize, fontWeight, lineHeight, spacing } from '../tokens';

export interface TradeRowProps extends TradeEntry {
  locale?: Locale;
}

function formatPnl(pnl: number, locale: Locale): string {
  const sign = pnl > 0 ? '+' : pnl < 0 ? '−' : '';
  const abs = Math.abs(pnl).toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const symbol = locale === 'pt-BR' ? 'R$' : '$';
  return `${sign}${symbol} ${abs}`;
}

function formatPct(pct: number): string {
  const sign = pct > 0 ? '+' : pct < 0 ? '−' : '';
  return `${sign}${Math.abs(pct).toFixed(2)}%`;
}

export function TradeRow({ asset, direction, pnl, pnlPct, note, locale = 'pt-BR' }: TradeRowProps) {
  const positive = pnl > 0;
  const pnlColor = positive ? colors.green : colors.danger;
  const directionColor = direction === 'long' ? colors.green : colors.danger;

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
          <td style={{ padding: `${spacing[3]}px 0`, verticalAlign: 'top' }}>
            <table cellPadding={0} cellSpacing={0} role="presentation" style={{ width: '100%' }}>
              <tbody>
                <tr>
                  <td style={{ verticalAlign: 'middle' }}>
                    <span
                      style={{
                        fontFamily: fontStacks.mono,
                        fontSize: fontSize.sm,
                        fontWeight: fontWeight.semibold,
                        color: colors.ink,
                        letterSpacing: '0.04em',
                      }}
                    >
                      {asset}
                    </span>
                    <span
                      style={{
                        marginLeft: spacing[2],
                        fontFamily: fontStacks.mono,
                        fontSize: fontSize.xs,
                        color: directionColor,
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        fontWeight: fontWeight.medium,
                      }}
                    >
                      {direction}
                    </span>
                  </td>
                  <td style={{ verticalAlign: 'middle', textAlign: 'right' }}>
                    <span
                      style={{
                        fontFamily: fontStacks.mono,
                        fontSize: fontSize.sm,
                        fontWeight: fontWeight.semibold,
                        color: pnlColor,
                      }}
                    >
                      {formatPnl(pnl, locale)}
                    </span>
                    <span
                      style={{
                        marginLeft: spacing[2],
                        fontFamily: fontStacks.mono,
                        fontSize: fontSize.xs,
                        color: pnlColor,
                      }}
                    >
                      {formatPct(pnlPct)}
                    </span>
                  </td>
                </tr>
                {note ? (
                  <tr>
                    <td colSpan={2} style={{ paddingTop: spacing[1] }}>
                      <span
                        style={{
                          fontSize: fontSize.xs,
                          color: colors.ink2,
                          lineHeight: lineHeight.snug,
                          fontStyle: 'italic',
                        }}
                      >
                        {note}
                      </span>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </td>
        </tr>
      </tbody>
    </table>
  );
}

export default TradeRow;
