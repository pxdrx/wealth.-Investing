create table if not exists user_feedback (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('bug','erro','sugestao','analise')),
  message text not null check (char_length(message) >= 10),
  user_email text,
  created_at timestamptz default now() not null
);

create index if not exists idx_user_feedback_user_created on user_feedback (user_id, created_at desc);

alter table user_feedback enable row level security;

create policy "Users can insert own feedback"
  on user_feedback for insert
  with check (auth.uid() = user_id);

create policy "Users can read own feedback"
  on user_feedback for select
  using (auth.uid() = user_id);
