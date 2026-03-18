export interface DayData {
  date: string;
  totalPnl: number;
  tradeCount: number;
  wins: number;
  losses: number;
  bestTrade: number;
  worstTrade: number;
  totalWinAmount: number;
  totalLossAmount: number;
  byAccount?: Record<
    string,
    { accountName: string; pnl: number; trades: number }
  >;
}

export interface DayNote {
  observation: string;
  tags: string[] | null;
}

export interface TradeRow {
  id: string;
  net_pnl_usd: number;
  opened_at: string;
  account_id: string;
  symbol: string;
  direction: string;
}

export interface CalendarPnlProps {
  trades: TradeRow[];
  accounts?: { id: string; name: string }[];
  dayNotes?: Record<string, DayNote>;
  showConsolidatedToggle?: boolean;
}
