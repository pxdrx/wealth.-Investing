// Regenerates public/dexter/*.svg from pixel grids below.
// Usage: node scripts/generate-dexter.mjs
// Track A owns this script. Re-run after editing grids; do not hand-edit SVGs.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const outDir = resolve(__dirname, "..", "public", "dexter");

mkdirSync(outDir, { recursive: true });

// Palette: 4 emerald greens + void + amber (alert only).
const COLORS = {
  o: "#0B0E0C", // void — outline, eyes, mouth
  d: "#064E3B", // emerald-900 — shadow ring
  g: "#047857", // emerald-700 — body ring
  b: "#10B981", // emerald-500 — body fill
  h: "#6EE7B7", // emerald-300 — highlight
  a: "#F0C000", // amber — alert only
};

const POSES = {
  default: [
    "................",
    "................",
    ".....oooooo.....",
    "...ooddddddoo...",
    "..oddggggggddo..",
    "..odgbbbbbbgdo..",
    "..odgbhhhhbgdo..",
    "..odgbobbobgdo..",
    "..odgbbbbbbgdo..",
    "..odgbboobbgdo..",
    "..odgbbbbbbgdo..",
    "..oddggggggddo..",
    "...ooddddddoo...",
    ".....oooooo.....",
    "................",
    "................",
  ],
  thinking: [
    ".............h..",
    "................",
    ".....oooooo.....",
    "...ooddddddoo...",
    "..oddggggggddo..",
    "..odgbbbbbbgdo..",
    "..odgbhhhhbgdo..",
    "..odgbbobbogdo..",
    "..odgbbbbbbgdo..",
    "..odgbbbbbbgdo..",
    "..odgbbbbbbgdo..",
    "..oddggggggddo..",
    "...ooddddddoo...",
    ".....oooooo.....",
    "................",
    "................",
  ],
  alert: [
    "................",
    "................",
    ".....oooooo.....",
    "...ooddddddoo...",
    "..oddggggggddo..",
    "..odgbbbbbbgdo..",
    "..odgbhhhhbgdo..",
    "..odgbabbabgdo..",
    "..odgbbbbbbgdo..",
    "..odgboooobgdo..",
    "..odgbbbbbbgdo..",
    "..oddggggggddo..",
    "...ooddddddoo...",
    ".....oooooo.....",
    "................",
    "................",
  ],
  celebrating: [
    "................",
    "....g......g....",
    ".....oooooo.....",
    "...ooddddddoo...",
    "..oddggggggddo..",
    "..odgbbbbbbgdo..",
    "..odgbhhhhbgdo..",
    "..odgbhbbhbgdo..",
    "..odgbbbbbbgdo..",
    "..odgboooobgdo..",
    "..odgbbbbbbgdo..",
    "..oddggggggddo..",
    "...ooddddddoo...",
    ".....oooooo.....",
    "................",
    "................",
  ],
  sleeping: [
    ".........hhh....",
    "..........h.....",
    ".........hhh....",
    "................",
    ".....oooooo.....",
    "...ooddddddoo...",
    "..oddggggggddo..",
    "..odgbbbbbbgdo..",
    "..odgbhhhhbgdo..",
    "..odgoobboogdo..",
    "..odgbbbbbbgdo..",
    "..odgbbbbbbgdo..",
    "..odgbbbbbbgdo..",
    "..oddggggggddo..",
    "...ooddddddoo...",
    ".....oooooo.....",
  ],
  analyzing: [
    "................",
    "................",
    ".....oooooo.....",
    "...ooddddddoo...",
    "..oddggggggddo..",
    "..odgbbbbbbgdo..",
    "..odgohhhhogdo..",
    "..odgbobbobgdo..",
    "..odgbbbbbbgdo..",
    "..odgbbbbbbgdo..",
    "..odgbbbbbbgdo..",
    "..oddggggggddo..",
    "...ooddddddoo...",
    ".....oooooo.....",
    "................",
    "................",
  ],
  offline: [
    "................",
    "................",
    ".....oooooo.....",
    "...ooddddddoo...",
    "..oddggggggddo..",
    "..odgddddddgdo..",
    "..odgddddddgdo..",
    "..odgdoddodgdo..",
    "..odgddddddgdo..",
    "..odgddooddgdo..",
    "..odgddddddgdo..",
    "..oddggggggddo..",
    "...ooddddddoo...",
    ".....oooooo.....",
    "................",
    "................",
  ],
};

function gridToSVG(grid) {
  const byColor = {};
  grid.forEach((row, y) => {
    let i = 0;
    while (i < 16) {
      const c = row[i];
      if (c === ".") {
        i++;
        continue;
      }
      let j = i;
      while (j < 16 && row[j] === c) j++;
      const color = COLORS[c];
      if (!color) throw new Error(`Unknown char "${c}" at row ${y}`);
      (byColor[color] ??= []).push({ x: i, y, w: j - i });
      i = j;
    }
  });
  const groups = Object.entries(byColor)
    .map(([color, rects]) => {
      const body = rects
        .map((r) => `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="1"/>`)
        .join("");
      return `<g fill="${color}">${body}</g>`;
    })
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16" shape-rendering="crispEdges">${groups}</svg>\n`;
}

let total = 0;
for (const [pose, grid] of Object.entries(POSES)) {
  if (grid.length !== 16) {
    throw new Error(`${pose}: ${grid.length} rows (expected 16)`);
  }
  grid.forEach((row, i) => {
    if (row.length !== 16) {
      throw new Error(`${pose} row ${i}: ${row.length} chars (expected 16)`);
    }
  });
  const svg = gridToSVG(grid);
  const target = resolve(outDir, `${pose}.svg`);
  writeFileSync(target, svg);
  total += svg.length;
  console.log(`  ${pose.padEnd(12)} ${svg.length} bytes`);
}
console.log(`wrote 7 SVGs (${total} bytes) to public/dexter/`);
