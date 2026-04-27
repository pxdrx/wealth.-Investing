// Upgrade sequence — 3 emails over 14 days for Free users with recent
// activity. Single run per user (idempotent via scheduled_emails UNIQUE
// + email_logs lookup at trigger time). Coupon hardcoded UPGRADE30_3M
// (30% off 3 months) per Track B Task 06 plan.

import { addDays } from "date-fns";
import { send } from "../integrations/resend";
import { enqueue } from "../schedulers/queue";
import { canSend } from "../lib/consent";
import { buildUnsubscribeUrl } from "@/lib/email/unsubscribe-token";
import type { Locale, Plan } from "../__mocks__/types";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://owealthinvesting.com";
const COUPON_CODE = "UPGRADE30_3M";
const COUPON_PCT_OFF = 30;
const VALID_DAYS = 14;

export interface ScheduleUpgradeArgs {
  userId: string;
  email: string;
  firstName: string;
  locale?: Locale;
  currentPlan: Plan;
  targetPlan?: Plan;
  startAt?: Date;
}

export interface ScheduleUpgradeResult {
  scheduled: number;
  sent: number;
  skipped: number;
  errors: string[];
}

export async function scheduleUpgrade(
  args: ScheduleUpgradeArgs,
): Promise<ScheduleUpgradeResult> {
  const result: ScheduleUpgradeResult = { scheduled: 0, sent: 0, skipped: 0, errors: [] };

  const consent = await canSend(args.email, "upgrade");
  if (!consent.allowed) {
    result.skipped = 3;
    return result;
  }

  const start = args.startAt ?? new Date();
  const validUntil = addDays(start, VALID_DAYS).toISOString();
  const target: Plan = args.targetPlan ?? "pro";
  const locale: Locale = args.locale ?? "pt-BR";
  const baseProps = {
    firstName: args.firstName,
    locale,
    currentPlan: args.currentPlan,
    targetPlan: target,
    couponCode: COUPON_CODE,
    couponPctOff: COUPON_PCT_OFF,
    validUntil,
    unsubscribeUrl: buildUnsubscribeUrl(args.email),
    pricingUrl: `${APP_URL}/pricing`,
  };

  const steps: {
    day: 0 | 7 | 14;
    template: "upgrade.day0" | "upgrade.day7" | "upgrade.day14";
    sendNow: boolean;
  }[] = [
    { day: 0, template: "upgrade.day0", sendNow: true },
    { day: 7, template: "upgrade.day7", sendNow: false },
    { day: 14, template: "upgrade.day14", sendNow: false },
  ];

  for (const step of steps) {
    if (step.sendNow) {
      const r = await send({
        template: step.template,
        props: baseProps,
        to: args.email,
      });
      if (r.ok) result.sent++;
      else result.errors.push(`day${step.day}: ${r.error ?? "unknown"}`);
      continue;
    }

    const eq = await enqueue({
      template: step.template,
      props: baseProps,
      to: args.email,
      sendAt: addDays(start, step.day),
      userId: args.userId,
    });

    if (!eq.ok) {
      result.errors.push(`day${step.day}: ${eq.reason ?? "enqueue failed"}`);
      continue;
    }
    if (eq.inserted) result.scheduled++;
    else result.skipped++;
  }

  return result;
}
