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
  closed_at?: string | null;
  account_id: string;
  symbol: string;
  direction: string;
  notes?: string | null;
}

export interface CalendarPnlProps {
  trades: TradeRow[];
  accounts?: { id: string; name: string }[];
  dayNotes?: Record<string, DayNote>;
  userId?: string | null;
  onNoteSaved?: (date: string, note: DayNote) => void;
  accountId?: string | null;
  /** When set, modal only shows trades from these accounts (e.g. backtest accounts) */
  accountIds?: string[];
  /** When true, day popup opens in read-only mode */
  defaultReadOnly?: boolean;
  title?: string;
  compact?: boolean;
  /** Called after a trade is deleted from the day detail modal */
  onTradeDeleted?: () => void;
}
