# Setup MacBook Air M2 — Do Zero

Guia completo para replicar o ambiente de dev do Windows no Mac.
Repo: `https://github.com/pxdrx/wealth.-Investing.git`

---

## ANTES DE VIAJAR — Preparar no Windows

Fazer tudo isso ANTES de sair. Salvar num pendrive, Google Drive, ou 1Password.

### Arquivos para copiar

```
1. trading-dashboard/.env.local            (todas as env vars do projeto)
2. trading-dashboard/dexter/.env           (env vars do agente Dexter)
3. trading-dashboard/.claude/settings.local.json  (config local do Claude Code)
4. ~/.claude.json                          (tokens dos MCP servers)
5. buffer-mcp-server/                      (pasta inteira — NAO e um repo Git)
6. social-mcp-server/                      (pasta inteira — NAO e um repo Git)
7. ~/.claude/skills/orchestrator/          \
8. ~/.claude/skills/backend/                |
9. ~/.claude/skills/seo-agent/              | Skills customizadas (globais)
10. ~/.claude/skills/qa-forensic/           |
11. ~/.claude/skills/auth-agent/            |
12. ~/.claude/skills/instagram-carousel/    /
```

### Comandos para empacotar (PowerShell no Windows)

```powershell
# 0. Criar pasta de destino
mkdir "$env:USERPROFILE\Desktop\mac-setup" -Force

# 1. Env vars (projeto principal + dexter)
copy "$env:USERPROFILE\trading-dashboard\.env.local" "$env:USERPROFILE\Desktop\mac-setup\"
copy "$env:USERPROFILE\trading-dashboard\dexter\.env" "$env:USERPROFILE\Desktop\mac-setup\dexter-env"

# 2. Claude configs
copy "$env:USERPROFILE\.claude.json" "$env:USERPROFILE\Desktop\mac-setup\"
copy "$env:USERPROFILE\trading-dashboard\.claude\settings.local.json" "$env:USERPROFILE\Desktop\mac-setup\"

# 3. MCP servers (projetos locais, NAO sao repos Git)
robocopy "$env:USERPROFILE\buffer-mcp-server" "$env:USERPROFILE\Desktop\mac-setup\buffer-mcp-server" /E /XD node_modules
robocopy "$env:USERPROFILE\social-mcp-server" "$env:USERPROFILE\Desktop\mac-setup\social-mcp-server" /E /XD node_modules

# 4. Skills customizadas
$skills = @("orchestrator","backend","seo-agent","qa-forensic","auth-agent","instagram-carousel")
foreach ($s in $skills) {
  Copy-Item -Recurse "$env:USERPROFILE\.claude\skills\$s" "$env:USERPROFILE\Desktop\mac-setup\skills\$s"
}
# Tambem o .md avulso do carousel
copy "$env:USERPROFILE\.claude\skills\instagram-carousel-SKILL.md" "$env:USERPROFILE\Desktop\mac-setup\skills\"

# 5. Comprimir tudo
Compress-Archive -Path "$env:USERPROFILE\Desktop\mac-setup" -DestinationPath "$env:USERPROFILE\Desktop\mac-setup.zip"
```

### Git — garantir que tudo esta pushed

```bash
cd ~/trading-dashboard
git status          # nada pendente
git push origin main
```

### Checklist pre-viagem

```
[ ] mac-setup.zip criado com tudo acima
[ ] git push feito — repo 100% atualizado
[ ] Anotar username do GitHub (pxdrx) e email
[ ] Testar que consegue acessar o zip (Google Drive, pendrive, etc.)
```

---

## NO MAC — Passo a Passo

### Fase 1: Ferramentas Base

Abrir **Terminal** (Cmd+Space → "Terminal").

