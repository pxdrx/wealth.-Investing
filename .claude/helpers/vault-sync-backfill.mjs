#!/usr/bin/env node
// One-shot backfill: generates all Sistema/* determinístico nodes from git log + filesystem.
// Usage: node .claude/helpers/vault-sync-backfill.mjs [--dry-run]

import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import {
  VAULT_ROOT, SISTEMA_ROOT, TYPES, ensureDirs, slugify, frontmatter, wl,
  commitType, commitScope, pathToSistemaNode, writeFileIfChanged, walkDir,
  inferTags,
} from "./vault-lib.mjs";

const DRY = process.argv.includes("--dry-run");
const counts = {};

function sh(cmd) {
  return execSync(cmd, { encoding: "utf8", cwd: process.cwd(), maxBuffer: 200 * 1024 * 1024 }).trim();
}

function sanitizeNodeKey(p) {
  return p.replace(/\\/g, "/").replace(/[^a-zA-Z0-9/._-]/g, "_");
}

function write(file, content) {
  counts[path.dirname(path.relative(SISTEMA_ROOT, file)).split("/")[0]] =
    (counts[path.dirname(path.relative(SISTEMA_ROOT, file)).split("/")[0]] || 0) + 1;
  if (DRY) return;
  writeFileIfChanged(file, content);
}

// ---------- Commits ----------
function backfillCommits() {
  const sep = "\u001e";
  const recSep = "\u001f";
  const fmt = ["%H", "%h", "%an", "%ad", "%s"].join(sep);
  const raw = sh(`git log --all --date=iso-strict --pretty=format:"${fmt}${recSep}"`);
  const entries = raw.split(recSep).map(s => s.trim()).filter(Boolean);
  const sessions = new Map(); // dayISO → [{sha7, subject, fname}]
  const hitCounts = new Map(); // filePath → { hits, lastDate, lastSha7, lastSubject }

  for (const entry of entries) {
    const [sha, sha7, author, date, subject] = entry.split(sep);
    if (!sha) continue;
    let files = [];
    try {
      files = sh(`git show --name-only --pretty=format: ${sha}`).split("\n").filter(Boolean);
    } catch { files = []; }
    let ins = 0, del = 0;
    try {
      const stat = sh(`git show --shortstat --pretty=format: ${sha}`);
      ins = +(stat.match(/(\d+) insertion/)?.[1] || 0);
      del = +(stat.match(/(\d+) deletion/)?.[1] || 0);
    } catch {}

    const type = commitType(subject);
    const scope = commitScope(subject);
    const dayISO = (date || "").slice(0, 10);
    const slug = slugify(subject.replace(/^[a-z]+(\([^)]+\))?!?:\s*/i, ""));
    const fname = `${sha7}-${slug}.md`;
    const file = path.join(SISTEMA_ROOT, "Commits", fname);
    const tags = inferTags(subject, files);

    const fileLinks = files.slice(0, 50).map(f => {
      const node = pathToSistemaNode(f);
      if (node) return `- ${wl(`Sistema/${node.type}/${sanitizeNodeKey(node.key)}`, f)}`;
      return `- \`${f}\` ${wl(`Sistema/Arquivos/${sanitizeNodeKey(f)}`, "hub")}`;
    }).join("\n");

    const body = `${frontmatter({
      type: "commit",
      sha, sha7, date, author,
      commit_type: type,
      scope: scope || "",
      files_changed: files.length,
      insertions: ins, deletions: del,
      tags,
    })}
# ${subject}

> Commit por **${author}** em ${date}
> ${files.length} arquivo(s) — +${ins} / −${del}

## Sessão

${wl(`Sistema/Sessões/${dayISO}`)}

## Arquivos tocados

${fileLinks || "_sem arquivos_"}
`;

    write(file, body);

    if (!sessions.has(dayISO)) sessions.set(dayISO, []);
    sessions.get(dayISO).push({ sha7, subject, fname });

    for (const f of files) {
      const cur = hitCounts.get(f) || { hits: 0 };
      cur.hits++;
      cur.lastDate = date;
      cur.lastSha7 = sha7;
      cur.lastSubject = subject;
      hitCounts.set(f, cur);
    }

    if (type === "fix") {
      const bugFile = path.join(SISTEMA_ROOT, "Bugs", `${sha7}-${slug}.md`);
      const bugBody = `${frontmatter({
        type: "bug",
        sha7, date, author,
        scope: scope || "",
        tags: ["bug", "fix", ...(scope ? [scope] : [])],
      })}
# 🐛 ${subject}

> Fix em ${date} por **${author}**

## Commit

${wl(`Sistema/Commits/${sha7}-${slug}`)}

## Arquivos

${fileLinks || "_sem arquivos_"}

## Root cause

_Preencher com \`/vault-enrich\` — Claude vai analisar o diff._
`;
      write(bugFile, bugBody);
    }
  }

  // Sessions
  for (const [dayISO, commits] of sessions.entries()) {
    if (!dayISO) continue;
    const file = path.join(SISTEMA_ROOT, "Sessões", `${dayISO}.md`);
    const list = commits.map(c =>
      `- ${wl(`Sistema/Commits/${c.fname.replace(/\.md$/, "")}`, `${c.sha7} ${c.subject}`)}`
    ).join("\n");
    const body = `${frontmatter({
      type: "sessão",
      date: dayISO,
      commits: commits.length,
      tags: ["sessão", "dia"],
    })}
# 🫀 Sessão ${dayISO}

> ${commits.length} commit(s) neste dia.

## Commits

${list}
`;
    write(file, body);
  }

  // Arquivos
  for (const [f, info] of hitCounts.entries()) {
    const key = sanitizeNodeKey(f);
    const file = path.join(SISTEMA_ROOT, "Arquivos", `${key}.md`);
    const isHub = info.hits >= 5;
    const lastSlug = slugify(info.lastSubject.replace(/^[a-z]+(\([^)]+\))?!?:\s*/i, ""));
    const body = `${frontmatter({
      type: "arquivo",
      path: f,
      hits: info.hits,
      hub: isHub,
      last_seen: info.lastDate,
      tags: isHub ? ["arquivo", "hub"] : ["arquivo"],
    })}
# \`${f}\`

> ${info.hits} commit(s) tocaram este arquivo. ${isHub ? "🧠 **Hub** (5+ commits)." : ""}

## Último commit

${wl(`Sistema/Commits/${info.lastSha7}-${lastSlug}`)}
`;
    write(file, body);
  }

  console.log(`[backfill] commits: ${entries.length}, sessões: ${sessions.size}, arquivos: ${hitCounts.size}`);
}

