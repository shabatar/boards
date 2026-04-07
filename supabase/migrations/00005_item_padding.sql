-- Per-item text padding (in board pixels). Notes/text/shapes use this
-- to control the inset of their text content. Default 12 matches the
-- previous hard-coded p-3.
alter table public.board_items
  add column padding integer not null default 12;
