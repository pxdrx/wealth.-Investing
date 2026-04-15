// lib/macro/audit/types.ts
// Shapes returned by the macro audit (calendar + rates).

export type AuditField = "previous" | "forecast" | "actual";

export interface AuditSourceValues {
  previous: string | null;
  forecast: string | null;
  actual: string | null;
}

export interface AuditEventRow {
  event_id: string;
  event_uid: string;
  title: string;
  date: string;        // YYYY-MM-DD
  time: string | null; // HH:MM
  country: string;     // ISO-2
  impact: "high" | "medium" | "low";
  db: AuditSourceValues;
  ff: AuditSourceValues | null;
  te: AuditSourceValues | null;
  ic: AuditSourceValues | null;
  disagreements: AuditField[];
  recommendation: "ok" | "ff_wins" | "te_wins" | "ic_wins" | "manual";
}

export interface CalendarAuditReport {
  weekStart: string;
  weekEnd: string;
  eventCount: number;
  rows: AuditEventRow[];
  sourcesAvailable: {
    ff: boolean;
    te: boolean;
    ic: boolean;
  };
  generatedAt: string;
}

export interface AuditRateRow {
  bank_code: string;
  bank_name: string;
  country: string;
  db: {
    current_rate: number;
    last_action: string | null;
    last_change_bps: number | null;
    last_change_date: string | null;
    updated_at: string;
  };
  te: {
    current_rate: number;
  } | null;
  flags: {
    mismatch_rate: boolean;
    stale: boolean;
    stale_change_date: boolean;
  };
}

export interface RateAuditReport {
  rows: AuditRateRow[];
  teAvailable: boolean;
  generatedAt: string;
}
