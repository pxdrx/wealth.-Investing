// Real email renderer — replaces the mock factory at send time.
// Calls @react-email/render with Track A's React components when a
// matching template exists; falls back to the legacy mock HTML factory
// for templates Track A didn't build (opt-in-confirm, churn, welcome
// day variants, upgrade variants).

import * as React from 'react';
import { render } from '@react-email/render';
import { DailyBriefing, type DailyBriefingTemplateProps } from '@/email/templates/DailyBriefing';
import { Welcome } from '@/email/templates/Welcome';
import { Upgrade } from '@/email/templates/Upgrade';
import { renderTemplate as renderMock } from './__mocks__/templates';
import { htmlToText } from '@/lib/email/send';
import { renderWeeklyReport } from '@/lib/email/templates/weekly-report';
import type {
  RenderedEmail,
  TemplateId,
  TemplatePropsMap,
} from './__mocks__/types';

function subjectForDailyBriefing(props: DailyBriefingTemplateProps): string {
  const tone =
    props.marketBias === 'risk-off'
      ? 'Risk-off'
      : props.marketBias === 'risk-on'
        ? 'Risk-on'
        : 'Neutral';
  const editionPart =
    typeof props.editionNumber === 'number'
      ? ` · Edição #${String(props.editionNumber).padStart(3, '0')}`
      : '';
  return `Briefing ${props.date} · ${tone}${editionPart}`;
}

export async function renderTemplate<T extends TemplateId>(
  template: T,
  props: TemplatePropsMap[T],
): Promise<RenderedEmail> {
  if (template === 'daily-briefing') {
    const p = props as DailyBriefingTemplateProps;
    const [html, text] = await Promise.all([
      render(<DailyBriefing {...p} />, { pretty: false }),
      render(<DailyBriefing {...p} />, { plainText: true }),
    ]);
    return {
      subject: subjectForDailyBriefing(p),
      html,
      text,
    };
  }

  if (template === 'weekly-recap') {
    const p = props as TemplatePropsMap['weekly-recap'];
    const html = renderWeeklyReport(p);
    const text = htmlToText(html);
    const firstName = p.displayName.split(' ')[0] ?? p.displayName;
    return { subject: `Sua semana, ${firstName} 📊`, html, text };
  }

  if (template === 'welcome.day0') {
    const p = props as TemplatePropsMap['welcome.day0'];
    const [html, text] = await Promise.all([
      render(<Welcome {...p} />, { pretty: false }),
      render(<Welcome {...p} />, { plainText: true }),
    ]);
    return {
      subject: `Bem-vindo, ${p.firstName}`,
      html,
      text,
    };
  }

  if (template.startsWith('upgrade.')) {
    const p = props as TemplatePropsMap['upgrade.day0'];
    const [html, text] = await Promise.all([
      render(<Upgrade {...p} />, { pretty: false }),
      render(<Upgrade {...p} />, { plainText: true }),
    ]);
    const day = template.split('.')[1] ?? 'day0';
    const subjects: Record<string, string> = {
      day0: `${p.firstName}, libere o ${p.targetPlan} com cupom`,
      day7: `Lembrete · cupom ${p.couponCode ?? 'ativo'} expira em 7 dias`,
      day14: `Última chance — ${p.couponPctOff ?? ''}% off expira hoje`,
    };
    return {
      subject: subjects[day] ?? subjects.day0,
      html,
      text,
    };
  }

  // welcome.day1-7, churn.*, opt-in-confirm — Track A didn't ship these
  // variants; fall back to the engine's mock factory which produces a
  // simple branded HTML.
  return renderMock(template, props);
}
