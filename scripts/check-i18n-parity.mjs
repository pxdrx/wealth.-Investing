#!/usr/bin/env node
/**
 * i18n parity validator — B-14.
 *
 * Fails (exit 1) if any key exists in one locale but not another, or if a value
 * is empty/missing. Run via `npm run i18n:check` before merging landing copy changes.
 */
import fs from "node:fs";
import path from "node:path";
import url from "node:url";

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), "..");
const LOCALES = ["pt", "en"];

function readLocale(code) {
  const p = path.join(ROOT, "messages", `${code}.json`);
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function flatten(obj, prefix = "") {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      Object.assign(out, flatten(v, key));
    } else {
      out[key] = v;
    }
  }
  return out;
}

const bundles = Object.fromEntries(LOCALES.map((l) => [l, flatten(readLocale(l))]));
const [base, ...others] = LOCALES;
const baseKeys = new Set(Object.keys(bundles[base]));

const errors = [];

for (const other of others) {
  const otherKeys = new Set(Object.keys(bundles[other]));

  for (const k of baseKeys) {
    if (!otherKeys.has(k)) errors.push(`missing in ${other}: ${k}`);
  }
  for (const k of otherKeys) {
    if (!baseKeys.has(k)) errors.push(`missing in ${base}: ${k}`);
  }
}

for (const l of LOCALES) {
  for (const [k, v] of Object.entries(bundles[l])) {
    if (typeof v !== "string" || v.trim().length === 0) {
      errors.push(`empty/invalid in ${l}: ${k}`);
    }
  }
}

if (errors.length) {
  console.error(`i18n parity FAILED (${errors.length} issue${errors.length === 1 ? "" : "s"}):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

const total = Object.keys(bundles[base]).length;
console.log(`i18n parity OK — ${total} keys × ${LOCALES.length} locales (${LOCALES.join(", ")})`);
