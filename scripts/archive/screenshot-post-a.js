const puppeteer = require("puppeteer");
const path = require("path");

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1080, height: 1080, deviceScaleFactor: 2 });

  const filePath = path.resolve(__dirname, "../posts/opcao-a-estatistica.html");
  await page.goto(`file://${filePath}`, { waitUntil: "networkidle0" });

  // Wait for fonts to load
  await page.evaluateHandle("document.fonts.ready");
  await new Promise((r) => setTimeout(r, 1000));

  const post = await page.$(".post");
  await post.screenshot({
    path: path.resolve(__dirname, "../posts/opcao-a-estatistica.png"),
    type: "png",
  });

  console.log("Screenshot saved: posts/opcao-a-estatistica.png");
  await browser.close();
})();