// ---------- Rotas ----------
function backfillRotas() {
  const root = path.join(process.cwd(), "app");
  if (!existsSync(root)) return;
  const pages = walkDir(root, p => /page\.(tsx|jsx|ts|js)$/.test(p));
  for (const p of pages) {
    const rel = path.relative(process.cwd(), p).replace(/\\/g, "/");
    const route = "/" + rel.replace(/^app\//, "").replace(/\/page\.(tsx|jsx|ts|js)$/, "").replace(/^$/, "");
    const key = sanitizeNodeKey(rel);
    const file = path.join(SISTEMA_ROOT, "Rotas", `${key}.md`);
    const body = `${frontmatter({
      type: "rota",
      route: route || "/",
      file: rel,
      tags: ["rota", "page"],
    })}
# 🛣️ \`${route || "/"}\`

> Página Next.js App Router.

## Arquivo

\`${rel}\`

## Hub de arquivo

${wl(`Sistema/Arquivos/${key}`)}
`;
    write(file, body);
  }
}

// ---------- Endpoints ----------
function backfillEndpoints() {
  const root = path.join(process.cwd(), "app", "api");
  if (!existsSync(root)) return;
  const routes = walkDir(root, p => /route\.(ts|js)$/.test(p));
  for (const p of routes) {
    const rel = path.relative(process.cwd(), p).replace(/\\/g, "/");
    const endpoint = "/" + rel.replace(/\/route\.(ts|js)$/, "");
    const key = sanitizeNodeKey(rel);
    const file = path.join(SISTEMA_ROOT, "Endpoints", `${key}.md`);
    const src = readFileSync(p, "utf8");
    const methods = Array.from(src.matchAll(/export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)/g)).map(m => m[1]);
    const body = `${frontmatter({
      type: "endpoint",
      endpoint,
      file: rel,
      methods,
      tags: ["endpoint", "api"],
    })}
# ⚡ \`${endpoint}\`

> API route Next.js. Métodos: ${methods.length ? methods.join(", ") : "_não detectado_"}

## Arquivo

\`${rel}\`

## Hub de arquivo

${wl(`Sistema/Arquivos/${key}`)}
`;
    write(file, body);
  }
}

