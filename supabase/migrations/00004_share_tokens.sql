-- Share tokens for public link sharing with role control
alter table public.boards add column share_token text unique;
alter table public.boards add column share_role text not null default 'editor' check (share_role in ('editor', 'viewer'));
