#!/usr/bin/env node
/**
 * screenshot-assets.js
 * Exporta assets de identidade (avatar + destaques) via Puppeteer
 *
 * Uso:
 *   node scripts/screenshot-assets.js
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const BASE = process.cwd();

async function exportAvatar(browser) {
  const page = await browser.newPage();
  const htmlPath = path.join(BASE, 'posts/assets/avatar/avatar.html');

  await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle0' });

  const el = await page.$('.avatar');

  // 1080×1080 (deviceScaleFactor = 1080/120 = 9)
  await page.setViewport({ width: 120, height: 120, deviceScaleFactor: 9 });
  await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle0' });
  const el1 = await page.$('.avatar');
  await el1.screenshot({
    path: path.join(BASE, 'posts/assets/avatar/avatar-1080.png'),
    omitBackground: true
  });
  console.log('  ✓ avatar-1080.png (1080×1080)');

  // 320×320 (deviceScaleFactor = 320/120 ≈ 2.667)
  await page.setViewport({ width: 120, height: 120, deviceScaleFactor: 320/120 });
  await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle0' });
  const el2 = await page.$('.avatar');
  await el2.screenshot({
    path: path.join(BASE, 'posts/assets/avatar/avatar-320.png'),
    omitBackground: true
  });
  console.log('  ✓ avatar-320.png (320×320)');

  await page.close();
}

async function exportDestaques(browser) {
  const page = await browser.newPage();
  const htmlPath = path.join(BASE, 'posts/assets/destaques/destaques.html');

  // deviceScaleFactor = 1080/120 = 9
  await page.setViewport({ width: 120, height: 120, deviceScaleFactor: 9 });
  await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle0' });

  const items = [
    { id: 'journal', name: 'journal' },
    { id: 'analytics', name: 'analytics' },
    { id: 'risco', name: 'risco' },
    { id: 'ai-coach', name: 'ai-coach' },
    { id: 'multi-conta', name: 'multi-conta' },
  ];

  for (const item of items) {
    const el = await page.$(`#${item.id}`);
    if (!el) {
      console.log(`  ✗ ${item.name} — elemento não encontrado`);
      continue;
    }
    await el.screenshot({
      path: path.join(BASE, `posts/assets/destaques/${item.name}.png`),
      omitBackground: true
    });
    console.log(`  ✓ ${item.name}.png (1080×1080)`);
  }

  await page.close();
}

(async () => {
  console.log('🎨 wealth.Investing — Exportando assets de identidade...\n');

  const browser = await puppeteer.launch({ headless: 'new' });

  console.log('── AVATAR ──');
  await exportAvatar(browser);

  console.log('\n── DESTAQUES ──');
  await exportDestaques(browser);

  await browser.close();

  console.log('\n✅ Assets exportados com sucesso!');
})();
