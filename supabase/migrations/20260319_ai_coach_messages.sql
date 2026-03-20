-- AI Coach chat history persistence
-- Each row = one message (user or assistant) in a conversation

create table if not exists ai_coach_messages (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz default now() not null
);

-- Index for fast loading of user's chat history
create index if not exists idx_ai_coach_messages_user_created
  on ai_coach_messages (user_id, created_at asc);

-- RLS
alter table ai_coach_messages enable row level security;

create policy "Users can read own messages"
  on ai_coach_messages for select
  using (auth.uid() = user_id);

create policy "Users can insert own messages"
  on ai_coach_messages for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own messages"
  on ai_coach_messages for delete
  using (auth.uid() = user_id);
