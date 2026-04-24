// scripts/debug-ninja-import.mts
// Debug harness for NinjaTrader Bulenox imports. Mirrors the API pipeline:
// CSV → parseCsvAdaptive directly; XLSX → xlsxFirstSheetToCsvBuffer →
// parseCsvAdaptive (same as the import-mt5 route XLSX fallback branch).
//
// Skips parseMt5Xlsx (which depends on path-aliased trading helpers); for
// NinjaTrader files the rigid MT5 parser returns 0 anyway and the route
// drops straight into the adaptive bridge — the only branch we need to test.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { parseCsvAdaptive } from "../lib/csv-adaptive-parser";
import { xlsxFirstSheetToCsvBuffer } from "../lib/xlsx-adaptive-bridge";

const ROOT = resolve(process.cwd());

interface Mapping { header: string; column: number; confidence: string }
interface Result {
  separator: string;
  encoding: string;
  headers: string[];
  broker_hint: string;
  rows_total: number;
  rows_skipped_open_position: number;
  rows_skipped_invalid: number;
  trades: unknown[];
  mapping: Record<string, Mapping>;
  warnings: string[];
}

function summarize(label: string, result: Result): void {
  console.log(`\n──── ${label} ────`);
  console.log("separator:", JSON.stringify(result.separator));
  console.log("encoding:", result.encoding);
  console.log("headers:", result.headers);
  console.log("broker_hint:", result.broker_hint);
  console.log("rows_total:", result.rows_total);
  console.log("rows_skipped_open_position:", result.rows_skipped_open_position);
  console.log("rows_skipped_invalid:", result.rows_skipped_invalid);
  console.log("trade count:", result.trades.length);
  console.log("mapping:");
  for (const [k, v] of Object.entries(result.mapping)) {
    console.log(`  ${k.padEnd(12)} → "${v.header}" (col ${v.column}, ${v.confidence})`);
  }
  console.log("warnings:");
  for (const w of result.warnings) console.log(`  - ${w}`);
  if (result.trades[0]) {
    console.log("first trade:", JSON.stringify(result.trades[0], null, 2));
  }
}

function runCsv(path: string): void {
  console.log(`\n===== ${path} =====`);
  try {
    const buf = readFileSync(resolve(ROOT, path));
    const r = parseCsvAdaptive(buf) as unknown as Result;
    summarize(`CSV ${path}`, r);
  } catch (e) {
    console.error(`${path} FAILED:`, (e as Error).message);
  }
}

function runXlsx(path: string): void {
  console.log(`\n===== ${path} =====`);
  try {
    const buf = readFileSync(resolve(ROOT, path));
    const { csv, sheetName } = xlsxFirstSheetToCsvBuffer(buf);
    console.log(`[bridge] sheet=${sheetName}, csv bytes=${csv.length}`);
    console.log("[bridge] first 800 chars of CSV:");
    console.log(csv.toString("utf-8").slice(0, 800));
    const r = parseCsvAdaptive(csv) as unknown as Result;
    summarize(`XLSX→CSV ${path}`, r);
  } catch (e) {
    console.error(`${path} FAILED:`, (e as Error).message);
  }
}

runCsv("certo.csv");
runCsv("teste_v3.csv");
runXlsx("NinjaTrader Grid 2026-04-17 06-03.xlsx");