#### 1.1 Homebrew
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```
Apos instalar, copie e rode os 2 comandos que aparecem no final:
```bash
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
eval "$(/opt/homebrew/bin/brew shellenv)"
```

#### 1.2 Git
O Mac ja vem com git, mas instalar a versao atualizada:
```bash
brew install git
git config --global user.name "Paulo Halm"
git config --global user.email "SEU_EMAIL_GITHUB"
```

#### 1.3 Node.js v24
```bash
brew install node@24
```
Se o brew instalar outra versao, use:
```bash
brew install nvm
nvm install 24
nvm use 24
```
Verificar:
```bash
node -v  # v24.x
npm -v   # 11.x
```

#### 1.4 GitHub CLI
```bash
brew install gh
gh auth login
# Escolher: GitHub.com → HTTPS → Login with browser
```

#### 1.5 SSH Key para GitHub
```bash
ssh-keygen -t ed25519 -C "SEU_EMAIL_GITHUB"
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519
cat ~/.ssh/id_ed25519.pub
```
Copiar a chave e adicionar em: https://github.com/settings/ssh/new

Testar:
```bash
ssh -T git@github.com
# "Hi pxdrx! You've successfully authenticated..."
```

---

### Fase 2: Projeto

#### 2.1 Clonar o repo
```bash
cd ~
git clone https://github.com/pxdrx/wealth.-Investing.git trading-dashboard
cd trading-dashboard
```

#### 2.2 Instalar dependencias
```bash
npm install
```
Isso tambem baixa o Chromium do Puppeteer automaticamente (para os scripts de screenshot).

#### 2.3 Copiar .env.local
Do zip/pendrive, copiar o `.env.local` para `~/trading-dashboard/.env.local`.

Referencia: ver `.env.example` no repo para a lista completa e atualizada.

Variaveis obrigatorias:
```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# App
NEXT_PUBLIC_APP_URL=

# Stripe Billing (LIVE)
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRO_MONTHLY_PRICE_ID=
STRIPE_PRO_ANNUAL_PRICE_ID=
STRIPE_ULTRA_MONTHLY_PRICE_ID=
STRIPE_ULTRA_ANNUAL_PRICE_ID=

# Claude AI
ANTHROPIC_API_KEY=

# Cron
CRON_SECRET=

# Sentry
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=

# Email (feedback form)
RESEND_API_KEY=

# News
NEWS_API_KEY=

# MetaAPI (conexao MT5 ao vivo)
METAAPI_TOKEN=
METAAPI_ENCRYPTION_KEY=

# Redis (rate limiting)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Financial/Market Data APIs
TWELVE_DATA_API_KEY=
FRED_API_KEY=
FINNHUB_API_KEY=
ALPHA_VANTAGE_API_KEY=

# Apify (scraping)
APIFY_API_TOKEN=
```

**IMPORTANTE:** Copiar o `.env.local` do Windows ja resolve tudo. A lista acima e apenas referencia.

#### 2.4 Testar
```bash
npm run dev
# Abrir http://localhost:3000
```

---

### Fase 3: VS Code

```bash
brew install --cask visual-studio-code
```

Extensoes (Cmd+Shift+X):
- **Claude Code** (Anthropic) — a principal
- **Tailwind CSS IntelliSense**
- **ESLint**
- **Prettier**

---

### Fase 4: Claude Code CLI

#### 4.1 Instalar
```bash
npm install -g @anthropic-ai/claude-code
```

#### 4.2 Login
```bash
cd ~/trading-dashboard
claude
# Siga o fluxo de autenticacao no browser
```

#### 4.3 Settings do projeto
O `.claude/settings.json` ja vem no repo (commitado). Ao clonar voce ja tem os plugins habilitados.

O `.claude/agents/` e `.claude/commands/` tambem ja vem no clone — nao precisa copiar separado.

---

### Fase 5: MCP Servers

#### 5.1 Copiar MCP servers customizados
Do zip, copiar as pastas para o home:
```bash
# Copiar buffer-mcp-server e social-mcp-server para ~/
cp -r /caminho/do/pendrive/buffer-mcp-server ~/buffer-mcp-server
cp -r /caminho/do/pendrive/social-mcp-server ~/social-mcp-server

