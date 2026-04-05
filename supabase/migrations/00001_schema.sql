-- ============================================================
-- Boards schema
-- ============================================================

-- 1. Profiles (mirrors auth.users)
-- ============================================================
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text not null,
  display_name text,
  avatar_url   text,
  created_at   timestamptz not null default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2. Boards
-- ============================================================
create table public.boards (
  id         uuid primary key default gen_random_uuid(),
  title      text not null default 'Untitled Board',
  owner_id   uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Board members (sharing)
-- ============================================================
create table public.board_members (
  board_id   uuid not null references public.boards(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  role       text not null default 'editor' check (role in ('editor', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (board_id, user_id)
);

-- 4. Board items (notes, text, future shapes)
-- ============================================================
create table public.board_items (
  id         uuid primary key default gen_random_uuid(),
  board_id   uuid not null references public.boards(id) on delete cascade,
  type       text not null check (type in ('note', 'text')),
  x          double precision not null default 0,
  y          double precision not null default 0,
  width      double precision not null default 200,
  height     double precision not null default 200,
  content    text not null default '',
  color      text not null default '#fef08a',
  z_index    integer not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- Indexes
-- ============================================================
create index idx_boards_owner       on public.boards(owner_id);
create index idx_board_members_user on public.board_members(user_id);
create index idx_board_items_board  on public.board_items(board_id);

-- ============================================================
-- Auto-update updated_at
-- ============================================================
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_boards_updated_at
  before update on public.boards
  for each row execute function public.set_updated_at();

create trigger set_board_items_updated_at
  before update on public.board_items
  for each row execute function public.set_updated_at();

-- ============================================================
-- Helper: returns board IDs a user can access
-- Used by RLS policies to avoid repeated subqueries
-- ============================================================
create or replace function public.accessible_board_ids(uid uuid)
returns setof uuid as $$
  select id from public.boards where owner_id = uid
  union
  select board_id from public.board_members where user_id = uid
$$ language sql stable security definer;

-- ============================================================
-- RLS
-- ============================================================
alter table public.profiles      enable row level security;
alter table public.boards        enable row level security;
alter table public.board_members enable row level security;
alter table public.board_items   enable row level security;

-- Profiles ----
create policy "profiles_select"
  on public.profiles for select
  to authenticated using (true);

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated using (id = auth.uid());

-- Boards ----
create policy "boards_select"
  on public.boards for select
  to authenticated
  using (id in (select public.accessible_board_ids(auth.uid())));

create policy "boards_insert"
  on public.boards for insert
  to authenticated
  with check (owner_id = auth.uid());

create policy "boards_update"
  on public.boards for update
  to authenticated
  using (owner_id = auth.uid());

create policy "boards_delete"
  on public.boards for delete
  to authenticated
  using (owner_id = auth.uid());

-- Board members ----
create policy "members_select"
  on public.board_members for select
  to authenticated
  using (board_id in (select public.accessible_board_ids(auth.uid())));

create policy "members_insert"
  on public.board_members for insert
  to authenticated
  with check (
    board_id in (select id from public.boards where owner_id = auth.uid())
  );

create policy "members_delete"
  on public.board_members for delete
  to authenticated
  using (
    board_id in (select id from public.boards where owner_id = auth.uid())
  );

-- Board items ----
create policy "items_select"
  on public.board_items for select
  to authenticated
  using (board_id in (select public.accessible_board_ids(auth.uid())));

create policy "items_insert"
  on public.board_items for insert
  to authenticated
  with check (board_id in (select public.accessible_board_ids(auth.uid())));

create policy "items_update"
  on public.board_items for update
  to authenticated
  using (board_id in (select public.accessible_board_ids(auth.uid())));

create policy "items_delete"
  on public.board_items for delete
  to authenticated
  using (board_id in (select public.accessible_board_ids(auth.uid())));

-- ============================================================
-- Realtime
-- ============================================================
alter publication supabase_realtime add table public.board_items;
