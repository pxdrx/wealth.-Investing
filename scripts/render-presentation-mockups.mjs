#!/usr/bin/env node
/**
 * Render wealth.Investing → Setup HSM presentation mockups to PNG.
 *
 * Input:  wealth.Investing/Projeto/assets/apresentacao-setup-hsm/_mockups-src/*.html
 * Output: wealth.Investing/Projeto/assets/apresentacao-setup-hsm/*.png  (1920x1080, @2x)
 *
 * Usage: node scripts/render-presentation-mockups.mjs
 */

import puppeteer from 'puppeteer';
import { readdir } from 'node:fs/promises';
import { join, resolve, basename, extname } from 'node:path';
import { pathToFileURL } from 'node:url';

const SRC_DIR = resolve(
  process.cwd(),
  'wealth.Investing/Projeto/assets/apresentacao-setup-hsm/_mockups-src',
);
const OUT_DIR = resolve(
  process.cwd(),
  'wealth.Investing/Projeto/assets/apresentacao-setup-hsm',
);
const VIEWPORT = { width: 1920, height: 1080, deviceScaleFactor: 2 };

async function run() {
  const files = (await readdir(SRC_DIR))
    .filter((f) => /^\d+-.*\.html$/.test(f))
    .sort();

  if (files.length === 0) {
    console.error('No mockup HTMLs found in', SRC_DIR);
    process.exit(1);
  }

  console.log(
    `Rendering ${files.length} mockups at ${VIEWPORT.width}x${VIEWPORT.height} @${VIEWPORT.deviceScaleFactor}x…`,
  );

  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport(VIEWPORT);

  for (const file of files) {
    const src = join(SRC_DIR, file);
    const out = join(OUT_DIR, basename(file, extname(file)) + '.png');
    const url = pathToFileURL(src).href;

    const t0 = Date.now();
    await page.goto(url, { waitUntil: 'networkidle0' });
    await page.evaluateHandle('document.fonts.ready');
    await new Promise((r) => setTimeout(r, 400));
    await page.screenshot({ path: out, fullPage: false, omitBackground: false });
    console.log(`  ✓ ${basename(file)} → ${basename(out)}  (${Date.now() - t0}ms)`);
  }

  await browser.close();
  console.log(`\nDone. PNGs saved to:\n  ${OUT_DIR}`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
