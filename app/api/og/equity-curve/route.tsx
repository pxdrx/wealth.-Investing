// OG-image route for the WeeklyRecap email's equity curve.
// Renders a 600x180 PNG sparkline of the user's cumulative net PnL
// over the requested week. No auth — userId is treated as a public
// resource handle since the image leaks no PII (only an aggregate
// curve). For tighter privacy, swap to an HMAC-signed token.

import { NextRequest } from "next/server";
import { ImageResponse } from "next/og";
import { createServiceRoleClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

const W = 600;
const H = 180;
const PAD_X = 12;
const PAD_Y = 24;

interface TradeRow {
  net_pnl_usd: number | null;
  pnl_usd: number | null;
  opened_at: string;
}

function buildPolylinePoints(values: number[]): string {
  if (values.length === 0) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const innerW = W - PAD_X * 2;
  const innerH = H - PAD_Y * 2;
  return values
    .map((v, i) => {
      const x = PAD_X + (values.length === 1 ? innerW / 2 : (i / (values.length - 1)) * innerW);
      const y = PAD_Y + innerH - ((v - min) / range) * innerH;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("u");
  const startStr = searchParams.get("s");
  const endStr = searchParams.get("e");

  if (!userId || !startStr || !endStr) {
    return new Response("missing params", { status: 400 });
  }

  const sb = createServiceRoleClient();
  const { data } = await sb
    .from("journal_trades")
    .select("net_pnl_usd, pnl_usd, opened_at")
    .eq("user_id", userId)
    .gte("opened_at", `${startStr}T00:00:00Z`)
    .lte("opened_at", `${endStr}T23:59:59Z`)
    .order("opened_at", { ascending: true });

  const rows = (data ?? []) as TradeRow[];
  let cum = 0;
  const cumValues: number[] = [0];
  for (const r of rows) {
    cum += r.net_pnl_usd ?? r.pnl_usd ?? 0;
    cumValues.push(cum);
  }

  const polyline = buildPolylinePoints(cumValues);
  const finalPnl = cumValues[cumValues.length - 1] ?? 0;
  const isPositive = finalPnl >= 0;
  const stroke = isPositive ? "#34c759" : "#d70015";
  const fillOpacity = "0.12";

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: `${W}px`,
          height: `${H}px`,
          background: "#f5f5f7",
        }}
      >
        <svg
          width={W}
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          xmlns="http://www.w3.org/2000/svg"
        >
          {polyline && (
            <>
              <polygon
                points={`${PAD_X},${H - PAD_Y} ${polyline} ${W - PAD_X},${H - PAD_Y}`}
                fill={stroke}
                fillOpacity={fillOpacity}
              />
              <polyline
                points={polyline}
                fill="none"
                stroke={stroke}
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </>
          )}
        </svg>
      </div>
    ),
    { width: W, height: H },
  );
}
