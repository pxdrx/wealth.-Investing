#!/usr/bin/env node
// Post-commit sync: writes one Sistema/Commits/ note + appends Sessão + bumps Arquivos hit counts.
// Called from .git/hooks/post-commit. Zero-token, pure determinístico.

import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import {
  VAULT_ROOT, SISTEMA_ROOT, ensureDirs, slugify, frontmatter, wl,
  commitType, commitScope, pathToSistemaNode, writeFileIfChanged, appendLine,
  inferTags, dateISO,
} from "./vault-lib.mjs";

function sh(cmd) {
  return execSync(cmd, { encoding: "utf8", cwd: process.cwd() }).trim();
}

function getCommit(ref = "HEAD") {
  const sep = "\u001e";
  const fmt = ["%H", "%h", "%an", "%ae", "%ad", "%s", "%b"].join(sep);
  const raw = sh(`git log -1 --date=iso-strict --pretty=format:"${fmt}" ${ref}`);
  const [sha, sha7, author, email, date, subject, body] = raw.split(sep);
  const files = sh(`git show --name-only --pretty=format: ${ref}`).split("\n").filter(Boolean);
  const stat = sh(`git show --shortstat --pretty=format: ${ref}`);
  const ins = (stat.match(/(\d+) insertion/) || [0, 0])[1];
  const del = (stat.match(/(\d+) deletion/) || [0, 0])[1];
  return { sha, sha7, author, email, date, subject, body, files, insertions: +ins, deletions: +del };
}

function writeCommitNote(c) {
  const type = commitType(c.subject);
  const scope = commitScope(c.subject);
  const dayISO = c.date.slice(0, 10);
  const slug = slugify(c.subject.replace(/^[a-z]+(\([^)]+\))?!?:\s*/i, ""));
  const fname = `${c.sha7}-${slug}.md`;
  const file = path.join(SISTEMA_ROOT, "Commits", fname);
  const tags = inferTags(c.subject, c.files);

  const fileLinks = c.files.slice(0, 50).map(f => {
    const node = pathToSistemaNode(f);
    if (node) return `- ${wl(`Sistema/${node.type}/${sanitizeNodeKey(node.key)}`, f)}`;
    return `- \`${f}\` ${wl(`Sistema/Arquivos/${sanitizeNodeKey(f)}`, "hub")}`;
  }).join("\n");

  const body = `${frontmatter({
    type: "commit",
    sha: c.sha,
    sha7: c.sha7,
    date: c.date,
    author: c.author,
    commit_type: type,
    scope: scope || "",
    files_changed: c.files.length,
    insertions: c.insertions,
    deletions: c.deletions,
    tags,
  })}
# ${c.subject}

> Commit por **${c.author}** em ${c.date}
> ${c.files.length} arquivo(s) — +${c.insertions} / −${c.deletions}

## Sessão

${wl(`Sistema/Sessões/${dayISO}`)}

## Arquivos tocados

${fileLinks || "_sem arquivos_"}

${c.body?.trim() ? `## Mensagem\n\n${c.body.trim()}\n` : ""}`;

  writeFileIfChanged(file, body);
  return { file, type, dayISO, slug, fname };
}

function sanitizeNodeKey(p) {
  return p.replace(/\\/g, "/").replace(/[^a-zA-Z0-9/._-]/g, "_");
}

function appendSessão(c, commitNote) {
  const dayISO = c.date.slice(0, 10);
  const file = path.join(SISTEMA_ROOT, "Sessões", `${dayISO}.md`);
  if (!existsSync(file)) {
    const header = `${frontmatter({
      type: "sessão",
      date: dayISO,
      tags: ["sessão", "dia"],
    })}
# 🫀 Sessão ${dayISO}

> Batimento cardíaco do cérebro do projeto neste dia.

## Commits

`;
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, header);
  }
  const line = `- ${wl(`Sistema/Commits/${commitNote.fname.replace(/\.md$/, "")}`, `${c.sha7} ${c.subject}`)}`;
  appendLine(file, line);
}

function bumpArquivos(c) {
  for (const f of c.files) {
    const key = sanitizeNodeKey(f);
    const file = path.join(SISTEMA_ROOT, "Arquivos", `${key}.md`);
    let hits = 1;
    let existing = "";
    if (existsSync(file)) {
      existing = readFileSync(file, "utf8");
      const m = existing.match(/^hits:\s*(\d+)/m);
      if (m) hits = parseInt(m[1], 10) + 1;
    }
    const isHub = hits >= 5;
    const body = `${frontmatter({
      type: "arquivo",
      path: f,
      hits,
      hub: isHub,
      last_seen: c.date,
      tags: isHub ? ["arquivo", "hub"] : ["arquivo"],
    })}
# \`${f}\`

> ${hits} commit(s) tocaram este arquivo. ${isHub ? "🧠 **Hub** (5+ commits)." : ""}

## Último commit

${wl(`Sistema/Commits/${c.sha7}-${slugify(c.subject.replace(/^[a-z]+(\([^)]+\))?!?:\s*/i, ""))}`)}
`;
    writeFileIfChanged(file, body);
  }
}

function main() {
  ensureDirs();
  const ref = process.argv[2] || "HEAD";
  const c = getCommit(ref);
  const note = writeCommitNote(c);
  appendSessão(c, note);
  bumpArquivos(c);
  console.log(`[vault-sync] commit ${c.sha7} → ${path.relative(process.cwd(), note.file)}`);
}

try { main(); } catch (e) {
  console.error("[vault-sync] error:", e.message);
  process.exit(0); // never block commits
}
