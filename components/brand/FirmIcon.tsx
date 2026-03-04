"use client";

import type { AccountKind } from "@/lib/accounts";

type FirmIconKind = "The5ers" | "FTMO" | "personal" | "crypto";

interface FirmIconProps {
  /** firm_name para prop (The5ers, FTMO) ou kind para non-prop */
  firmName?: string | null;
  kind?: AccountKind;
  className?: string;
  size?: number;
}

function getKind(firmName?: string | null, kind?: AccountKind): FirmIconKind {
  if (kind && kind !== "prop") return kind;
  if (firmName === "The5ers") return "The5ers";
  if (firmName === "FTMO") return "FTMO";
  return "personal";
}

export function FirmIcon({ firmName, kind, className, size = 20 }: FirmIconProps) {
  const k = getKind(firmName, kind);
  const s = size;

  const wrap = (content: React.ReactNode) => (
    <span
      className={className}
      style={{ width: s, height: s, display: "inline-flex", alignItems: "center", justifyContent: "center" }}
      aria-hidden
    >
      {content}
    </span>
  );

  if (k === "The5ers") {
    return wrap(
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <path d="M12 4v16M4 12h16" />
        <circle cx="12" cy="12" r="3" fill="currentColor" fillOpacity={0.3} />
      </svg>
    );
  }

  if (k === "FTMO") {
    return wrap(
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M7 17l5-10 5 10M4 7h16" />
      </svg>
    );
  }

  if (k === "personal") {
    return wrap(
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="8" r="3" />
        <path d="M5 20a7 7 0 0114 0" />
      </svg>
    );
  }

  if (k === "crypto") {
    return wrap(
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 6v4l2 2 4-2-2 4 4 2-4 2-2-2v4" />
      </svg>
    );
  }

  return wrap(
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}
