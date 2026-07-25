create table if not exists public.health_stores (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.health_stores enable row level security;

create policy "Users can read their own health store"
on public.health_stores for select
using (auth.uid() = user_id);

create policy "Users can insert their own health store"
on public.health_stores for insert
with check (auth.uid() = user_id);

create policy "Users can update their own health store"
on public.health_stores for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own health store"
on public.health_stores for delete
using (auth.uid() = user_id);
