// Regenerates favicon chain (PNG + ICO + SVG) from the Dexter default pose.
// Usage: node scripts/generate-favicon.mjs
// Pure-JS PNG encoder via node:zlib — no native dep.

import { mkdirSync, writeFileSync, copyFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pub = resolve(__dirname, "..", "public");

mkdirSync(pub, { recursive: true });

// ── Dexter default pose — must stay in sync with generate-mascot.mjs ──
const DEFAULT_POSE = [
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
];

const COLORS = {
  o: [0x0b, 0x0e, 0x0c, 0xff],
  d: [0x06, 0x4e, 0x3b, 0xff],
  g: [0x04, 0x78, 0x57, 0xff],
  b: [0x10, 0xb9, 0x81, 0xff],
  h: [0x6e, 0xe7, 0xb7, 0xff],
  a: [0xf0, 0xc0, 0x00, 0xff],
};

// Maskable background — emerald-700, matches --primary dark
const EMERALD_BG = [0x04, 0x78, 0x57, 0xff];

// ── PNG encoder ────────────────────────────────────────────────────────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function u32(n) {
  const b = Buffer.alloc(4);
  b.writeUInt32BE(n >>> 0, 0);
  return b;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const crc = crc32(Buffer.concat([typeBuf, data]));
  return Buffer.concat([u32(data.length), typeBuf, data, u32(crc)]);
}

function encodePNG(width, height, rgba) {
  // Add filter byte 0 (None) per scanline, then deflate
  const stride = width * 4;
  const filtered = Buffer.alloc(height * (1 + stride));
  for (let y = 0; y < height; y++) {
    filtered[y * (1 + stride)] = 0;
    rgba.copy
      ? rgba.copy(filtered, y * (1 + stride) + 1, y * stride, y * stride + stride)
      : filtered.set(rgba.subarray(y * stride, y * stride + stride), y * (1 + stride) + 1);
  }
  const idat = deflateSync(filtered, { level: 9 });

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // color type: RGBA
  ihdr[10] = 0;  // compression: deflate
  ihdr[11] = 0;  // filter: adaptive
  ihdr[12] = 0;  // interlace: none

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ── Pixel renderer ─────────────────────────────────────────────────────
function renderMascot(grid, size, { bg = null, paddingPct = 0 } = {}) {
  const rgba = Buffer.alloc(size * size * 4);
  if (bg) {
    for (let i = 0; i < size * size; i++) {
      rgba[i * 4 + 0] = bg[0];
      rgba[i * 4 + 1] = bg[1];
      rgba[i * 4 + 2] = bg[2];
      rgba[i * 4 + 3] = bg[3];
    }
  }
  const inner = Math.floor(size * (1 - paddingPct * 2));
  const scale = Math.max(1, Math.floor(inner / 16));
  const renderSize = scale * 16;
  const offset = Math.floor((size - renderSize) / 2);

  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const c = grid[y][x];
      if (c === ".") continue;
      const color = COLORS[c];
      if (!color) continue;
      for (let dy = 0; dy < scale; dy++) {
        for (let dx = 0; dx < scale; dx++) {
          const px = offset + x * scale + dx;
          const py = offset + y * scale + dy;
          if (px < 0 || px >= size || py < 0 || py >= size) continue;
          const i = (py * size + px) * 4;
          rgba[i + 0] = color[0];
          rgba[i + 1] = color[1];
          rgba[i + 2] = color[2];
          rgba[i + 3] = color[3];
        }
      }
    }
  }
  return rgba;
}

// ── ICO wrapping a 32×32 PNG (Vista+ supports embedded PNG) ────────────
function encodeICO(png32) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);   // reserved
  header.writeUInt16LE(1, 2);   // type: 1 = ICO
  header.writeUInt16LE(1, 4);   // count

  const entry = Buffer.alloc(16);
  entry[0] = 32;                  // width (0 would mean 256)
  entry[1] = 32;                  // height
  entry[2] = 0;                   // palette count (0 = truecolor)
  entry[3] = 0;                   // reserved
  entry.writeUInt16LE(1, 4);      // color planes
  entry.writeUInt16LE(32, 6);     // bpp (RGBA)
  entry.writeUInt32LE(png32.length, 8);
  entry.writeUInt32LE(22, 12);    // byte offset (6 header + 16 entry)

  return Buffer.concat([header, entry, png32]);
}

// ── Generate ───────────────────────────────────────────────────────────
function write(name, buf) {
  writeFileSync(resolve(pub, name), buf);
  console.log(`  ${name.padEnd(24)} ${buf.length} bytes`);
}

for (const s of [16, 32, 192, 512]) {
  const rgba = renderMascot(DEFAULT_POSE, s);
  write(`favicon-${s}.png`, encodePNG(s, s, rgba));
}

write(
  "apple-touch-icon.png",
  encodePNG(180, 180, renderMascot(DEFAULT_POSE, 180)),
);

write(
  "icon-mask.png",
  encodePNG(
    512,
    512,
    renderMascot(DEFAULT_POSE, 512, { bg: EMERALD_BG, paddingPct: 0.1 }),
  ),
);

{
  const png32 = encodePNG(32, 32, renderMascot(DEFAULT_POSE, 32));
  write("favicon.ico", encodeICO(png32));
}

// Mirror Dexter default pose into root favicon.svg for browsers that
// prefer SVG favicons. If public/dexter/default.svg doesn't exist yet,
// this is a no-op with a warning.
try {
  copyFileSync(
    resolve(pub, "dexter", "default.svg"),
    resolve(pub, "favicon.svg"),
  );
  console.log("  favicon.svg              (mirror of dexter/default.svg)");
} catch (err) {
  console.warn("  favicon.svg              SKIP —", err.message);
}

console.log("done");
