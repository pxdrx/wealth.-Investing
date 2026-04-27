import * as React from 'react';
import Welcome from '../templates/Welcome';

const PROPS = {
  firstName: 'Pedro',
  locale: 'pt-BR' as const,
  trialEndsAt: '2026-05-10T23:59:59Z',
  unsubscribeUrl: 'https://wealth.investing/u?t=preview',
  appUrl: 'https://wealth.investing/app',
};

export default function Preview() {
  return <Welcome {...PROPS} />;
}
