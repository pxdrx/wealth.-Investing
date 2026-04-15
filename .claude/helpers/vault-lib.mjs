// Shared utils for vault sync scripts.
// Zero external deps. Node 18+.

import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

export const VAULT_ROOT = path.resolve(process.cwd(), "wealth.Investing");
export const SISTEMA_ROOT = path.join(VAULT_ROOT, "Sistema");

export const TYPES = [
  "Commits", "Deploys", "Sessões", "Rotas", "Endpoints",
  "Tabelas", "Agentes", "Dependências", "Bugs", "Arquivos", "Features",
];

export function ensureDirs() {
  for (const t of TYPES) mkdirSync(path.join(SISTEMA_ROOT, t), { recursive: true });
}

export function slugify(s) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "untitled";
}

export function frontmatter(obj) {
  const lines = ["---"];
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    if (Array.isArray(v)) {
      lines.push(`${k}: [${v.map(x => JSON.stringify(x)).join(", ")}]`);
    } else if (typeof v === "string" && /[:#\n]/.test(v)) {
      lines.push(`${k}: ${JSON.stringify(v)}`);
    } else {
      lines.push(`${k}: ${v}`);
    }
  }
  lines.push("---", "");
  return lines.join("\n");
}

export function wl(target, alias) {
  return alias ? `[[${target}|${alias}]]` : `[[${target}]]`;
}

// Conventional commit type detection.
export function commitType(msg) {
  const m = /^(feat|fix|chore|refactor|docs|test|style|perf|ci|build|revert)(\([^)]+\))?!?:/i.exec(msg || "");
  return m ? m[1].toLowerCase() : "other";
}

export function commitScope(msg) {
  const m = /^[a-z]+\(([^)]+)\)!?:/i.exec(msg || "");
  return m ? m[1] : null;
}

// Map a filesystem path to Sistema node type.
export function pathToSistemaNode(p) {
  const norm = p.replace(/\\/g, "/");
  if (/^app\/api\/.+\/route\.(ts|js)$/.test(norm)) return { type: "Endpoints", key: norm };
  if (/^app\/.+\/page\.tsx$/.test(norm)) return { type: "Rotas", key: norm };
  if (/^\.claude\/skills\/[^/]+\/SKILL\.md$/.test(norm) || /^\.claude\/agents\/[^/]+\.md$/.test(norm)) {
    return { type: "Agentes", key: norm };
  }
  return null;
}

export function writeFileIfChanged(file, content) {
  mkdirSync(path.dirname(file), { recursive: true });
  if (existsSync(file) && readFileSync(file, "utf8") === content) return false;
  writeFileSync(file, content);
  return true;
}

export function appendLine(file, line) {
  mkdirSync(path.dirname(file), { recursive: true });
  const cur = existsSync(file) ? readFileSync(file, "utf8") : "";
  if (cur.includes(line)) return;
  writeFileSync(file, cur + (cur && !cur.endsWith("\n") ? "\n" : "") + line + "\n");
}

export function readJSON(file, fallback) {
  try { return JSON.parse(readFileSync(file, "utf8")); } catch { return fallback; }
}

export function writeJSON(file, obj) {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(obj, null, 2));
}

export function walkDir(root, predicate) {
  const out = [];
  function rec(dir) {
    let entries;
    try { entries = readdirSync(dir); } catch { return; }
    for (const e of entries) {
      if (e === "node_modules" || e === ".next" || e === ".git") continue;
      const p = path.join(dir, e);
      let st;
      try { st = statSync(p); } catch { continue; }
      if (st.isDirectory()) rec(p);
      else if (predicate(p)) out.push(p);
    }
  }
  rec(root);
  return out;
}

export function dateISO(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

export function inferTags(msg, files) {
  const tags = new Set();
  const t = commitType(msg);
  if (t !== "other") tags.add(t);
  const scope = commitScope(msg);
  if (scope) tags.add(scope);
  for (const f of files) {
    const n = f.replace(/\\/g, "/");
    if (n.startsWith("app/api/")) tags.add("api");
    else if (n.startsWith("app/")) tags.add("route");
    else if (n.startsWith("components/landing/")) tags.add("landing");
    else if (n.startsWith("components/")) tags.add("ui");
    else if (n.startsWith("lib/supabase/")) tags.add("supabase");
    else if (n.startsWith("lib/")) tags.add("lib");
    else if (n.startsWith("docs/")) tags.add("docs");
    else if (n.startsWith(".claude/")) tags.add("agents");
  }
  return Array.from(tags);
}
