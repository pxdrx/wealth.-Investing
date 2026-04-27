// Render Track A templates → email/dist/{name}.html (pretty) + .min.html.
// Run with: npx tsx scripts/email-build.ts
// Track B can import templates directly from email/templates OR consume these HTMLs.

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { render } from '@react-email/render';

import DailyBriefingPreview from '../email/preview/daily-briefing.preview';
import WeeklyRecapPreview from '../email/preview/weekly-recap.preview';
import WelcomePreview from '../email/preview/welcome.preview';
import UpgradePreview from '../email/preview/upgrade.preview';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = join(__dirname, '..', 'email', 'dist');

const TEMPLATES = [
  { name: 'daily-briefing', Component: DailyBriefingPreview },
  { name: 'weekly-recap', Component: WeeklyRecapPreview },
  { name: 'welcome', Component: WelcomePreview },
  { name: 'upgrade', Component: UpgradePreview },
];

async function main() {
  await mkdir(DIST, { recursive: true });

  for (const { name, Component } of TEMPLATES) {
    const element = Component();
    const pretty = await render(element, { pretty: true });
    const min = await render(element, { pretty: false });
    await writeFile(join(DIST, `${name}.html`), pretty, 'utf8');
    await writeFile(join(DIST, `${name}.min.html`), min, 'utf8');
    console.log(`✓ ${name} → ${pretty.length}b pretty / ${min.length}b min`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
