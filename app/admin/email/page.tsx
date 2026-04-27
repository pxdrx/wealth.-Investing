// Admin email dashboard — last 30d aggregations from email_logs +
// email_events. Server component, gated by ADMIN_DASHBOARD_KEY env var
// passed as ?key=... query param. Internal-only tool; deliberately
// bypasses Supabase session (server components can't easily read it
// without the @supabase/ssr package, which isn't installed here).

import { notFound } from "next/navigation";
import { createServiceRoleClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface LogRow {
  template: string;
  status: string;
  to_email: string;
  resend_id: string | null;
}

interface EventRow {
  event_type: string;
  to_email: string | null;
  bounce_type: string | null;
}

function pct(num: number, den: number): string {
  if (den === 0) return "—";
  return `${((num / den) * 100).toFixed(1)}%`;
}

interface PageProps {
  searchParams: { key?: string };
}

export default async function AdminEmailPage({ searchParams }: PageProps) {
  const expected = process.env.ADMIN_DASHBOARD_KEY;
  if (!expected || searchParams.key !== expected) {
    notFound();
  }

  const sb = createServiceRoleClient();
  const since = new Date(Date.now() - 30 * 86400_000).toISOString();

  const [{ data: logs }, { data: events }] = await Promise.all([
    sb
      .from("email_logs")
      .select("template,status,to_email,resend_id")
      .gte("sent_at", since),
    sb
      .from("email_events")
      .select("event_type,to_email,bounce_type")
      .gte("created_at", since),
  ]);

  const logRows = (logs ?? []) as LogRow[];
  const eventRows = (events ?? []) as EventRow[];

  const totalSent = logRows.filter((r) => r.status === "sent").length;
  const totalFailed = logRows.filter((r) => r.status === "failed").length;

  const opened = eventRows.filter((e) => e.event_type === "email.opened").length;
  const clicked = eventRows.filter((e) => e.event_type === "email.clicked").length;
  const bounced = eventRows.filter((e) => e.event_type === "email.bounced").length;
  const hardBounced = eventRows.filter(
    (e) => e.event_type === "email.bounced" && e.bounce_type === "hard",
  ).length;
  const complained = eventRows.filter(
    (e) => e.event_type === "email.complained",
  ).length;

  const byTemplate = new Map<string, { sent: number; failed: number }>();
  for (const r of logRows) {
    const cur = byTemplate.get(r.template) ?? { sent: 0, failed: 0 };
    if (r.status === "sent") cur.sent++;
    else if (r.status === "failed") cur.failed++;
    byTemplate.set(r.template, cur);
  }

  const bounceCount = new Map<string, number>();
  for (const e of eventRows) {
    if (e.event_type !== "email.bounced" || !e.to_email) continue;
    bounceCount.set(e.to_email, (bounceCount.get(e.to_email) ?? 0) + 1);
  }
  const topBounces = Array.from(bounceCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Email · últimos 30 dias</h1>
      <p className="text-sm text-muted-foreground mt-1">
        Aggregated metrics from email_logs joined with Resend webhook events.
      </p>

      <section className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Stat label="Sent" value={totalSent.toLocaleString("pt-BR")} />
        <Stat label="Failed" value={totalFailed.toLocaleString("pt-BR")} />
        <Stat label="Open rate" value={pct(opened, totalSent)} />
        <Stat label="Click rate" value={pct(clicked, totalSent)} />
        <Stat label="Bounce rate" value={pct(bounced, totalSent)} />
        <Stat label="Hard bounces" value={hardBounced.toString()} />
        <Stat label="Complaints" value={complained.toString()} />
        <Stat label="Templates" value={byTemplate.size.toString()} />
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold tracking-tight mb-3">Por template</h2>
        <div
          className="rounded-[22px] border border-border overflow-hidden"
          style={{ backgroundColor: "hsl(var(--card))" }}
        >
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground tracking-wider border-b border-border">
              <tr>
                <th className="px-4 py-3">Template</th>
                <th className="px-4 py-3 text-right">Sent</th>
                <th className="px-4 py-3 text-right">Failed</th>
                <th className="px-4 py-3 text-right">Failure rate</th>
              </tr>
            </thead>
            <tbody>
              {Array.from(byTemplate.entries())
                .sort((a, b) => b[1].sent - a[1].sent)
                .map(([template, stats]) => {
                  const total = stats.sent + stats.failed;
                  return (
                    <tr key={template} className="border-b border-border last:border-0">
                      <td className="px-4 py-2 font-medium">{template}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{stats.sent}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{stats.failed}</td>
                      <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">
                        {pct(stats.failed, total)}
                      </td>
                    </tr>
                  );
                })}
              {byTemplate.size === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                    Nenhum envio nos últimos 30 dias.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold tracking-tight mb-3">Top 10 bounces</h2>
        <div
          className="rounded-[22px] border border-border overflow-hidden"
          style={{ backgroundColor: "hsl(var(--card))" }}
        >
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground tracking-wider border-b border-border">
              <tr>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3 text-right">Bounces</th>
              </tr>
            </thead>
            <tbody>
              {topBounces.map(([email, count]) => (
                <tr key={email} className="border-b border-border last:border-0">
                  <td className="px-4 py-2 font-mono text-xs">{email}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{count}</td>
                </tr>
              ))}
              {topBounces.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-4 py-8 text-center text-muted-foreground">
                    Sem bounces no período.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-[22px] border border-border p-4"
      style={{ backgroundColor: "hsl(var(--card))" }}
    >
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold tracking-tight mt-1">{value}</div>
    </div>
  );
}
