// Sends one of Track A's pre-built preview HTMLs to a recipient.
// Use this to see the actual designed template (vs Track B's mock).
// Run: node --env-file=.env.local scripts/preview-tracka-design.mjs <template> <to>
//   <template> = daily-briefing | weekly-recap | welcome | upgrade
//   <to> = recipient email

import { readFileSync } from "node:fs";
import { Resend } from "resend";

const TEMPLATE = process.argv[2] ?? "daily-briefing";
const TO = process.argv[3] ?? "phalmeidapinheiro2004@gmail.com";

const path = `email/dist/${TEMPLATE}.html`;
const html = readFileSync(path, "utf8");

const subjects = {
  "daily-briefing": "[PREVIEW Track A] Briefing matinal · design final",
  "weekly-recap": "[PREVIEW Track A] Recap semanal · design final",
  welcome: "[PREVIEW Track A] Bem-vindo · design final",
  upgrade: "[PREVIEW Track A] Upgrade · design final",
};

const resend = new Resend(process.env.RESEND_API_KEY);
const result = await resend.emails.send({
  from: process.env.EMAIL_FROM ?? "wealth.Investing <briefing@owealthinvesting.com>",
  to: TO,
  subject: subjects[TEMPLATE] ?? `[PREVIEW] ${TEMPLATE}`,
  html,
  headers: { "List-Unsubscribe": "<mailto:unsubscribe@owealthinvesting.com>" },
});

console.log(JSON.stringify(result, null, 2));
