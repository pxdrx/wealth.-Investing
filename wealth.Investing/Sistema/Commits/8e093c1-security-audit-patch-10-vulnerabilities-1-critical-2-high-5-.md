---
type: commit
sha: 8e093c1d7836b9e732e629f640138af45b038c95
sha7: 8e093c1
date: "2026-03-21T02:44:16-03:00"
author: Pedro
commit_type: fix
scope: 
files_changed: 483
insertions: 47194
deletions: 180
tags: ["fix", "agents", "api", "route", "ui", "docs", "lib"]
---

# fix: security audit — patch 10 vulnerabilities (1 critical, 2 high, 5 medium, 2 low)

> Commit por **Pedro** em 2026-03-21T02:44:16-03:00
> 483 arquivo(s) — +47194 / −180

## Sessão

[[Sistema/Sessões/2026-03-21]]

## Arquivos tocados

- `.claude/settings.json` [[Sistema/Arquivos/.claude/settings.json|hub]]
- `.claude/settings.local.json` [[Sistema/Arquivos/.claude/settings.local.json|hub]]
- `.claude/worktrees/agent-a170939e` [[Sistema/Arquivos/.claude/worktrees/agent-a170939e|hub]]
- `.claude/worktrees/agent-aaf9c38d` [[Sistema/Arquivos/.claude/worktrees/agent-aaf9c38d|hub]]
- `.claude/worktrees/agent-aeabe862` [[Sistema/Arquivos/.claude/worktrees/agent-aeabe862|hub]]
- `.gitignore` [[Sistema/Arquivos/.gitignore|hub]]
- `.mcp.json` [[Sistema/Arquivos/.mcp.json|hub]]
- `.playwright-mcp/console-2026-03-12T03-05-48-844Z.log` [[Sistema/Arquivos/.playwright-mcp/console-2026-03-12T03-05-48-844Z.log|hub]]
- `.playwright-mcp/console-2026-03-12T03-22-58-247Z.log` [[Sistema/Arquivos/.playwright-mcp/console-2026-03-12T03-22-58-247Z.log|hub]]
- `.playwright-mcp/console-2026-03-12T04-04-55-167Z.log` [[Sistema/Arquivos/.playwright-mcp/console-2026-03-12T04-04-55-167Z.log|hub]]
- `.playwright-mcp/console-2026-03-14T06-19-20-282Z.log` [[Sistema/Arquivos/.playwright-mcp/console-2026-03-14T06-19-20-282Z.log|hub]]
- `.playwright-mcp/console-2026-03-14T06-19-35-465Z.log` [[Sistema/Arquivos/.playwright-mcp/console-2026-03-14T06-19-35-465Z.log|hub]]
- `.playwright-mcp/console-2026-03-14T06-19-38-582Z.log` [[Sistema/Arquivos/.playwright-mcp/console-2026-03-14T06-19-38-582Z.log|hub]]
- `.playwright-mcp/console-2026-03-14T19-06-23-854Z.log` [[Sistema/Arquivos/.playwright-mcp/console-2026-03-14T19-06-23-854Z.log|hub]]
- `.playwright-mcp/console-2026-03-14T19-07-41-414Z.log` [[Sistema/Arquivos/.playwright-mcp/console-2026-03-14T19-07-41-414Z.log|hub]]
- `.playwright-mcp/console-2026-03-14T19-08-33-127Z.log` [[Sistema/Arquivos/.playwright-mcp/console-2026-03-14T19-08-33-127Z.log|hub]]
- `.playwright-mcp/console-2026-03-14T19-09-19-758Z.log` [[Sistema/Arquivos/.playwright-mcp/console-2026-03-14T19-09-19-758Z.log|hub]]
- `.playwright-mcp/console-2026-03-15T19-28-53-636Z.log` [[Sistema/Arquivos/.playwright-mcp/console-2026-03-15T19-28-53-636Z.log|hub]]
- `.playwright-mcp/console-2026-03-15T19-45-08-670Z.log` [[Sistema/Arquivos/.playwright-mcp/console-2026-03-15T19-45-08-670Z.log|hub]]
- `.playwright-mcp/console-2026-03-15T19-45-54-592Z.log` [[Sistema/Arquivos/.playwright-mcp/console-2026-03-15T19-45-54-592Z.log|hub]]
- `.playwright-mcp/console-2026-03-15T19-51-47-520Z.log` [[Sistema/Arquivos/.playwright-mcp/console-2026-03-15T19-51-47-520Z.log|hub]]
- `.playwright-mcp/console-2026-03-16T01-25-28-170Z.log` [[Sistema/Arquivos/.playwright-mcp/console-2026-03-16T01-25-28-170Z.log|hub]]
- `.playwright-mcp/console-2026-03-16T01-26-42-864Z.log` [[Sistema/Arquivos/.playwright-mcp/console-2026-03-16T01-26-42-864Z.log|hub]]
- `.playwright-mcp/console-2026-03-17T01-37-26-806Z.log` [[Sistema/Arquivos/.playwright-mcp/console-2026-03-17T01-37-26-806Z.log|hub]]
- `.playwright-mcp/console-2026-03-17T02-43-29-174Z.log` [[Sistema/Arquivos/.playwright-mcp/console-2026-03-17T02-43-29-174Z.log|hub]]
- `.playwright-mcp/console-2026-03-17T04-13-29-883Z.log` [[Sistema/Arquivos/.playwright-mcp/console-2026-03-17T04-13-29-883Z.log|hub]]
- `.playwright-mcp/console-2026-03-17T11-27-28-601Z.log` [[Sistema/Arquivos/.playwright-mcp/console-2026-03-17T11-27-28-601Z.log|hub]]
- `.playwright-mcp/console-2026-03-17T11-29-05-064Z.log` [[Sistema/Arquivos/.playwright-mcp/console-2026-03-17T11-29-05-064Z.log|hub]]
- `.playwright-mcp/console-2026-03-17T11-46-30-322Z.log` [[Sistema/Arquivos/.playwright-mcp/console-2026-03-17T11-46-30-322Z.log|hub]]
- `.playwright-mcp/console-2026-03-17T21-26-22-100Z.log` [[Sistema/Arquivos/.playwright-mcp/console-2026-03-17T21-26-22-100Z.log|hub]]
- `.playwright-mcp/console-2026-03-17T21-26-45-681Z.log` [[Sistema/Arquivos/.playwright-mcp/console-2026-03-17T21-26-45-681Z.log|hub]]
- `.playwright-mcp/console-2026-03-17T21-27-06-979Z.log` [[Sistema/Arquivos/.playwright-mcp/console-2026-03-17T21-27-06-979Z.log|hub]]
- `.playwright-mcp/console-2026-03-17T22-46-57-906Z.log` [[Sistema/Arquivos/.playwright-mcp/console-2026-03-17T22-46-57-906Z.log|hub]]
- `.playwright-mcp/console-2026-03-17T23-26-45-397Z.log` [[Sistema/Arquivos/.playwright-mcp/console-2026-03-17T23-26-45-397Z.log|hub]]
- `.playwright-mcp/console-2026-03-17T23-27-18-498Z.log` [[Sistema/Arquivos/.playwright-mcp/console-2026-03-17T23-27-18-498Z.log|hub]]
- `.playwright-mcp/console-2026-03-17T23-27-48-045Z.log` [[Sistema/Arquivos/.playwright-mcp/console-2026-03-17T23-27-48-045Z.log|hub]]
- `.playwright-mcp/console-2026-03-17T23-28-32-997Z.log` [[Sistema/Arquivos/.playwright-mcp/console-2026-03-17T23-28-32-997Z.log|hub]]
- `.playwright-mcp/console-2026-03-17T23-28-44-378Z.log` [[Sistema/Arquivos/.playwright-mcp/console-2026-03-17T23-28-44-378Z.log|hub]]
- `.playwright-mcp/console-2026-03-17T23-28-56-100Z.log` [[Sistema/Arquivos/.playwright-mcp/console-2026-03-17T23-28-56-100Z.log|hub]]
- `.playwright-mcp/console-2026-03-17T23-29-36-951Z.log` [[Sistema/Arquivos/.playwright-mcp/console-2026-03-17T23-29-36-951Z.log|hub]]
- `.playwright-mcp/console-2026-03-17T23-30-32-462Z.log` [[Sistema/Arquivos/.playwright-mcp/console-2026-03-17T23-30-32-462Z.log|hub]]
- `.playwright-mcp/console-2026-03-17T23-30-51-611Z.log` [[Sistema/Arquivos/.playwright-mcp/console-2026-03-17T23-30-51-611Z.log|hub]]
- `.playwright-mcp/console-2026-03-17T23-47-44-262Z.log` [[Sistema/Arquivos/.playwright-mcp/console-2026-03-17T23-47-44-262Z.log|hub]]
- `.playwright-mcp/console-2026-03-18T00-49-25-222Z.log` [[Sistema/Arquivos/.playwright-mcp/console-2026-03-18T00-49-25-222Z.log|hub]]
- `.playwright-mcp/console-2026-03-18T03-13-24-905Z.log` [[Sistema/Arquivos/.playwright-mcp/console-2026-03-18T03-13-24-905Z.log|hub]]
- `.playwright-mcp/console-2026-03-18T03-13-41-119Z.log` [[Sistema/Arquivos/.playwright-mcp/console-2026-03-18T03-13-41-119Z.log|hub]]
- `.playwright-mcp/console-2026-03-18T03-15-43-114Z.log` [[Sistema/Arquivos/.playwright-mcp/console-2026-03-18T03-15-43-114Z.log|hub]]
- `.playwright-mcp/console-2026-03-18T03-18-35-282Z.log` [[Sistema/Arquivos/.playwright-mcp/console-2026-03-18T03-18-35-282Z.log|hub]]
- `.playwright-mcp/console-2026-03-18T03-18-44-463Z.log` [[Sistema/Arquivos/.playwright-mcp/console-2026-03-18T03-18-44-463Z.log|hub]]
- `.playwright-mcp/console-2026-03-18T03-18-51-689Z.log` [[Sistema/Arquivos/.playwright-mcp/console-2026-03-18T03-18-51-689Z.log|hub]]
