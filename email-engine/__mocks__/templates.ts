// Mock template factory — stand-in for Track A React Email components.
// Each renderer returns { subject, html, text } and is keyed by TemplateId.
// When Track A merges email/templates/*, replace this file with a thin
// wrapper that calls @react-email/render(<Component {...props}/>).

import type {
  RenderedEmail,
  TemplateId,
  TemplatePropsMap,
  DailyBriefingProps,
  WeeklyRecapProps,
  WelcomeProps,
  UpgradeProps,
} from "./types";

const COMPANY_ADDRESS =
  process.env.COMPANY_ADDRESS ?? "wealth.Investing — endereço pendente";

function footer(unsubscribeUrl: string, appUrl: string): string {
  return `
    <hr style="border:none;border-top:1px solid #e5e5ea;margin:32px 0 16px"/>
    <p style="font-size:12px;color:#86868b;line-height:1.5;margin:0 0 8px">
      ${COMPANY_ADDRESS}
    </p>
    <p style="font-size:12px;color:#86868b;line-height:1.5;margin:0">
      <a href="${unsubscribeUrl}" style="color:#86868b">Descadastrar</a> ·
      <a href="mailto:dpo@owealthinvesting.com" style="color:#86868b">DPO</a> ·
      <a href="${appUrl}" style="color:#86868b">Acessar painel</a>
    </p>`;
}

function shell(title: string, body: string, unsubscribeUrl: string, appUrl: string): string {
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"/><title>${title}</title></head>
<body style="margin:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text',sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f7;padding:24px 0">
  <tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:22px;padding:32px;max-width:600px">
      <tr><td>${body}${footer(unsubscribeUrl, appUrl)}</td></tr>
    </table>
  </td></tr>
</table></body></html>`;
}

function biasLabel(bias: string): string {
  if (bias === "risk-on") return "Risk-on";
  if (bias === "risk-off") return "Risk-off";
  return "Neutro";
}

function impactColor(impact: string): string {
  if (impact === "high") return "#d70015";
  if (impact === "med") return "#ff9500";
  return "#86868b";
}

function impactLabel(impact: string): string {
  if (impact === "high") return "Alto";
  if (impact === "med") return "Médio";
  return "Baixo";
}

function renderDailyBriefing(p: DailyBriefingProps): RenderedEmail {
  const eventsHtml = p.today
    .map(
      (e) => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #f5f5f7;width:60px;font-size:14px;color:#1d1d1f;font-variant-numeric:tabular-nums">${e.time}</td>
        <td style="padding:8px 0;border-bottom:1px solid #f5f5f7;font-size:14px;color:#1d1d1f">
          <strong>${e.ticker}</strong> ${e.label}
        </td>
        <td style="padding:8px 0;border-bottom:1px solid #f5f5f7;text-align:right">
          <span style="font-size:11px;color:${impactColor(e.impact)};text-transform:uppercase;letter-spacing:0.5px">${impactLabel(e.impact)}</span>
        </td>
      </tr>`,
    )
    .join("");

  const body = `
    <p style="font-size:13px;color:#86868b;text-transform:uppercase;letter-spacing:1px;margin:0 0 4px">Briefing · ${p.date}</p>
    <h1 style="font-size:24px;font-weight:600;color:#1d1d1f;margin:0 0 24px;letter-spacing:-0.022em">Bias do dia: ${biasLabel(p.marketBias)}</h1>

    <h2 style="font-size:13px;color:#86868b;text-transform:uppercase;letter-spacing:1px;margin:0 0 12px">Overnight</h2>
    <p style="font-size:15px;line-height:1.5;color:#1d1d1f;margin:0 0 24px">${p.overnight}</p>

    <h2 style="font-size:13px;color:#86868b;text-transform:uppercase;letter-spacing:1px;margin:0 0 12px">Hoje</h2>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px">${eventsHtml}</table>

    <h2 style="font-size:13px;color:#86868b;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px">Amanhã</h2>
    <p style="font-size:14px;color:#1d1d1f;margin:0 0 24px">${p.tomorrow}</p>

    <blockquote style="border-left:3px solid #1d1d1f;padding:8px 0 8px 16px;margin:24px 0;font-size:15px;color:#1d1d1f;line-height:1.4">
      ${p.principle.quote}${p.principle.attribution ? `<br/><span style="font-size:12px;color:#86868b">— ${p.principle.attribution}</span>` : ""}
    </blockquote>`;

  return {
    subject: `Briefing ${p.date} · ${biasLabel(p.marketBias)}`,
    html: shell(`Briefing ${p.date}`, body, p.unsubscribeUrl, p.appUrl),
    text: `Briefing ${p.date}\nBias: ${biasLabel(p.marketBias)}\n\nOvernight:\n${p.overnight}\n\nHoje:\n${p.today.map((e) => `${e.time} ${e.ticker} ${e.label} [${impactLabel(e.impact)}]`).join("\n")}\n\nAmanhã: ${p.tomorrow}\n\n"${p.principle.quote}"`,
  };
}

