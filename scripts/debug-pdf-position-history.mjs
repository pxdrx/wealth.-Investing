// scripts/debug-pdf-position-history.mjs
// Validates lib/pdf-position-history-parser.ts against a sample PDF.
// Usage: node scripts/debug-pdf-position-history.mjs [pdfPath]
import fs from "node:fs";
import path from "node:path";
import url from "node:url";
import { register } from "node:module";

// Allow `import "../lib/pdf-position-history-parser.ts"` from a plain .mjs
// script by registering tsx/esm hooks at runtime. Falls back gracefully if
// tsx isn't installed (the script will just throw a clearer message).
try {
  register("tsx/esm", url.pathToFileURL("./"));
} catch {
  /* tsx loader not available — assume the .ts file resolves natively */
}

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const arg = process.argv[2];
const pdfPath = arg
  ? path.resolve(arg)
  : path.resolve(__dirname, "..", "Position History.20260423.223812.pdf");

const { parsePositionHistoryPdf } = await import(
  "../lib/pdf-position-history-parser.ts"
);

const buffer = fs.readFileSync(pdfPath);
const { trades, balanceOps, meta } = await parsePositionHistoryPdf(buffer);

const sumPnl = trades.reduce((acc, t) => acc + t.pnl_usd, 0);

console.log("PDF:", pdfPath);
console.log("Meta:", meta);
console.log("Trades parsed:", trades.length);
console.log("Sum P/L USD:", sumPnl.toFixed(2));
console.log("Balance ops:", balanceOps.length);
console.log("\nTrades:");
for (const t of trades) {
  console.log(
    `  ${t.external_id}  ${t.symbol.padEnd(6)} ${t.direction.padEnd(5)} pnl=${t.pnl_usd
      .toFixed(2)
      .padStart(8)} qty=${String(t.lots).padStart(3)} entry=${t.entry_price} exit=${t.exit_price}`
  );
  console.log(`    opened=${t.opened_at}  closed=${t.closed_at}`);
}

// Validation gates.
const expectedCount = 8;
const expectedSum = 687.25;
let ok = true;
if (trades.length !== expectedCount) {
  console.error(`FAIL: expected ${expectedCount} trades, got ${trades.length}`);
  ok = false;
}
if (Math.abs(sumPnl - expectedSum) > 0.01) {
  console.error(`FAIL: expected sum ${expectedSum}, got ${sumPnl.toFixed(2)}`);
  ok = false;
}
const shortNq = trades.find((t) => t.external_id === "468150500329");
if (!shortNq || shortNq.direction !== "short") {
  console.error(
    `FAIL: NQM6 position 468150500329 should be SHORT, got ${shortNq?.direction}`
  );
  ok = false;
}
if (!ok) process.exit(1);
console.log("\nOK: all validation gates passed");
