/**
 * Screenshot X Cards — 1200x675 (16:9 optimal for X/Twitter feed)
 * Usage: node scripts/screenshot-x.js <html-file> <output-dir>
 */

const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");

const [htmlFile, outputDir] = process.argv.slice(2);

if (!htmlFile || !outputDir) {
  console.error("Usage: node scripts/screenshot-x.js <html> <output-dir>");
  process.exit(1);
}

async function main() {
  const absHtml = path.resolve(htmlFile);
  const absOutput = path.resolve(outputDir);
  fs.mkdirSync(absOutput, { recursive: true });

  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  // 2x for retina quality
  await page.setViewport({ width: 1200, height: 675, deviceScaleFactor: 2 });
  await page.goto(`file:///${absHtml.replace(/\\/g, "/")}`, { waitUntil: "networkidle0" });
  await page.evaluate(() => document.fonts.ready);
  await new Promise((r) => setTimeout(r, 500));

  const cards = await page.$$(".card");
  const count = cards.length || 1;
  console.log(`📸 X Cards — Gerando ${count} card(s)...`);

  if (cards.length === 0) {
    await page.screenshot({ path: path.join(absOutput, "card-01.png"), clip: { x: 0, y: 0, width: 1200, height: 675 } });
    console.log("  ✓ card-01.png");
  } else {
    for (let i = 0; i < cards.length; i++) {
      const box = await cards[i].boundingBox();
      await page.screenshot({
        path: path.join(absOutput, `card-${String(i + 1).padStart(2, "0")}.png`),
        clip: { x: box.x, y: box.y, width: 1200, height: 675 },
      });
      console.log(`  ✓ card-${String(i + 1).padStart(2, "0")}.png`);
    }
  }

  await browser.close();
  console.log(`\n✅ Cards salvos em: ${absOutput}`);
}

main().catch(console.error);
