/**
 * Render Reel — Captures frames from animated HTML and stitches into MP4
 * Usage: node scripts/render-reel.js <html-file> <output-dir> [duration-seconds] [fps]
 *
 * Requires: puppeteer, ffmpeg (in PATH)
 */

const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");
const { execSync } = require("child_process");

const [htmlFile, outputDir, durationArg, fpsArg] = process.argv.slice(2);

if (!htmlFile || !outputDir) {
  console.error("Usage: node scripts/render-reel.js <html> <output-dir> [duration] [fps]");
  process.exit(1);
}

const DURATION = parseInt(durationArg || "27", 10); // seconds
const FPS = parseInt(fpsArg || "30", 10);
const TOTAL_FRAMES = DURATION * FPS;
const WIDTH = 1080;
const HEIGHT = 1920;

async function main() {
  const absHtml = path.resolve(htmlFile);
  const absOutput = path.resolve(outputDir);
  const framesDir = path.join(absOutput, "frames");

  // Ensure directories
  fs.mkdirSync(framesDir, { recursive: true });

  console.log(`🎬 Rendering reel: ${DURATION}s @ ${FPS}fps = ${TOTAL_FRAMES} frames`);

  const browser = await puppeteer.launch({
    headless: "new",
    args: [`--window-size=${WIDTH},${HEIGHT}`],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: 1 });

  // Load page with animations paused
  await page.goto(`file:///${absHtml.replace(/\\/g, "/")}`, { waitUntil: "networkidle0" });

  // Pause all animations initially
  await page.evaluate(() => {
    document.getAnimations().forEach((a) => a.pause());
  });

  // Wait for fonts
  await page.evaluate(() => document.fonts.ready);
  await new Promise((r) => setTimeout(r, 1000));

  console.log("📸 Capturing frames...");

  for (let i = 0; i < TOTAL_FRAMES; i++) {
    const timeMs = (i / FPS) * 1000;

    // Set all animations to this time
    await page.evaluate((t) => {
      document.getAnimations().forEach((a) => {
        a.currentTime = t;
      });
    }, timeMs);

    // Small delay for render
    await new Promise((r) => setTimeout(r, 16));

    const frameNum = String(i).padStart(5, "0");
    await page.screenshot({
      path: path.join(framesDir, `frame-${frameNum}.png`),
      clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT },
    });

    if (i % FPS === 0) {
      process.stdout.write(`  ${Math.round((i / TOTAL_FRAMES) * 100)}%\r`);
    }
  }

  console.log("  100% — frames captured ✓");
  await browser.close();

  // Stitch with ffmpeg
  const outputFile = path.join(absOutput, "reel.mp4");
  console.log("🎞️  Encoding MP4...");

  try {
    execSync(
      `ffmpeg -y -framerate ${FPS} -i "${framesDir}/frame-%05d.png" -c:v libx264 -pix_fmt yuv420p -preset slow -crf 18 -vf "scale=${WIDTH}:${HEIGHT}" "${outputFile}"`,
      { stdio: "pipe" }
    );
    console.log(`\n✅ Reel saved: ${outputFile}`);
    console.log(`   Duration: ${DURATION}s | Resolution: ${WIDTH}x${HEIGHT} | FPS: ${FPS}`);
  } catch (err) {
    console.error("❌ ffmpeg error:", err.stderr?.toString() || err.message);
    console.log("\nFrames saved in:", framesDir);
    console.log("Run manually: ffmpeg -framerate 30 -i frames/frame-%05d.png -c:v libx264 -pix_fmt yuv420p -crf 18 reel.mp4");
  }
}

main().catch(console.error);
