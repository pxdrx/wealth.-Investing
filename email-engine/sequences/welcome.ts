// 7-day Welcome sequence (Hybrid: product onboarding D1-3, educational D5-7).
// Day 0 sends immediately. Days 1/2/3/5/6/7 enqueue via scheduled_emails.
// Idempotent: re-running scheduleWelcome for same user is a no-op.

import { addDays } from "date-fns";
import { send } from "../integrations/resend";
import { enqueue } from "../schedulers/queue";
import { canSend } from "../lib/consent";
import { buildUnsubscribeUrl } from "@/lib/email/unsubscribe-token";
import type { Locale, TemplateId } from "../__mocks__/types";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://owealthinvesting.com";
const TRIAL_DAYS = 7;
const COUPON_CODE = "UPGRADE30_3M";
const COUPON_PCT_OFF = 30;

type WelcomeDay = 0 | 1 | 2 | 3 | 5 | 6 | 7;
const SCHEDULE: WelcomeDay[] = [0, 1, 2, 3, 5, 6, 7];

function templateForDay(day: WelcomeDay): TemplateId {
  return `welcome.day${day}` as TemplateId;
}

export interface ScheduleWelcomeArgs {
  userId: string;
  email: string;
  firstName: string;
  locale?: Locale;
  startAt?: Date;
}

export interface ScheduleWelcomeResult {
  scheduled: number;
  sent: number;
  skipped: number;
  errors: string[];
}

export async function scheduleWelcome(
  args: ScheduleWelcomeArgs,
): Promise<ScheduleWelcomeResult> {
  const result: ScheduleWelcomeResult = { scheduled: 0, sent: 0, skipped: 0, errors: [] };

  const consent = await canSend(args.email, "welcome");
  if (!consent.allowed) {
    result.skipped = SCHEDULE.length;
    return result;
  }

  const start = args.startAt ?? new Date();
  const trialEndsAt = addDays(start, TRIAL_DAYS).toISOString();
  const unsubscribeUrl = buildUnsubscribeUrl(args.email);
  const locale: Locale = args.locale ?? "pt-BR";
  const baseProps = {
    firstName: args.firstName,
    locale,
    trialEndsAt,
    unsubscribeUrl,
    appUrl: APP_URL,
  };

  for (const day of SCHEDULE) {
    const sendAt = addDays(start, day);
    const template = templateForDay(day);

    const propsForDay =
      day === 7
        ? { ...baseProps, couponCode: COUPON_CODE, couponPctOff: COUPON_PCT_OFF }
        : baseProps;

    if (day === 0) {
      // Send immediately.
      const r = await send({
        template,
        // Cast: TemplatePropsMap entries for welcome.dayN all extend WelcomeProps.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        props: propsForDay as any,
        to: args.email,
      });
      if (r.ok) result.sent++;
      else {
        result.errors.push(`day0: ${r.error ?? "unknown"}`);
      }
      continue;
    }

    const eq = await enqueue({
      template,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      props: propsForDay as any,
      to: args.email,
      sendAt,
      userId: args.userId,
    });

    if (!eq.ok) {
      result.errors.push(`day${day}: ${eq.reason ?? "enqueue failed"}`);
      continue;
    }
    if (eq.inserted) result.scheduled++;
    else result.skipped++; // already scheduled — idempotent re-run
  }

  return result;
}
