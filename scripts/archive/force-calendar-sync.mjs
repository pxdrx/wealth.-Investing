// scripts/force-calendar-sync.mjs
// One-shot script to force-populate economic calendar via Apify + Faireconomy
// Usage: node scripts/force-calendar-sync.mjs
// Reads .env.local for APIFY_API_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { readFileSync } from "fs";
import { resolve } from "path";

// Load .env.local
const envPath = resolve(process.cwd(), ".env.local");
const envLines = readFileSync(envPath, "utf-8").split("\n");
const env = {};
for (const line of envLines) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
}

const APIFY_TOKEN = env.APIFY_API_TOKEN;
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!APIFY_TOKEN || !SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing env vars");
  process.exit(1);
}

// Week start = Monday of current week
function getWeekStart() {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function getWeekEnd() {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -2 : 5);
  d.setDate(diff);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

const CURRENCY_TO_COUNTRY = {
  USD: "US", EUR: "EU", GBP: "GB", JPY: "JP", AUD: "AU",
  NZD: "NZ", CAD: "CA", CHF: "CH", CNY: "CN", BRL: "BR", MXN: "MX",
  ALL: "AL", HKD: "HK", SGD: "SG", KRW: "KR", INR: "IN",
  SEK: "SE", NOK: "NO", DKK: "DK", PLN: "PL", ZAR: "ZA",
};

const weekStart = getWeekStart();
const weekEnd = getWeekEnd();
console.log(`Week: ${weekStart} to ${weekEnd}`);

// ---- Step 1: Try Faireconomy first ----
let faireconomyEvents = [];
try {
  console.log("\n[1/3] Fetching Faireconomy...");
  const feRes = await fetch("https://nfs.faireconomy.media/ff_calendar_thisweek.json", {
    headers: { "User-Agent": "wealth-investing/1.0" },
  });
  if (feRes.ok) {
    const raw = await feRes.json();
    faireconomyEvents = raw
      .filter((e) => ["high", "medium", "low"].includes(e.impact.toLowerCase()))
      .map((e) => {
        const d = new Date(e.date);
        const date = d.toISOString().split("T")[0];
        const hours = d.getUTCHours().toString().padStart(2, "0");
        const minutes = d.getUTCMinutes().toString().padStart(2, "0");
        const time = hours === "00" && minutes === "00" ? null : `${hours}:${minutes}`;
        const dateClean = e.date.replace(/[^0-9]/g, "").slice(0, 8);
        const eventUid = `${e.country}-${dateClean}-${e.title}`.toLowerCase().replace(/\s+/g, "-").slice(0, 128);
        return {
          event_uid: eventUid,
          date,
          time,
          country: e.country.toUpperCase().slice(0, 2),
          title: e.title,
          impact: e.impact.toLowerCase(),
          forecast: e.forecast || null,
          previous: e.previous || null,
          actual: e.actual || null,
          currency: e.country.toUpperCase().slice(0, 3),
          week_start: weekStart,
        };
      });
    console.log(`  Faireconomy: ${faireconomyEvents.length} events`);
  } else {
    console.log(`  Faireconomy: HTTP ${feRes.status} (rate limited or down)`);
  }
} catch (err) {
  console.log(`  Faireconomy failed: ${err.message}`);
}

// ---- Step 2: Fetch Investing.com via Apify ----
let investingEvents = [];
try {
  console.log("\n[2/3] Fetching Investing.com via Apify...");
  const actorId = "pintostudio~economic-calendar-data-investing-com";

  // Start the actor
  const startRes = await fetch(
    `https://api.apify.com/v2/acts/${actorId}/runs?token=${APIFY_TOKEN}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fromDate: weekStart, toDate: weekEnd }),
    }
  );

  if (!startRes.ok) {
    throw new Error(`Start failed: ${startRes.status} ${await startRes.text()}`);
  }

  const runData = await startRes.json();
  const runId = runData.data.id;
  const datasetId = runData.data.defaultDatasetId;
  console.log(`  Run started: ${runId}`);

  // Poll until done (max 120s)
  const startTime = Date.now();
  let status = runData.data.status;
  while (status === "RUNNING" || status === "READY") {
    if (Date.now() - startTime > 120_000) {
      throw new Error("Timeout waiting for Apify actor");
    }
    await new Promise((r) => setTimeout(r, 3000));
    const pollRes = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_TOKEN}`);
    const pollData = await pollRes.json();
    status = pollData.data.status;
    process.stdout.write(".");
  }
  console.log(`\n  Status: ${status}`);

  if (status === "SUCCEEDED") {
    const dsRes = await fetch(
      `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}&format=json`
    );
    const items = await dsRes.json();
    console.log(`  Investing.com: ${items.length} raw events`);

    // Convert to our format
    for (const item of items) {
      if (!item.event || !item.date) continue;
      const currency = (item.currency || "").toUpperCase();
      const country = CURRENCY_TO_COUNTRY[currency] || currency.slice(0, 2);
      const importance = (item.importance || "medium").toLowerCase();
      if (!["high", "medium", "low"].includes(importance)) continue;

      const dateClean = item.date.replace(/[^0-9]/g, "").slice(0, 8);
      const eventUid = `ic-${currency.toLowerCase()}-${dateClean}-${item.event}`.toLowerCase().replace(/\s+/g, "-").slice(0, 128);

      investingEvents.push({
        event_uid: eventUid,
        date: item.date,
        time: item.time || null,
        country,
        title: item.event,
        impact: importance,
        forecast: item.forecast || null,
        previous: item.previous || null,
        actual: item.actual || null,
        currency: currency || null,
        week_start: weekStart,
      });
    }
    console.log(`  Investing.com: ${investingEvents.length} parsed events`);
  }
} catch (err) {
  console.log(`  Apify failed: ${err.message}`);
}