function renderWeeklyRecap(p: WeeklyRecapProps): RenderedEmail {
  const tradesHtml =
    p.trades.length === 0
      ? `<p style="font-size:14px;color:#86868b;margin:0 0 16px">Sem trades fechados nesta semana.</p>`
      : p.trades
          .map(
            (t) => `
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #f5f5f7;font-size:14px;color:#1d1d1f"><strong>${t.asset}</strong> · ${t.direction}</td>
          <td style="padding:8px 0;border-bottom:1px solid #f5f5f7;font-size:14px;text-align:right;color:${t.pnl >= 0 ? "#34c759" : "#d70015"};font-variant-numeric:tabular-nums">${t.pnl >= 0 ? "+" : ""}${t.pnl.toFixed(2)} (${t.pnlPct >= 0 ? "+" : ""}${t.pnlPct.toFixed(2)}%)</td>
        </tr>`,
          )
          .join("");

  const body = `
    <p style="font-size:13px;color:#86868b;text-transform:uppercase;letter-spacing:1px;margin:0 0 4px">Recap · ${p.date}</p>
    <h1 style="font-size:24px;font-weight:600;color:#1d1d1f;margin:0 0 24px;letter-spacing:-0.022em">Sua semana, ${p.firstName}</h1>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px">
      <tr>
        <td style="padding:16px;background:#f5f5f7;border-radius:12px;text-align:center">
          <div style="font-size:11px;color:#86868b;text-transform:uppercase;letter-spacing:1px">PnL %</div>
          <div style="font-size:28px;font-weight:600;color:${p.pnlPct >= 0 ? "#34c759" : "#d70015"};margin-top:4px">${p.pnlPct >= 0 ? "+" : ""}${p.pnlPct.toFixed(2)}%</div>
        </td>
        <td style="width:16px"></td>
        <td style="padding:16px;background:#f5f5f7;border-radius:12px;text-align:center">
          <div style="font-size:11px;color:#86868b;text-transform:uppercase;letter-spacing:1px">Win rate</div>
          <div style="font-size:28px;font-weight:600;color:#1d1d1f;margin-top:4px">${p.winRate.toFixed(0)}%</div>
        </td>
      </tr>
    </table>

    <h2 style="font-size:13px;color:#86868b;text-transform:uppercase;letter-spacing:1px;margin:0 0 12px">Trades</h2>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px">${tradesHtml}</table>

    <h2 style="font-size:13px;color:#86868b;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px">Lição da semana</h2>
    <p style="font-size:15px;line-height:1.5;color:#1d1d1f;margin:0 0 24px">${p.lesson}</p>`;

  return {
    subject: `Recap semanal · ${p.pnlPct >= 0 ? "+" : ""}${p.pnlPct.toFixed(2)}%`,
    html: shell(`Recap ${p.date}`, body, p.unsubscribeUrl, p.appUrl),
    text: `Recap ${p.date}\n\nPnL: ${p.pnlPct.toFixed(2)}% · Win rate: ${p.winRate.toFixed(0)}%\n\nTrades:\n${p.trades.map((t) => `${t.asset} ${t.direction} ${t.pnl.toFixed(2)} (${t.pnlPct.toFixed(2)}%)`).join("\n") || "Sem trades."}\n\nLição: ${p.lesson}`,
  };
}

