# Visual Audit Report - wealth.Investing
**Date:** 2026-03-18
**Auditor:** Claude Opus 4.6 (Playwright MCP)
**Environment:** localhost:3000 (dev), Windows 11, 1366x768 viewport

---

## Summary

Audited 17+ screens across landing page, login, dashboard, journal, wallet, alerts, AI coach, settings. Tested light mode, dark mode, and mobile (375px). Overall quality is **HIGH** but several issues need attention.

---

## CRITICAL Issues

### 1. Landing Page - Full Page Screenshot Shows Blank Sections
**Severity:** HIGH
**Location:** Landing page (/) - full page view
**Description:** When taking a full-page screenshot, most content sections below the hero appear as blank/invisible space. The animated sections (REGISTRE, ANALISE, EVOLUA, PROTEJA, AI Coach, Macro, etc.) only render when scrolled into viewport due to Framer Motion animations. This means search engine crawlers and accessibility tools see mostly empty content.
**Files:** `app/page.tsx`, landing page section components
**Fix:** Add `initial` state that shows content (opacity: 1) for SSR/noscript, or use `whileInView` with `once: true` and a visible fallback.

### 2. [PLACEHOLDER] Text Visible on Landing Page
**Severity:** HIGH
**Location:** Landing page - multiple sections
**Description:** Several "[PLACEHOLDER]" strings are visible to users:
- Rating section: "4.8/5 [PLACEHOLDER]"
- Stats cards: "Traders que revisam operacoes com dados tem em media 3.2x mais profit factor em 6 meses. [PLACEHOLDER]"
- Stats cards: "Identificar padroes de impulsividade reduz overtrading... [PLACEHOLDER]"
- Stats cards: "Pare de montar planilhas manuais... [PLACEHOLDER]"
- Testimonial section: "[PLACEHOLDER]" below the Rafael Mendes quote
**Fix:** Remove all [PLACEHOLDER] strings or replace with real content.

---

## HIGH Issues

### 3. /app/manage-accounts Returns 404
**Severity:** HIGH
**Location:** /app/manage-accounts
**Description:** This route does not exist. There's no "Manage Accounts" link in the nav, but the Journal page has an "Adicionar conta" button. Users who expect an account management page will find a 404.
**Fix:** Create the route or ensure account management is accessible from another page.

### 4. /app/calendar Returns 404
**Severity:** HIGH
**Location:** /app/calendar
**Description:** No standalone calendar route exists. Calendar is embedded in dashboard and journal. Not a navigation issue since there's no link to it, but the landing page promotes "Calendario" as a feature.
**Fix:** Low priority if calendar is always embedded; consider adding a redirect to /app/journal.

### 5. Dashboard Loads with Empty Data Briefly Before Populating
**Severity:** MEDIUM
**Location:** /app (Dashboard)
**Description:** On navigation to /app, the dashboard briefly shows all $0 values and "Conta Free" before data loads and shows "Pedro Pro" with real data. This causes a visible flash of incorrect content.
**Fix:** Add loading skeleton or delay rendering until data is fetched.

---

## MEDIUM Issues

