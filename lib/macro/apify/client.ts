// lib/macro/apify/client.ts
// Apify REST API client wrapper for macro intelligence pipeline

const APIFY_BASE_URL = "https://api.apify.com/v2";

function getToken(): string | null {
  return process.env.APIFY_API_TOKEN || null;
}

export interface ApifyRunResult<T> {
  items: T[];
  runId: string;
  durationMs: number;
}

/**
 * Call an Apify actor and wait for results.
 * Returns null on any failure (never throws) so callers can fallback gracefully.
 */
export async function callActor<T>(
  actorId: string,
  input: Record<string, unknown>,
  timeoutMs = 120_000
): Promise<ApifyRunResult<T> | null> {
  const token = getToken();
  if (!token) {
    console.warn("[apify-client] APIFY_API_TOKEN not set, skipping actor call");
    return null;
  }

  const startTime = Date.now();
  const encodedActorId = actorId.replace("/", "~");

  try {
    // 1. Start the actor run
    const startRes = await fetch(
      `${APIFY_BASE_URL}/acts/${encodedActorId}/runs?token=${token}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }
    );

    if (!startRes.ok) {
      const errText = await startRes.text();
      console.error(`[apify-client] Failed to start ${actorId}: ${startRes.status} ${errText}`);
      return null;
    }

    const runData = await startRes.json() as { data: { id: string; defaultDatasetId: string; status: string } };
    const runId = runData.data.id;
    const datasetId = runData.data.defaultDatasetId;

    // 2. Poll until finished or timeout
    let status = runData.data.status;
    while (status === "RUNNING" || status === "READY") {
      if (Date.now() - startTime > timeoutMs) {
        console.warn(`[apify-client] Timeout waiting for ${actorId} run ${runId}`);
        return null;
      }

      await new Promise((r) => setTimeout(r, 3000));

      const pollRes = await fetch(
        `${APIFY_BASE_URL}/actor-runs/${runId}?token=${token}`
      );
      if (!pollRes.ok) {
        console.warn(`[apify-client] Poll failed for run ${runId}`);
        return null;
      }
      const pollData = await pollRes.json() as { data: { status: string } };
      status = pollData.data.status;
    }

    if (status !== "SUCCEEDED") {
      console.error(`[apify-client] Actor ${actorId} run ${runId} ended with status: ${status}`);
      return null;
    }

    // 3. Fetch dataset items
    const datasetRes = await fetch(
      `${APIFY_BASE_URL}/datasets/${datasetId}/items?token=${token}&format=json`
    );
    if (!datasetRes.ok) {
      console.error(`[apify-client] Failed to fetch dataset ${datasetId}`);
      return null;
    }

    const items = await datasetRes.json() as T[];
    const durationMs = Date.now() - startTime;

    console.log(`[apify-client] ${actorId}: ${items.length} items in ${Math.round(durationMs / 1000)}s`);

    return { items, runId, durationMs };
  } catch (err) {
    console.error(`[apify-client] Error calling ${actorId}:`, err);
    return null;
  }
}