function renderWelcome(
  day: number,
  p: WelcomeProps & { couponCode?: string; couponPctOff?: number },
): RenderedEmail {
  const dayContent: Record<number, { subject: string; title: string; body: string }> = {
    0: {
      subject: `Bem-vindo, ${p.firstName}`,
      title: `Bem-vindo, ${p.firstName}`,
      body: `<p style="font-size:15px;line-height:1.5">Sua conta wealth.Investing está pronta. Confirme seu email para começar a receber briefings diários.</p>`,
    },
    1: {
      subject: "Configure sua conta em 2 minutos",
      title: "Setup rápido",
      body: `<p style="font-size:15px;line-height:1.5">Conecte sua corretora e importe seu primeiro trade. Quanto antes começar a registrar, mais cedo o sistema gera insights úteis.</p>`,
    },
    2: {
      subject: "Tour pelo journal e contas",
      title: "Como organizar suas operações",
      body: `<p style="font-size:15px;line-height:1.5">O journal separa contas prop, pessoais e cripto. Cada operação é classificada por sessão e exibida no heatmap. Veja como navegar.</p>`,
    },
    3: {
      subject: "Macro intelligence — antecipe o mercado",
      title: "Macro: o que monitoramos",
      body: `<p style="font-size:15px;line-height:1.5">Calendário econômico, narrativa semanal, breaking alerts. Tudo num lugar só. A aba Macro é grátis no plano Free.</p>`,
    },
    5: {
      subject: "Risco por trade — a regra mais importante",
      title: "Quanto você arrisca por operação?",
      body: `<p style="font-size:15px;line-height:1.5">Operadores que sobrevivem definem o risco antes da entrada. 1-2% do capital por trade é o piso da disciplina. Drawdown vem de sizing, não de azar.</p>`,
    },
    6: {
      subject: "Tese clara, journal honesto",
      title: "Por que journal importa mais que método",
      body: `<p style="font-size:15px;line-height:1.5">Setup vence sem journal? Talvez. Setup escala sem journal? Nunca. Quem revisa cresce. Quem evita repete.</p>`,
    },
    7: {
      subject: p.couponCode
        ? `Pro com ${p.couponPctOff}% off — ${p.firstName}, último dia da trial`
        : `${p.firstName}, sua trial termina em breve`,
      title: "Hora de decidir",
      body: `<p style="font-size:15px;line-height:1.5">${
        p.couponCode
          ? `Você usou o Free por uma semana. Pro libera AI Coach, macro completo e dashboard consolidado. Cupom <strong>${p.couponCode}</strong> — ${p.couponPctOff}% off por 3 meses.`
          : "Pro libera AI Coach, macro completo e dashboard consolidado. Trial expira em breve."
      }</p>
      <p style="margin:24px 0"><a href="${p.appUrl}/pricing" style="display:inline-block;background:#1d1d1f;color:#fff;padding:12px 24px;border-radius:999px;text-decoration:none;font-size:14px;font-weight:600">Ver planos</a></p>`,
    },
  };

  const c = dayContent[day] ?? dayContent[0];
  const body = `
    <p style="font-size:13px;color:#86868b;text-transform:uppercase;letter-spacing:1px;margin:0 0 4px">Onboarding · Dia ${day}</p>
    <h1 style="font-size:24px;font-weight:600;color:#1d1d1f;margin:0 0 24px;letter-spacing:-0.022em">${c.title}</h1>
    ${c.body}`;

  return {
    subject: c.subject,
    html: shell(c.title, body, p.unsubscribeUrl, p.appUrl),
    text: `${c.title}\n\n${c.body.replace(/<[^>]+>/g, "").trim()}`,
  };
}

function renderUpgrade(day: number, p: UpgradeProps): RenderedEmail {
  const couponLine = p.couponCode
    ? `<p style="font-size:14px;color:#1d1d1f;background:#f5f5f7;padding:12px;border-radius:8px;margin:16px 0">Cupom <strong>${p.couponCode}</strong> · ${p.couponPctOff}% off por 3 meses${p.validUntil ? ` · válido até ${p.validUntil}` : ""}.</p>`
    : "";

  const dayContent: Record<number, { subject: string; title: string; intro: string }> = {
    0: {
      subject: `${p.firstName}, libere o ${p.targetPlan} com cupom`,
      title: `Hora do upgrade, ${p.firstName}`,
      intro: `Você está usando o ${p.currentPlan} ativamente há semanas. ${p.targetPlan} libera AI Coach completo, macro intelligence completo e dashboard consolidado.`,
    },
    7: {
      subject: `Lembrete · cupom ${p.couponCode ?? "ativo"} expira em 7 dias`,
      title: "Cupom termina em 7 dias",
      intro: `Não deixe o desconto expirar. Sua semana de uso mostra que ${p.targetPlan} faz sentido pra você.`,
    },
    14: {
      subject: `Última chance — ${p.couponPctOff ?? ""}% off expira hoje`,
      title: "Última chamada",
      intro: `Cupom expira hoje. Próxima oferta vem em meses.`,
    },
  };

  const c = dayContent[day] ?? dayContent[0];
  const body = `
    <p style="font-size:13px;color:#86868b;text-transform:uppercase;letter-spacing:1px;margin:0 0 4px">Upgrade · Dia ${day}</p>
    <h1 style="font-size:24px;font-weight:600;color:#1d1d1f;margin:0 0 24px;letter-spacing:-0.022em">${c.title}</h1>
    <p style="font-size:15px;line-height:1.5;color:#1d1d1f;margin:0 0 16px">${c.intro}</p>
    ${couponLine}
    <p style="margin:24px 0"><a href="${p.pricingUrl}" style="display:inline-block;background:#1d1d1f;color:#fff;padding:12px 24px;border-radius:999px;text-decoration:none;font-size:14px;font-weight:600">Fazer upgrade</a></p>`;

  return {
    subject: c.subject,
    html: shell(c.title, body, p.unsubscribeUrl, p.pricingUrl),
    text: `${c.title}\n\n${c.intro}\n\n${p.couponCode ? `Cupom: ${p.couponCode} (${p.couponPctOff}% off)` : ""}\n\n${p.pricingUrl}`,
  };
}

