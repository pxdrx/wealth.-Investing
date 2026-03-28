// Script to seed initial macro data by triggering cron endpoints
// Run: npx tsx scripts/seed-macro.ts

const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const CRON_SECRET = process.env.CRON_SECRET;

if (!CRON_SECRET) {
  console.error("CRON_SECRET not set in environment");
  process.exit(1);
}

const endpoints = [
  "/api/cron/calendar-sync",
  "/api/cron/rates-sync",
  "/api/cron/headlines-sync",
  // narrative-update requires event_id — skip in seed, it runs via cron
];

async function seed() {
  for (const endpoint of endpoints) {
    console.log(`Seeding ${endpoint}...`);
    try {
      const res = await fetch(`${BASE_URL}${endpoint}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${CRON_SECRET}` },
      });
      const data = await res.json();
      console.log(`  ${res.status}: ${JSON.stringify(data).slice(0, 100)}`);
    } catch (err) {
      console.error(`  Failed: ${err}`);
    }
  }
  console.log("Done!");
}

seed();
