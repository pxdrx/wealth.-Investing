import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/service";

export type CommunityStats = {
  totalTrades: number | null;
  activeTraders30d: number | null;
  totalVolumeUsd: number | null;
};

const EMPTY: CommunityStats = {
  totalTrades: null,
  activeTraders30d: null,
  totalVolumeUsd: null,
};

export async function getCommunityStats(): Promise<CommunityStats> {
  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase.rpc("community_stats").maybeSingle();
    if (error || !data) return EMPTY;

    const row = data as {
      total_trades: number | string;
      active_traders_30d: number | string;
      total_volume_usd: number | string;
    };
    return {
      totalTrades: Number(row.total_trades),
      activeTraders30d: Number(row.active_traders_30d),
      totalVolumeUsd: Number(row.total_volume_usd),
    };
  } catch {
    return EMPTY;
  }
}