// ---- Step 3: Merge and upsert to Supabase ----
console.log("\n[3/3] Upserting to Supabase...");

// Prefer Faireconomy (matches existing UIDs), supplement with Investing.com
const allEvents = [...faireconomyEvents];
const existingUids = new Set(faireconomyEvents.map((e) => e.event_uid));

// Add Investing.com events that don't overlap
for (const e of investingEvents) {
  if (!existingUids.has(e.event_uid)) {
    allEvents.push(e);
  }
}

console.log(`  Total events to upsert: ${allEvents.length} (${faireconomyEvents.length} FE + ${investingEvents.length} IC, ${allEvents.length - faireconomyEvents.length} IC unique)`);

if (allEvents.length === 0) {
  console.error("No events to insert! Both sources failed.");
  process.exit(1);
}

// Upsert in batches of 50
let inserted = 0;
let updated = 0;
let errors = 0;

for (let i = 0; i < allEvents.length; i += 50) {
  const batch = allEvents.slice(i, i + 50);

  const res = await fetch(`${SUPABASE_URL}/rest/v1/economic_events`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify(batch),
  });

  if (res.ok) {
    inserted += batch.length;
  } else {
    const errText = await res.text();
    console.error(`  Batch ${i}-${i + batch.length} failed: ${res.status} ${errText.slice(0, 200)}`);
    // Try one by one
    for (const event of batch) {
      const singleRes = await fetch(`${SUPABASE_URL}/rest/v1/economic_events`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          Prefer: "resolution=merge-duplicates",
        },
        body: JSON.stringify(event),
      });
      if (singleRes.ok) {
        inserted++;
      } else {
        errors++;
      }
    }
  }
}

console.log(`\nDone! Inserted/updated: ${inserted}, errors: ${errors}`);

// Verify
const verifyRes = await fetch(
  `${SUPABASE_URL}/rest/v1/economic_events?week_start=eq.${weekStart}&select=country,impact`,
  {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  }
);
const verifyData = await verifyRes.json();
const byCountry = {};
for (const e of verifyData) {
  byCountry[e.country] = (byCountry[e.country] || 0) + 1;
}
console.log(`\nVerification — events in DB for week ${weekStart}: ${verifyData.length}`);
console.log("By country:", JSON.stringify(byCountry));