function renderChurn(
  day: number,
  p: { firstName: string; locale: "pt-BR" | "en-US"; unsubscribeUrl: string; appUrl: string; couponCode?: string; couponPctOff?: number },
): RenderedEmail {
  const c =
    day === 0
      ? {
          subject: `${p.firstName}, sentimos sua falta`,
          title: "Volte quando quiser",
          body: `<p style="font-size:15px;line-height:1.5">Sua assinatura foi cancelada. Suas operações e journal continuam acessíveis no plano Free. Pode reativar a qualquer momento.</p>`,
        }
      : {
          subject: p.couponCode
            ? `${p.couponPctOff}% off pra voltar — só hoje`
            : `Pronto pra voltar, ${p.firstName}?`,
          title: "Oferta de retorno",
          body: `<p style="font-size:15px;line-height:1.5">${p.couponCode ? `Cupom <strong>${p.couponCode}</strong> · ${p.couponPctOff}% off por 3 meses na reativação.` : "Estamos por aqui quando você decidir voltar."}</p>
            <p style="margin:24px 0"><a href="${p.appUrl}/pricing" style="display:inline-block;background:#1d1d1f;color:#fff;padding:12px 24px;border-radius:999px;text-decoration:none;font-size:14px;font-weight:600">Reativar</a></p>`,
        };
  const body = `
    <p style="font-size:13px;color:#86868b;text-transform:uppercase;letter-spacing:1px;margin:0 0 4px">Cancelamento · Dia ${day}</p>
    <h1 style="font-size:24px;font-weight:600;color:#1d1d1f;margin:0 0 24px;letter-spacing:-0.022em">${c.title}</h1>
    ${c.body}`;
  return { subject: c.subject, html: shell(c.title, body, p.unsubscribeUrl, p.appUrl), text: `${c.title}` };
}

function renderOptIn(p: { firstName: string; locale: "pt-BR" | "en-US"; confirmUrl: string }): RenderedEmail {
  const body = `
    <h1 style="font-size:24px;font-weight:600;color:#1d1d1f;margin:0 0 16px;letter-spacing:-0.022em">Confirme seu email, ${p.firstName}</h1>
    <p style="font-size:15px;line-height:1.5;color:#1d1d1f;margin:0 0 24px">Clique abaixo para confirmar que você quer receber briefings da wealth.Investing.</p>
    <p style="margin:0 0 24px"><a href="${p.confirmUrl}" style="display:inline-block;background:#1d1d1f;color:#fff;padding:12px 24px;border-radius:999px;text-decoration:none;font-size:14px;font-weight:600">Confirmar inscrição</a></p>
    <p style="font-size:12px;color:#86868b;line-height:1.5">Se você não criou esta conta, ignore este email.</p>`;
  return {
    subject: "Confirme seu email — wealth.Investing",
    html: shell("Confirme seu email", body, p.confirmUrl, p.confirmUrl),
    text: `Confirme seu email: ${p.confirmUrl}`,
  };
}

export function renderTemplate<T extends TemplateId>(
  template: T,
  props: TemplatePropsMap[T],
): RenderedEmail {
  switch (template) {
    case "daily-briefing":
      return renderDailyBriefing(props as DailyBriefingProps);
    case "weekly-recap":
      return renderWeeklyRecap(props as WeeklyRecapProps);
    case "welcome.day0":
      return renderWelcome(0, props as WelcomeProps);
    case "welcome.day1":
      return renderWelcome(1, props as WelcomeProps);
    case "welcome.day2":
      return renderWelcome(2, props as WelcomeProps);
    case "welcome.day3":
      return renderWelcome(3, props as WelcomeProps);
    case "welcome.day5":
      return renderWelcome(5, props as WelcomeProps);
    case "welcome.day6":
      return renderWelcome(6, props as WelcomeProps);
    case "welcome.day7":
      return renderWelcome(7, props as WelcomeProps & { couponCode?: string; couponPctOff?: number });
    case "upgrade.day0":
      return renderUpgrade(0, props as UpgradeProps);
    case "upgrade.day7":
      return renderUpgrade(7, props as UpgradeProps);
    case "upgrade.day14":
      return renderUpgrade(14, props as UpgradeProps);
    case "churn.day0":
      return renderChurn(0, props as TemplatePropsMap["churn.day0"]);
    case "churn.day14":
      return renderChurn(14, props as TemplatePropsMap["churn.day14"]);
    case "opt-in-confirm":
      return renderOptIn(props as TemplatePropsMap["opt-in-confirm"]);
    default: {
      const _exhaustive: never = template;
      throw new Error(`Unknown template: ${String(_exhaustive)}`);
    }
  }
}