# Instalar deps e buildar
cd ~/buffer-mcp-server && npm install && npm run build
cd ~/social-mcp-server && npm install && npm run build
```

#### 5.2 Config global — ~/.claude.json
Criar `~/.claude.json` com o conteudo abaixo.
**IMPORTANTE**: adaptar os paths e copiar os tokens do arquivo que voce trouxe do Windows.

```json
{
  "mcpServers": {
    "stitch": {
      "type": "http",
      "url": "https://stitch.googleapis.com/mcp",
      "headers": {
        "X-Goog-Api-Key": "COPIAR_DO_WINDOWS"
      }
    },
    "context7": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp", "--api-key", "COPIAR_DO_WINDOWS"],
      "env": {}
    },
    "buffer-mcp-server": {
      "type": "stdio",
      "command": "node",
      "args": ["/Users/SEU_USER_MAC/buffer-mcp-server/dist/index.js"],
      "env": {
        "BUFFER_ACCESS_TOKEN": "COPIAR_DO_WINDOWS"
      }
    },
    "social-mcp-server": {
      "type": "stdio",
      "command": "node",
      "args": ["/Users/SEU_USER_MAC/social-mcp-server/dist/index.js"],
      "env": {
        "X_API_KEY": "COPIAR_DO_WINDOWS",
        "X_API_KEY_SECRET": "COPIAR_DO_WINDOWS",
        "X_ACCESS_TOKEN": "COPIAR_DO_WINDOWS",
        "X_ACCESS_TOKEN_SECRET": "COPIAR_DO_WINDOWS",
        "INSTAGRAM_ACCESS_TOKEN": "COPIAR_DO_WINDOWS",
        "INSTAGRAM_BUSINESS_ACCOUNT_ID": "COPIAR_DO_WINDOWS"
      }
    }
  }
}
```

**Diferencas Windows → Mac:**
- `"command": "cmd", "args": ["/c", "npx", ...]` → `"command": "npx", "args": [...]`
- `C:/Users/phalm/` → `/Users/SEU_USER_MAC/`

#### 5.3 Config do projeto — .mcp.json
Editar `~/trading-dashboard/.mcp.json` localmente (NAO commitar):

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": ["-y", "@supabase/mcp-server-supabase@latest", "--project-ref", "haiyyqumhhaixrcayreg", "--read-only"],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "COPIAR_DO_WINDOWS"
      }
    }
  }
}
```

---

### Fase 6: Skills Customizadas

Do zip, copiar as pastas de skills para `~/.claude/skills/`:
```bash
mkdir -p ~/.claude/skills
cp -r /caminho/do/pendrive/skills/orchestrator ~/.claude/skills/
cp -r /caminho/do/pendrive/skills/backend ~/.claude/skills/
cp -r /caminho/do/pendrive/skills/seo-agent ~/.claude/skills/
cp -r /caminho/do/pendrive/skills/qa-forensic ~/.claude/skills/
cp -r /caminho/do/pendrive/skills/auth-agent ~/.claude/skills/
cp -r /caminho/do/pendrive/skills/instagram-carousel ~/.claude/skills/
cp /caminho/do/pendrive/skills/instagram-carousel-SKILL.md ~/.claude/skills/
```

As skills dos plugins oficiais (superpowers, context-mode, etc.) sao baixadas automaticamente quando o Claude Code inicia com os plugins habilitados.

---

### Fase 7: Obsidian (opcional — se quiser editar o vault na viagem)

```bash
brew install --cask obsidian
```

O vault `wealth.Investing/` ja esta dentro do repo clonado em `~/trading-dashboard/wealth.Investing/`.
Abrir o Obsidian → "Open folder as vault" → selecionar essa pasta.

---

### Fase 8: Dexter (opcional — agente analista com IA)

O `dexter/` e um subprojeto dentro do repo que usa Bun:
```bash
# Instalar Bun
brew install oven-sh/bun/bun

# Setup
cd ~/trading-dashboard/dexter
bun install
```

Dexter tem seu proprio `.env` com variaveis extras:
```
ANTHROPIC_API_KEY=         # mesmo do projeto principal
EXA_SEARCH_API_KEY=        # Exa search integration
FINANCIAL_DATASETS_API_KEY=
OPENAI_API_KEY=            # fallback para alguns modelos
TAVILY_API_KEY=            # web search API
```
Copiar `dexter/.env` do Windows ou criar manualmente com os tokens.

---

