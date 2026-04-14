-- Persist smart alert dismissals server-side so they survive across browsers/devices,
-- but reappear when the underlying problem recurs (new signature).

create table smart_alert_dismissals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  alert_id text not null,
  alert_signature text not null,
  dismissed_at timestamptz not null default now(),
  unique (user_id, alert_id, alert_signature)
);

create index on smart_alert_dismissals (user_id, dismissed_at desc);

alter table smart_alert_dismissals enable row level security;

create policy "own rows" on smart_alert_dismissals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
