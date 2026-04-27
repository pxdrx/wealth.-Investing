// Churn sequence — 2 emails over 14 days for users who just canceled.
// D0 sends immediately (we-miss-you), D14 enqueues a coupon-driven
// reactivation pitch.

import { addDays } from "date-fns";
import { send } from "../integrations/resend";
import { enqueue } from "../schedulers/queue";
import { canSend } from "../lib/consent";
import { buildUnsubscribeUrl } from "@/lib/email/unsubscribe-token";
import type { Locale } from "../__mocks__/types";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://owealthinvesting.com";
const COUPON_CODE = "UPGRADE30_3M";
const COUPON_PCT_OFF = 30;

export interface ScheduleChurnArgs {
  userId: string;
  email: string;
  firstName: string;
  locale?: Locale;
  startAt?: Date;
}

export interface ScheduleChurnResult {
  scheduled: number;
  sent: number;
  skipped: number;
  errors: string[];
}

export async function scheduleChurn(
  args: ScheduleChurnArgs,
): Promise<ScheduleChurnResult> {
  const result: ScheduleChurnResult = { scheduled: 0, sent: 0, skipped: 0, errors: [] };

  const consent = await canSend(args.email, "churn");
  if (!consent.allowed) {
    result.skipped = 2;
    return result;
  }

  const start = args.startAt ?? new Date();
  const locale: Locale = args.locale ?? "pt-BR";
  const baseProps = {
    firstName: args.firstName,
    locale,
    unsubscribeUrl: buildUnsubscribeUrl(args.email),
    appUrl: APP_URL,
  };

  // Day 0 — immediate "miss you" message, no coupon.
  const r0 = await send({
    template: "churn.day0",
    props: baseProps,
    to: args.email,
  });
  if (r0.ok) result.sent++;
  else result.errors.push(`day0: ${r0.error ?? "unknown"}`);

  // Day 14 — reactivation with coupon.
  const eq = await enqueue({
    template: "churn.day14",
    props: { ...baseProps, couponCode: COUPON_CODE, couponPctOff: COUPON_PCT_OFF },
    to: args.email,
    sendAt: addDays(start, 14),
    userId: args.userId,
  });

  if (!eq.ok) {
    result.errors.push(`day14: ${eq.reason ?? "enqueue failed"}`);
  } else if (eq.inserted) {
    result.scheduled++;
  } else {
    result.skipped++;
  }

  return result;
}
