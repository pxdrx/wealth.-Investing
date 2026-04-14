#!/usr/bin/env npx tsx
/**
 * Local database backup script — exports all critical tables to JSON files.
 * Run: npx tsx scripts/backup-db.ts
 *
 * Creates timestamped backup in backups/ folder.
 * Free alternative to Supabase Pro PITR.
 */

import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const TABLES = [
  "profiles",
  "accounts",
  "prop_accounts",
  "journal_trades",
  "prop_payouts",
  "wallet_transactions",
  "prop_alerts",
  "subscriptions",
  "economic_events",
  "weekly_panoramas",
  "central_bank_rates",
  "macro_headlines",
  "ingestion_logs",
  "user_symbols",
];

async function backup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const dir = path.join(process.cwd(), "backups", timestamp);
  fs.mkdirSync(dir, { recursive: true });

  console.log(`Backup started → ${dir}\n`);
  let totalRows = 0;

  for (const table of TABLES) {
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select("*", { count: "exact" })
        .limit(100_000);

      if (error) {
        console.warn(`  ⚠ ${table}: ${error.message}`);
        continue;
      }

      const rows = data ?? [];
      totalRows += rows.length;
      const filePath = path.join(dir, `${table}.json`);
      fs.writeFileSync(filePath, JSON.stringify(rows, null, 2));
      console.log(`  ✓ ${table}: ${rows.length} rows`);
    } catch (err) {
      console.warn(`  ✗ ${table}: ${err}`);
    }
  }

  console.log(`\nBackup complete: ${totalRows} total rows in ${dir}`);
}

backup().catch(console.error);
