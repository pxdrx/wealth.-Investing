// lib/xlsx-adaptive-bridge.ts
//
// Converts the first worksheet of an XLSX buffer into a CSV buffer that
// parseCsvAdaptive can consume. Used as a fallback in the import route when
// parseMt5Xlsx (which only recognizes the MT5 "Posições"/"Transações"
// layout) returns empty — e.g. NinjaTrader PT-BR reports that users
// converted from CSV to XLSX before uploading.
//
// Field separator is `;` because that's the default for PT-BR exports
// (NinjaTrader, Excel locale pt-BR); parseCsvAdaptive's detectDelimiter
// will still auto-detect if the underlying data prefers another.

import * as XLSX from "xlsx";

export interface XlsxToCsvResult {
  csv: Buffer;
  sheetName: string;
}

export function xlsxFirstSheetToCsvBuffer(
  buffer: ArrayBuffer | Buffer
): XlsxToCsvResult {
  const input = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  const wb = XLSX.read(input, { type: "buffer", cellDates: false });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) {
    throw new Error("XLSX: no sheets found");
  }
  const sheet = wb.Sheets[sheetName];
  if (!sheet) {
    throw new Error(`XLSX: sheet '${sheetName}' missing`);
  }
  const csv = XLSX.utils.sheet_to_csv(sheet, {
    FS: ";",
    RS: "\n",
    blankrows: false,
  });
  return { csv: Buffer.from(csv, "utf-8"), sheetName };
}
