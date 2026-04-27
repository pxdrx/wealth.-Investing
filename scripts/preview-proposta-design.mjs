// Sends the EXACT design from marketing/Marketing Hub.html proposal
// to a recipient. Wraps the email-v2 section + the proposal stylesheet
// in a self-contained HTML doc.
// Run: node --env-file=.env.local scripts/preview-proposta-design.mjs <to>

import { readFileSync } from "node:fs";
import { Resend } from "resend";

const TO = process.argv[2] ?? "phalmeidapinheiro2004@gmail.com";

const src = readFileSync("marketing/Marketing Hub.html", "utf8");
const lines = src.split("\n");

// Style block: line 10 (1-indexed) → line 717 (which is </style>)
const styleStart = lines.findIndex((l) => l.trim() === "<style>");
const styleEnd = lines.findIndex((l, i) => i > styleStart && l.trim() === "</style>");
const styleBlock = lines.slice(styleStart, styleEnd + 1).join("\n");

// Email block: starts where `<div class="em" id="email-v2">` lives.
const emStart = lines.findIndex((l) => l.includes('id="email-v2"'));
// Closing </div> two indents after </footer>. Walk forward past </footer>, take next </div>.
let emEnd = -1;
for (let i = emStart; i < lines.length; i++) {
  if (lines[i].includes("</footer>")) {
    for (let j = i + 1; j < lines.length; j++) {
      if (lines[j].trim() === "</div>") {
        emEnd = j;
        break;
      }
    }
    break;
  }
}

if (emStart === -1 || emEnd === -1) {
  console.error("Could not locate email block in proposal");
  process.exit(1);
}

const emailBody = lines.slice(emStart, emEnd + 1).join("\n");

// Wrap in valid email HTML. Center the email inside a neutral background
// since the proposal showed it inside a device frame; email clients have
// their own viewport, so we let .em layout handle width.
const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Briefing · wealth.Investing</title>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
${styleBlock}
<style>
  /* Email-client safety overrides — strip page chrome that lived
     in the marketing site context. */
  body { margin: 0; padding: 24px 12px; background: #f5f5f7; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
  .em { margin: 0 auto !important; }
</style>
</head>
<body>
${emailBody}
</body>
</html>`;

const resend = new Resend(process.env.RESEND_API_KEY);
const result = await resend.emails.send({
  from: process.env.EMAIL_FROM ?? "wealth.Investing <briefing@owealthinvesting.com>",
  to: TO,
  subject: "[PREVIEW Proposta v2] Briefing matinal — design da proposta",
  html,
  headers: { "List-Unsubscribe": "<mailto:unsubscribe@owealthinvesting.com>" },
});

console.log(JSON.stringify(result, null, 2));
