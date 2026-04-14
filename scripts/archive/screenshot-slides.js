#!/usr/bin/env node
/**
 * wealth.Investing — Screenshot de Slides para Instagram
 *
 * Uso:
 *   node scripts/screenshot-slides.js <arquivo-html> [pasta-output]
 *
 * Exemplo:
 *   node scripts/screenshot-slides.js posts/btc-analise.html posts/btc-analise/
 *
 * Cada <div class="slide"> no HTML vira um PNG numerado: slide-01.png, slide-02.png...
 * Output: 2160×2160px (2× para Instagram — nítido em qualquer tela)
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const SLIDE_SIZE = 1080;
const SCALE = 2; // deviceScaleFactor — output final 2160×2160px

async function run() {
  const htmlFile = process.argv[2];
  const outputDir = process.argv[3] || path.join(path.dirname(htmlFile), 'slides-output');

  if (!htmlFile) {
    console.error('Uso: node scripts/screenshot-slides.js <arquivo.html> [pasta-output]');
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
    width: SLIDE_SIZE,
    height: SLIDE_SIZE,
    deviceScaleFactor: SCALE,
  });

  await page.goto(`file://${absolutePath}`, { waitUntil: 'networkidle0' });

  // Aguarda fontes Google carregarem (Inter)
  await page.evaluate(() => document.fonts.ready);

  const slideCount = await page.evaluate(() =>
    document.querySelectorAll('.slide').length
  );

  if (slideCount === 0) {
    console.error('Nenhum elemento .slide encontrado no HTML.');
    await browser.close();
    process.exit(1);
  }

  console.log(`\n📸 wealth.Investing — Gerando ${slideCount} slide(s)...\n`);

  for (let i = 0; i < slideCount; i++) {
    // Mostra somente o slide atual, esconde os outros
    await page.evaluate((index) => {
      document.querySelectorAll('.slide').forEach((el, j) => {
        el.style.display = j === index ? 'flex' : 'none';
      });
    }, i);

    const fileName = `slide-${String(i + 1).padStart(2, '0')}.png`;
    const filePath = path.join(outputDir, fileName);

    await page.screenshot({
      path: filePath,
      clip: { x: 0, y: 0, width: SLIDE_SIZE, height: SLIDE_SIZE },
    });

    console.log(`  ✓ ${fileName}`);
  }

  await browser.close();

  console.log(`\n✅ Slides salvos em: ${path.resolve(outputDir)}\n`);
}

run().catch((err) => {
  console.error('Erro:', err.message);
  process.exit(1);
});
