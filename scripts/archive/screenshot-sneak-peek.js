/**
 * Screenshot Sneak Peek — 4 feature screenshots for X/Twitter post
 * 1200x675 (16:9 Twitter card ratio), 2x retina
 *
 * Usage: node scripts/screenshot-sneak-peek.js
 *
 * Opens a visible browser. If not authenticated, you have 60s to log in manually.
 * After auth is detected, screenshots are taken automatically.
 */

const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");
const readline = require("readline");

const BASE_URL = "http://localhost:3000";
const OUTPUT_DIR = path.resolve(__dirname, "../posts/X/x-assets-20260329/pngs");

const PAGES = [
  { name: "screenshot-journal", path: "/app/journal", waitFor: 5000 },
  { name: "screenshot-dexter", path: "/app/analyst", waitFor: 6000 },
  { name: "screenshot-macro", path: "/app/macro", waitFor: 5000 },
  { name: "screenshot-analytics", path: "/app/reports", waitFor: 5000 },
];

function askUser(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function waitForAuth(page, timeoutMs = 120000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const url = page.url();
    // If we're on /app/* and NOT on /login, we're authenticated
    if (url.includes("/app") && !url.includes("/login")) {
      return true;
    }
    // Check if page has auth indicators
    const hasAuth = await page.evaluate(() => {
      // Check for localStorage Supabase keys
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.includes("supabase") && key.includes("auth")) {
          return true;
        }
      }
      return false;
    }).catch(() => false);

    if (hasAuth) return true;
    await new Promise((r) => setTimeout(r, 2000));
  }
  return false;
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  console.log("🚀 Launching visible browser...");
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--window-size=1280,750",
    ],
  });

  const page = (await browser.pages())[0];
  await page.setViewport({ width: 1200, height: 675, deviceScaleFactor: 2 });

  console.log("Navigating to app...");
  try {
    await page.goto(`${BASE_URL}/app`, {
      waitUntil: "networkidle2",
      timeout: 15000,
    });
  } catch (err) {
    console.error(`Cannot reach ${BASE_URL}. Is the dev server running?`);
    await browser.close();
    process.exit(1);
  }

  const currentUrl = page.url();
  if (currentUrl.includes("/login") || !currentUrl.includes("/app")) {
    console.log("\n⚠️  Authentication required!");
    console.log("👉 Please log in using the browser window that just opened.");
    console.log("   Waiting for authentication (up to 2 minutes)...\n");

    const authed = await waitForAuth(page);
    if (!authed) {
      console.error("❌ Timed out waiting for authentication.");
      await browser.close();
      process.exit(1);
    }
    console.log("✅ Authentication detected!\n");
    // Extra wait for dashboard to fully load
    await new Promise((r) => setTimeout(r, 3000));
  } else {
    console.log("✅ Already authenticated.");
  }

  // Now take screenshots
  for (const { name, path: pagePath, waitFor } of PAGES) {
    console.log(`📸 Navigating to ${pagePath}...`);
    try {
      await page.goto(`${BASE_URL}${pagePath}`, {
        waitUntil: "networkidle2",
        timeout: 25000,
      });
    } catch (err) {
      console.log(`  ⏳ Timeout on networkidle2, continuing...`);
    }

    // Wait for content to render
    await new Promise((r) => setTimeout(r, waitFor));

    // Wait for fonts
    await page.evaluate(() => document.fonts.ready);

    // Scroll to top
    await page.evaluate(() => window.scrollTo(0, 0));
    await new Promise((r) => setTimeout(r, 500));

    // Hide floating elements that interfere with screenshots
    await page.evaluate(() => {
      const selectors = [
        '[data-radix-popper-content-wrapper]',
        '.Toastify',
        '[role="status"]',
        '.sonner-toast-wrapper',
      ];
      selectors.forEach((sel) => {
        document.querySelectorAll(sel).forEach((el) => {
          el.style.display = "none";
        });
      });
    });

    const outputPath = path.join(OUTPUT_DIR, `${name}.png`);
    await page.screenshot({
      path: outputPath,
      clip: { x: 0, y: 0, width: 1200, height: 675 },
    });
    console.log(`  ✅ ${name}.png saved`);
  }

  await browser.close();
  console.log(`\n🎉 All screenshots saved to:\n   ${OUTPUT_DIR}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
