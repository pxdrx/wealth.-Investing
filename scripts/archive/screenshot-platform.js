#!/usr/bin/env node
/**
 * wealth.Investing — Platform Screenshots for Marketing
 * Auto-login + screenshots of main pages
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'http://localhost:3000';
const WIDTH = 1200;
const HEIGHT = 675;
const SCALE = 2;

const PAGES = [
  { name: 'screenshot-journal', path: '/app/journal', waitFor: 5000, description: 'Trade Journal' },
  { name: 'screenshot-dexter', path: '/app/analyst', waitFor: 5000, description: 'Analyst Dexter', action: 'dexter' },
  { name: 'screenshot-macro', path: '/app/macro', waitFor: 5000, description: 'Macro Intelligence' },
  { name: 'screenshot-analytics', path: '/app', waitFor: 5000, description: 'Dashboard Analytics' },
];

async function run() {
  const outputDir = process.argv[2] || path.join(__dirname, '..', 'posts', 'X', 'x-assets-20260329', 'pngs');
  fs.mkdirSync(outputDir, { recursive: true });

  console.log('Abrindo browser...');

  const browser = await puppeteer.launch({
    headless: 'new',
    defaultViewport: { width: WIDTH, height: HEIGHT, deviceScaleFactor: SCALE },
  });

  const page = await browser.newPage();

  // Go to login page
  console.log('Navegando para login...');
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2', timeout: 15000 });
  await new Promise(r => setTimeout(r, 2000));

  // Fill login form
  console.log('Fazendo login...');

  // Click "Entrar" tab if needed
  const entrarTab = await page.$('button::-p-text(Entrar)');
  if (entrarTab) await entrarTab.click();
  await new Promise(r => setTimeout(r, 500));

  // Type email
  const emailInput = await page.$('input[type="email"], input[name="email"], input[placeholder*="email"]');
  if (emailInput) {
    await emailInput.click({ clickCount: 3 });
    await emailInput.type('phalmeidapinheiro2004@gmail.com', { delay: 30 });
  }

  // Type password
  const passwordInput = await page.$('input[type="password"], input[name="password"]');
  if (passwordInput) {
    await passwordInput.click({ clickCount: 3 });
    await passwordInput.type('Perdo!87624852', { delay: 30 });
  }

  // Click submit
  const submitBtn = await page.$('button[type="submit"], button::-p-text(Entrar no Terminal)');
  if (submitBtn) await submitBtn.click();

  // Wait for redirect to /app
  console.log('Aguardando autenticação...');
  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 3000));

  const currentUrl = page.url();
  console.log('URL atual:', currentUrl);

  if (currentUrl.includes('/login')) {
    console.log('Tentando navegar direto para /app...');
    await page.goto(`${BASE_URL}/app`, { waitUntil: 'networkidle2', timeout: 15000 });
    await new Promise(r => setTimeout(r, 3000));
  }

  if (page.url().includes('/login')) {
    console.log('ERRO: Não conseguiu autenticar. Verifique credenciais.');
    await page.screenshot({ path: path.join(outputDir, 'debug-login.png') });
    await browser.close();
    process.exit(1);
  }

  console.log('Logado! Tirando screenshots...\n');

  for (const p of PAGES) {
    process.stdout.write(`${p.description} (${p.path})... `);
    await page.goto(`${BASE_URL}${p.path}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, p.waitFor));

    // If Dexter page, click on existing BTC analysis to show report
    if (p.action === 'dexter') {
      try {
        const btcCard = await page.$('div::-p-text(BTC)');
        if (btcCard) {
          await btcCard.click();
          console.log('(clicked BTC report) ');
          await new Promise(r => setTimeout(r, 5000));
        }
      } catch (e) { /* ignore */ }
    }

    // Hide floating elements, error toasts, dev indicators
    await page.evaluate(() => {
      // Hide toasts, mobile nav, Next.js error overlay
      document.querySelectorAll('[data-mobile-nav], [data-sonner-toaster], .Toastify, nextjs-portal, [data-nextjs-toast], [data-nextjs-dialog-overlay]').forEach(el => el.style.display = 'none');
      // Hide any fixed/sticky error banners at bottom
      document.querySelectorAll('body > div').forEach(el => {
        const style = window.getComputedStyle(el);
        if (style.position === 'fixed' && parseInt(style.bottom) < 50) {
          el.style.display = 'none';
        }
      });
    });

    const filePath = path.join(outputDir, `${p.name}.png`);
    await page.screenshot({ path: filePath, type: 'png' });
    console.log('OK -> %s', path.basename(filePath));
  }

  console.log('\nPronto! %d screenshots gerados em %s', PAGES.length, outputDir);
  await browser.close();
}

run().catch(err => {
  console.error('Erro:', err.message);
  process.exit(1);
});
