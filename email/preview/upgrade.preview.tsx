import * as React from 'react';
import Upgrade from '../templates/Upgrade';

const PROPS = {
  firstName: 'Pedro',
  locale: 'pt-BR' as const,
  currentPlan: 'pro' as const,
  targetPlan: 'ultra' as const,
  couponCode: 'IMERSAOHSM',
  couponPctOff: 30,
  validUntil: '2026-05-15T23:59:59Z',
  unsubscribeUrl: 'https://wealth.investing/u?t=preview',
  pricingUrl: 'https://wealth.investing/pricing',
};

export default function Preview() {
  return <Upgrade {...PROPS} />;
}
