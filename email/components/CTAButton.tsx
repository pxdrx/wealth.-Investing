import { Button } from '@react-email/components';
import * as React from 'react';
import { colors, fontStacks, fontSize, fontWeight } from '../tokens';

export interface CTAButtonProps {
  href: string;
  label: string;
  variant?: 'primary' | 'ghost';
}

export function CTAButton({ href, label, variant = 'primary' }: CTAButtonProps) {
  const isPrimary = variant === 'primary';
  const baseStyle: React.CSSProperties = {
    display: 'inline-block',
    fontFamily: fontStacks.sans,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    letterSpacing: '0.01em',
    borderRadius: 8,
    padding: '14px 24px',
    textDecoration: 'none',
    textAlign: 'center',
  };

  const primaryStyle: React.CSSProperties = {
    ...baseStyle,
    backgroundColor: colors.green,
    color: '#FFFFFF',
    border: `1px solid ${colors.green}`,
  };

  const ghostStyle: React.CSSProperties = {
    ...baseStyle,
    backgroundColor: 'transparent',
    color: colors.greenDeep,
    border: `1px solid ${colors.green}`,
  };

  return (
    <Button href={href} style={isPrimary ? primaryStyle : ghostStyle}>
      {label}
    </Button>
  );
}

export default CTAButton;
