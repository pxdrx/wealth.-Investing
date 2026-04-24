// Debug script for Bulenox PDF parser.
// Usage: node scripts/debug-pdf-import.mjs [pdfPath]
import fs from "node:fs";
import path from "node:path";
import url from "node:url";

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const arg = process.argv[2];
const pdfPath = arg
  ? path.resolve(arg)
  : path.resolve(__dirname, "..", "Position History.20260423.223812.pdf");

// Run via: npx tsx scripts/debug-pdf-import.mjs [pdfPath]
const { parsePositionHistoryPdf } = await import(
  "../lib/pdf-position-history-parser.ts"
);

const buffer = fs.readFileSync(pdfPath);
const { trades, balanceOps } = await parsePositionHistoryPdf(buffer);

const sumPnl = trades.reduce((acc, t) => acc + t.pnl_usd, 0);

console.log("PDF:", pdfPath);
console.log("Trades parsed:", trades.length);
console.log("Sum P/L USD:", sumPnl.toFixed(2));
console.log("Balance ops:", balanceOps.length);
console.log("\nTrades:");
for (const t of trades) {
  console.log(
    `  ${t.external_id}  ${t.symbol.padEnd(6)} ${t.direction.padEnd(5)} pnl=${t.pnl_usd
      .toFixed(2)
      .padStart(8)} qty=${(t.lots ?? 0).toString().padStart(3)} entry=${t.entry_price ?? "?"} exit=${t.exit_price ?? "?"}`
  );
  console.log(`    opened=${t.opened_at}  closed=${t.closed_at}`);
}
