// Generates Dexter mascot sprite SVGs from 16×16 pixel maps.
// Run: node scripts/generate-dexter-assets.mjs
// Output: public/dexter/{default,thinking,alert,offline}.svg + index.html preview
//
// Spec (claude-design): 16×16 grid · 4 shades emerald + void + amber (alert only) ·
// phosphor #5F9068 · shape-rendering crispEdges · framewise animation at 2fps.

import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "..", "public", "dexter");
mkdirSync(OUT, { recursive: true });

// Palette — 4 emerald shades + void + amber.
const PALETTE = {
  L: "#9BC6A3", // highlight (light mint)
  F: "#5F9068", // phosphor (primary body)
  M: "#3D6B47", // mid shadow
  D: "#1F3A2E", // deep shadow / tentacles
  O: "#0A0F0D", // void (eyes, mouth)
  A: "#F0C000", // amber (alert only)
};

// 16×16 pixel maps. `.` = transparent.
// Anatomy: rounded blob head with highlight (L) at top, phosphor (F) mid,
// shadow (M/D) bottom, 6 visible tentacles fringing the base.
const POSES = {
  default: [
    "................",
    "................",
    ".....LLLLLL.....",
    "....LFFFFFFL....",
    "...LFFFFFFFFL...",
    "..LFFOOFFOOFFL..",
    "..LFFFFFFFFFFL..",
    "..LFFFFOOFFFFL..",
    "..LFFFFOOFFFFL..",
    "..MFFFFFFFFFFM..",
    "...MMFFFFFFMM...",
    "....MMMMMMMM....",
    "...D.D.D.D.D.D..",
    "...D...D.D...D..",
    "................",
    "................",
  ],
  thinking: [
    "................",
    "............D...",
    "...........D....",
    "....LFFFFFFL....",
    "...LFFFFFFFFL...",
    "..LFFDDFFDDFFL..",
    "..LFFFFFFFFFFL..",
    "..LFFFFFFFFFFL..",
    "..LFFFFFFFFFFL..",
    "..MFFFFFFFFFFM..",
    "...MMFFFFFFMM...",
    "....MMMMMMMM....",
    "...D.D.D.D.D.D..",
    "...D...D.D...D..",
    "................",
    "................",
  ],
  alert: [
    "................",
    "..............A.",
    ".....LLLLLL...A.",
    "....LFFFFFFL..A.",
    "...LFFFFFFFFL...",
    "..LFFOOFFOOFFL..",
    "..LFFFFFFFFFFLA.",
    "..LFFFFOOFFFFL..",
    "..LFFFFOOFFFFL..",
    "..MFFFFFFFFFFM..",
    "...MMFFFFFFMM...",
    "....MMMMMMMM....",
    "...D.D.D.D.D.D..",
    "...D...D.D...D..",
    "................",
    "................",
  ],
  offline: [
    "................",
    "................",
    ".....MMMMMM.....",
    "....MFFFFFFM....",
    "...MFFFFFFFFM...",
    "..MFFDDFFDDFFM..",
    "..MFFFFFFFFFFM..",
    "..MFFFFFFFFFFM..",
    "..MFFFFFFFFFFM..",
    "..DFFFFFFFFFFD..",
    "...DDFFFFFFDD...",
    "....DDDDDDDD....",
    "...D.D.D.D.D.D..",
    "...D...D.D...D..",
    "................",
    "................",
  ],
};

function buildSvg(grid) {
  const rects = [];
  for (let y = 0; y < 16; y++) {
    const row = grid[y];
    if (row.length !== 16) {
      throw new Error(`Row ${y} length ${row.length} (expected 16): "${row}"`);
    }
    for (let x = 0; x < 16; x++) {
      const ch = row[x];
      if (ch === ".") continue;
      const fill = PALETTE[ch];
      if (!fill) throw new Error(`Unknown char "${ch}" at row ${y} col ${x}`);
      rects.push(`<rect x="${x}" y="${y}" width="1" height="1" fill="${fill}"/>`);
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges">${rects.join("")}</svg>`;
}

const generated = [];
for (const [pose, grid] of Object.entries(POSES)) {
  const svgStr = buildSvg(grid);
  const file = resolve(OUT, `${pose}.svg`);
  writeFileSync(file, svgStr, "utf8");
  generated.push(file);
}

// Terminal-style preview sheet (mirrors the claude-design reference board).
const preview = `<!doctype html><html><head><meta charset="utf-8"><title>Dexter sprite</title>
<style>
body{font-family:ui-monospace,Menlo,monospace;background:#0B0E0C;color:#5F9068;padding:32px;margin:0}
h1{font-weight:600;letter-spacing:-0.02em;color:#9BC6A3;margin:0 0 8px}
.meta{color:#3D6B47;font-size:12px;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:24px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:16px}
.card{background:#111614;border:1px solid #1F3A2E;border-radius:8px;padding:24px;display:flex;flex-direction:column;align-items:center;gap:12px}
.card img{image-rendering:pixelated;width:128px;height:128px}
.card code{font-size:11px;color:#3D6B47}
</style></head><body>
<h1>Dexter — 4 poses</h1>
<div class="meta">16×16 · 4 shades · phosphor green #5F9068 · render: crisp-edges</div>
<div class="grid">
${Object.keys(POSES)
  .map(
    (p) =>
      `<div class="card"><img src="${p}.svg" alt="${p}"><code>${p}.svg</code></div>`,
  )
  .join("")}
</div>
</body></html>`;
const previewPath = resolve(OUT, "index.html");
writeFileSync(previewPath, preview, "utf8");
generated.push(previewPath);

console.log(generated.map((f) => f.replace(/\\/g, "/")).join("\n"));
