#!/usr/bin/env node
/**
 * wealth.Investing — Screenshot de Stories para Instagram
 *
 * Uso:
 *   node scripts/screenshot-stories.js <arquivo-html> [pasta-output]
 *
 * Cada <div class="slide"> vira um PNG: slide-01.png, slide-02.png...
 * Output: 2160×3840px (2× para Instagram Stories 1080×1920)
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const SLIDE_W = 1080;
const SLIDE_H = 1920;
const SCALE = 1; // Use 1x to avoid memory issues; output is 1080×1920 native

async function run() {
  const htmlFile = process.argv[2];
  const outputDir = process.argv[3] || path.join(path.dirname(htmlFile), 'pngs');

  if (!htmlFile) {
    console.error('Uso: node scripts/screenshot-stories.js <arquivo.html> [pasta-output]');
    process.exit(1);
  }

  const absolutePath = path.resolve(htmlFile);
  if (!fs.existsSync(absolutePath)) {
    console.error(`Arquivo não encontrado: ${absolutePath}`);
    process.exit(1);
  }

  fs.mkdirSync(outputDir, { recursive: true });

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  await page.setViewport({
    width: SLIDE_W,
    height: SLIDE_H,
    deviceScaleFactor: SCALE,
  });

  await page.goto(`file://${absolutePath}`, { waitUntil: 'networkidle0' });
  await page.evaluate(() => document.fonts.ready);

  const slideCount = await page.evaluate(() =>
    document.querySelectorAll('.slide').length
  );

  if (slideCount === 0) {
    console.error('Nenhum elemento .slide encontrado no HTML.');
    await browser.close();
    process.exit(1);
  }

  console.log(`\n📸 wealth.Investing — Gerando ${slideCount} story(ies)...\n`);

  for (let i = 0; i < slideCount; i++) {
    await page.evaluate((index) => {
      document.querySelectorAll('.slide').forEach((el, j) => {
        el.style.display = j === index ? 'flex' : 'none';
      });
    }, i);

    const fileName = `slide-${String(i + 1).padStart(2, '0')}.png`;
    const filePath = path.join(outputDir, fileName);

    await page.screenshot({
      path: filePath,
      clip: { x: 0, y: 0, width: SLIDE_W, height: SLIDE_H },
    });

    console.log(`  ✓ ${fileName}`);
  }

  await browser.close();
  console.log(`\n✅ Stories salvos em: ${path.resolve(outputDir)}\n`);
}

run().catch((err) => {
  console.error('Erro:', err.message);
  process.exit(1);
});
