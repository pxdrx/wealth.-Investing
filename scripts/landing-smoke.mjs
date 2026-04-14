import assert from "node:assert";

const MUST_HAVE = [
  "trader profissional",
  "Journal",
  "IA Coach",
  "Macroeconomia",
  "Dexter",
  "Backtest",
  "Risk",
  "Mentor",
  "+430 traders",
  "Começar grátis",
];

const MUST_NOT_HAVE = [
  "trader sério",
  "+1.200 traders",
];

const res = await fetch("http://localhost:3000/");
assert.strictEqual(res.status, 200, `expected 200, got ${res.status}`);
const body = await res.text();

const missing = MUST_HAVE.filter((s) => !body.includes(s));
const leaked = MUST_NOT_HAVE.filter((s) => body.includes(s));

if (missing.length || leaked.length) {
  console.error("Landing smoke FAILED");
  if (missing.length) console.error("  missing:", missing);
  if (leaked.length) console.error("  leaked old copy:", leaked);
  process.exit(1);
}
console.log("Landing smoke OK — all 10 terms present, no legacy copy leaked.");
