/**
 * Screenshot Banner — 1500x500 (X/Twitter header)
 * Usage: node scripts/screenshot-banner.js <html-file> <output-path>
 */
const puppeteer = require("puppeteer");
const path = require("path");

const [htmlFile, outputPath] = process.argv.slice(2);
if (!htmlFile || !outputPath) { console.error("Usage: node scripts/screenshot-banner.js <html> <output>"); process.exit(1); }

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  await page.setViewport({ width: 1500, height: 500, deviceScaleFactor: 2 });
  await page.goto(`file:///${path.resolve(htmlFile).replace(/\\/g, "/")}`, { waitUntil: "networkidle0" });
  await page.evaluate(() => document.fonts.ready);
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: path.resolve(outputPath), clip: { x: 0, y: 0, width: 1500, height: 500 } });
  await browser.close();
  console.log(`✅ Banner saved: ${path.resolve(outputPath)}`);
})();