// ---------- Tabelas ----------
function backfillTabelas() {
  const tables = [
    { name: "profiles", desc: "{ user_id, display_name }" },
    { name: "accounts", desc: "{ id, user_id, name, kind, is_active } — kind: prop/personal/crypto" },
    { name: "prop_accounts", desc: "{ account_id, firm_name, phase, starting_balance_usd, ... }" },
    { name: "journal_trades", desc: "{ id, account_id, user_id, symbol, direction, pnl_usd, net_pnl_usd, ... }" },
    { name: "tv_alerts", desc: "{ user_id, symbol, alert_type, timeframe, message, payload, created_at }" },
    { name: "prop_payouts", desc: "{ account_id, amount_usd, paid_at }" },
    { name: "wallet_transactions", desc: "{ amount_usd, tx_type, notes }" },
    { name: "ingestion_logs", desc: "import tracking with timing and counts" },
  ];
  for (const t of tables) {
    const file = path.join(SISTEMA_ROOT, "Tabelas", `${t.name}.md`);
    const body = `${frontmatter({
      type: "tabela",
      name: t.name,
      tags: ["tabela", "supabase"],
    })}
# 🗄️ \`${t.name}\`

> Tabela Supabase.

## Schema

${t.desc}

## Referências

- ${wl("Técnico/Supabase Schema")}
`;
    write(file, body);
  }
}

// ---------- Agentes ----------
function backfillAgentes() {
  const found = [];
  const skillsRoot = path.join(process.cwd(), ".claude", "skills");
  const agentsRoot = path.join(process.cwd(), ".claude", "agents");
  if (existsSync(skillsRoot)) {
    const skills = walkDir(skillsRoot, p => /SKILL\.md$/.test(p));
    for (const p of skills) {
      const name = path.basename(path.dirname(p));
      found.push({ name, kind: "skill", file: path.relative(process.cwd(), p).replace(/\\/g, "/") });
    }
  }
  if (existsSync(agentsRoot)) {
    const agents = walkDir(agentsRoot, p => /\.md$/.test(p));
    for (const p of agents) {
      const name = path.basename(p, ".md");
      found.push({ name, kind: "agent", file: path.relative(process.cwd(), p).replace(/\\/g, "/") });
    }
  }
  for (const a of found) {
    const file = path.join(SISTEMA_ROOT, "Agentes", `${slugify(a.name)}.md`);
    const body = `${frontmatter({
      type: "agente",
      name: a.name,
      kind: a.kind,
      file: a.file,
      tags: ["agente", a.kind],
    })}
# 🤖 ${a.name}

> ${a.kind === "skill" ? "Skill customizada" : "Subagent"} — \`${a.file}\`
`;
    write(file, body);
  }
}

// ---------- Dependências ----------
function backfillDeps() {
  const pkgPath = path.join(process.cwd(), "package.json");
  if (!existsSync(pkgPath)) return;
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  const all = { ...pkg.dependencies, ...pkg.devDependencies };
  const important = Object.keys(all).filter(n =>
    !n.startsWith("@types/") && !n.startsWith("eslint") && !n.includes("prettier")
  );
  for (const name of important) {
    const file = path.join(SISTEMA_ROOT, "Dependências", `${slugify(name)}.md`);
    const body = `${frontmatter({
      type: "dependência",
      name,
      version: all[name],
      dev: !!pkg.devDependencies?.[name],
      tags: ["dependência", pkg.devDependencies?.[name] ? "dev" : "prod"],
    })}
# 📦 \`${name}\`

> Versão: \`${all[name]}\`
`;
    write(file, body);
  }
}

// ---------- Deploys (from vercel.json crons as seed) ----------
function backfillCronsAsEndpoints() {
  // Already covered by backfillEndpoints, but mark vercel.json info into those notes.
  const vercelPath = path.join(process.cwd(), "vercel.json");
  if (!existsSync(vercelPath)) return;
  const vc = JSON.parse(readFileSync(vercelPath, "utf8"));
  const crons = vc.crons || [];
  for (const c of crons) {
    const key = sanitizeNodeKey(`app${c.path}/route.ts`);
    const file = path.join(SISTEMA_ROOT, "Endpoints", `${key}.md`);
    if (!existsSync(file) && !DRY) continue;
    // non-destructive: just leave a companion note
    const cronFile = path.join(SISTEMA_ROOT, "Endpoints", `${slugify(c.path)}-cron.md`);
    const body = `${frontmatter({
      type: "cron",
      path: c.path,
      schedule: c.schedule,
      tags: ["cron", "vercel", "endpoint"],
    })}
# ⏰ Cron \`${c.path}\`

> Schedule: \`${c.schedule}\`

## Endpoint

${wl(`Sistema/Endpoints/${key}`)}
`;
    write(cronFile, body);
  }
}

function main() {
  ensureDirs();
  console.log(`[backfill] ${DRY ? "DRY-RUN " : ""}starting...`);
  backfillCommits();
  backfillRotas();
  backfillEndpoints();
  backfillTabelas();
  backfillAgentes();
  backfillDeps();
  backfillCronsAsEndpoints();
  console.log("[backfill] counts:", counts);
  console.log(`[backfill] done${DRY ? " (dry-run, no files written)" : ""}.`);
}

main();