### 6. Nav Bar Shows "Conta Free" / "U" Avatar Intermittently
**Severity:** MEDIUM
**Location:** All /app/** pages
**Description:** The user badge in the navbar sometimes shows "U Conta Free" instead of "P Pedro Pro", suggesting a race condition in loading the user profile/subscription data.
**Fix:** Cache the user profile + subscription in context, show skeleton while loading.

### 7. "Ocultar" Button on Dashboard Has No Visible Eye Icon Context
**Severity:** LOW
**Location:** /app (Dashboard)
**Description:** The "Ocultar" button (hide sensitive data) is present but its icon is small and may not be immediately understood by users.
**Fix:** Add tooltip or more descriptive label.

### 8. Wallet Page - Sparse Empty State
**Severity:** MEDIUM
**Location:** /app/wallet
**Description:** The wallet page shows "$0.00" and "Nenhuma transacao registrada" with a small receipt icon. The empty state could be more inviting with guidance on how to add transactions.
**Fix:** Add a CTA or instructions for adding the first transaction.

### 9. News Feed Shows Non-Financial/Irrelevant Content
**Severity:** MEDIUM
**Location:** /app (Dashboard) - News section
**Description:** The news feed shows articles like "Kane's 2 goals lead Red Wings past Flames" (sports), "Star Wars Outlaws Gold Edition" (gaming deals), "Shocking Oscars Aftermath Pic" - these are not relevant to trading/finance.
**Fix:** Improve news API filtering to focus on financial/market news only.

### 10. Landing Page - "Saiba mais" Links Point to Non-Existent Routes
**Severity:** MEDIUM
**Location:** Landing page feature sections
**Description:** Links like "Saiba mais sobre integracoes" (/features/registre), "Saiba mais sobre analytics" (/features/analise), "Saiba mais sobre journaling" (/features/evolua), "Saiba mais sobre gestao de risco" (/features/proteja) all lead to 404 pages.
**Fix:** Create the feature pages or remove/disable the links.

### 11. Footer Links All Point to "#"
**Severity:** MEDIUM
**Location:** Landing page footer
**Description:** All footer links (Blog, Changelog, Comunidade, Central de Ajuda, Academy, Fale conosco, social links, Cookies, Privacidade, Termos de uso) point to "#" - placeholder links.
**Fix:** Implement or remove.

---

## LOW Issues

### 12. Journal Tab Icons Missing Labels
**Severity:** LOW
**Location:** /app/journal
**Description:** The journal has 4 tab buttons (Visao Geral + 3 icon-only tabs). The icon-only tabs lack labels making it unclear what they do.
**Fix:** Add tooltips or text labels.

### 13. Landing Page Stat Counter Animations Show "0" Initially
**Severity:** LOW
**Location:** Landing page - "Como funciona" section
**Description:** The animated counters (3.2x, 47%, 12h) show "0x", "0%", "0h" before animating. Since they only animate on scroll into view, the initial 0 values are visible briefly.
**Fix:** Minor - consider starting with final values or using a placeholder.

### 14. TradingView Widget Sidebar Takes Significant Space
**Severity:** LOW
**Location:** /app (Dashboard)
**Description:** The TradingView chart widget with its right sidebar (symbol details, seasonals, technical indicators) takes up a lot of vertical space at the top of the dashboard, pushing the user's own trading data below the fold.
**Fix:** Consider making the chart collapsible (already has "Ocultar" button) or defaulting to a more compact view.

---

## Dark Mode Assessment

Dark mode works well overall:
- Dashboard: Proper dark backgrounds, calendar colors (green/red) are appropriately muted
- Navigation: Clean dark navbar with proper contrast
- Cards and tables: Good contrast and readability
- TradingView widgets adapt to dark mode correctly

No significant dark mode issues detected.

---

## Mobile Responsive Assessment (375px)

- **Dashboard:** Responsive, hamburger menu works, chart adapts. Content stacks vertically.
- **Landing page:** Responsive, hero text readable, calendar mockup adapts well.
- **Nav:** Collapses to hamburger menu correctly.
- **Performance cards:** Stack properly in single column.

Mobile layout is functional but the TradingView chart takes up most of the initial viewport on mobile.

---

## Screenshots Taken

| # | File | Description |
|---|------|-------------|
| 01 | audit-01-landing-fullpage.png | Landing page full (shows blank animation issue) |
| 02 | audit-02-landing-hero.png | Hero section - clean |
| 03 | audit-03-landing-platforms.png | Platforms + stats (PLACEHOLDER visible) |
| 04 | audit-04-landing-registre.png | REGISTRE + ANALISE sections |
| 05 | audit-05-landing-evolua.png | PROTEJA section |
| 06 | audit-06-landing-aicoach.png | Macro intelligence section |
| 07 | audit-07-landing-pricing.png | Pricing cards |
| 08 | audit-08-landing-footer.png | CTA + Footer |
| 09 | audit-09-login.png | Login page |
| 10 | audit-10-login-filled.png | Login with credentials |
| 11 | audit-11-dashboard-top.png | Dashboard top (chart + ticker) |
| 12 | audit-12-dashboard-calendar.png | Dashboard calendar |
| 13 | audit-13-dashboard-performance.png | Performance + accounts table |
| 14 | audit-14-dashboard-news.png | Accounts table + news |
| 15 | audit-15-journal.png | Journal overview |
| 16 | audit-16-journal-calendar.png | Journal calendar |
| 17 | audit-17-wallet.png | Wallet (empty state) |
| 18 | audit-18-alerts.png | Alerts page |
| 19 | audit-19-aicoach.png | AI Coach |
| 20 | audit-20-settings.png | Settings |
| 21 | audit-21-dashboard-dark.png | Dashboard dark mode |
| 22 | audit-22-dashboard-dark-calendar.png | Calendar dark mode |
| 23 | audit-23-mobile-dashboard-dark.png | Mobile dashboard |
| 24 | audit-24-mobile-dashboard-calendar.png | Mobile performance |
| 25 | audit-25-mobile-landing.png | Mobile landing |

---

## Overall Score: 82/100

| Category | Score | Notes |
|----------|-------|-------|
| Visual Consistency | 9/10 | Clean design system, consistent styling |
| Dark Mode | 9/10 | Well implemented |
| Responsive | 8/10 | Good mobile adaptation |
| Content Completeness | 6/10 | PLACEHOLDERs, dead links, irrelevant news |
| Empty States | 7/10 | Wallet needs work |
| Navigation | 8/10 | Missing manage-accounts route |
| Performance/Loading | 7/10 | Flash of empty data on dashboard |
| Accessibility | 8/10 | Good structure, skip-to-content link present |
