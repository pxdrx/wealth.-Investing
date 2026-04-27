// Persistent email queue. Backed by scheduled_emails table (Task 02 migration).
// Stub today — real INSERT/SELECT lands in Task 02 alongside the SQL migration.

import type { TemplateId, TemplatePropsMap } from "../__mocks__/types";

export interface EnqueueArgs<T extends TemplateId = TemplateId> {
  template: T;
  props: TemplatePropsMap[T];
  to: string;
  sendAt: Date;
  userId?: string;
}

export async function enqueue<T extends TemplateId>(_args: EnqueueArgs<T>): Promise<void> {
  throw new Error(
    "scheduled_emails queue not implemented yet (lands in Task 02 — Welcome 7d sequence).",
  );
}

export async function dequeueDue(_now: Date = new Date()): Promise<EnqueueArgs[]> {
  throw new Error(
    "scheduled_emails queue not implemented yet (lands in Task 02 — Welcome 7d sequence).",
  );
}