### Fase 9: Plugins e Configs Extras

#### 9.1 Obsidian — Plugin obrigatorio
Apos abrir o vault no Obsidian (Fase 7), instalar o community plugin:
- **obsidian-local-rest-api** — necessario para integracao com Claude

Settings → Community Plugins → Browse → buscar "Local REST API" → Install → Enable.

#### 9.2 Claude Code — Skills e Agents do repo
As pastas abaixo ja vem no clone e sao carregadas automaticamente:
- `.claude/agents/` — 23 tipos de agentes especializados
- `.claude/commands/` — 7 categorias de comandos
- `.claude/skills/` — skills do projeto (diferentes das skills globais em `~/.claude/skills/`)
- `.claude/settings.json` — config de plugins (superpowers, context-mode, claude-mem, etc.)

**NAO precisa copiar nada manualmente** — tudo vem no `git clone`.

O unico arquivo local (nao commitado) e `.claude/settings.local.json` — se existir no Windows, copiar tambem.

#### 9.3 Puppeteer / Scripts de Screenshot
Os scripts em `scripts/` (screenshot-*.js, render-reel.js) usam Puppeteer:
```bash
cd ~/trading-dashboard
npx puppeteer browsers install chrome
```

---

## Checklist Final — Validacao no Mac

```
[ ] 1. node -v → v24.x
[ ] 2. npm -v → 11.x
[ ] 3. git remote -v → pxdrx/wealth.-Investing
[ ] 4. gh auth status → logado
[ ] 5. npm run dev → localhost:3000 funciona
[ ] 6. Login no app funciona (Supabase auth)
[ ] 7. MetaAPI: conectar conta MT5 na aba Live funciona
[ ] 8. claude → CLI abre e conecta
[ ] 9. MCP context7 responde (testar com qualquer pergunta sobre docs)
[ ] 10. VS Code abre o projeto
[ ] 11. Extensao Claude Code funciona no VS Code
[ ] 12. Feedback form envia email (testar em /app → rodape)
```

---

## Referencia Rapida: Diferencas Mac vs Windows

| Item | Windows | Mac |
|------|---------|-----|
| Terminal | Git Bash / PowerShell | Terminal (zsh) |
| Paths | `C:\Users\phalm\` | `/Users/seuuser/` |
| MCP command wrapper | `"cmd", ["/c", "npx"]` | `"npx", [...]` direto |
| npm dev script | Precisa `WATCHPACK_POLLING` | Funciona nativo |
| Copiar | Ctrl+C/V | Cmd+C/V |
| Fechar aba terminal | Ctrl+W | Cmd+W |
| VS Code command palette | Ctrl+Shift+P | Cmd+Shift+P |
| Buscar em arquivos | Ctrl+Shift+F | Cmd+Shift+F |

---

## Troubleshooting

### "npx not found" nos MCP servers
```bash
which npx
# Se nao achar, garantir que Node esta no PATH:
echo 'export PATH="/opt/homebrew/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

### Puppeteer nao encontra Chrome
```bash
# Normalmente resolve com:
cd ~/trading-dashboard
npx puppeteer browsers install chrome
```

### .mcp.json resetando
O `.mcp.json` esta no `.gitignore`? Se nao, ele pode ser sobrescrito no `git pull`.
Verificar com `git check-ignore .mcp.json`. Se nao estiver ignorado, adicionar ao `.gitignore`.

### Permissoes de pasta no Mac
```bash
# Se der erro de permissao:
chmod -R 755 ~/.claude/skills/
```

### MetaAPI nao conecta
Verificar que `METAAPI_TOKEN` e `METAAPI_ENCRYPTION_KEY` estao no `.env.local`.
Esses tokens sao da conta MetaAPI (cloud.metaapi.cloud) — sao diferentes do login MT5.

### Emails de feedback nao chegam
Verificar que `RESEND_API_KEY` esta no `.env.local`.
O dominio de envio deve estar verificado no Resend (resend.com/domains).

### Dexter nao inicia
Verificar que `dexter/.env` existe com as 5 variaveis (ANTHROPIC, EXA, FINANCIAL_DATASETS, OPENAI, TAVILY).
