-- Expand item types: add rect and arrow
alter table public.board_items drop constraint board_items_type_check;
alter table public.board_items add constraint board_items_type_check
  check (type in ('note', 'text', 'rect', 'arrow'));

-- Text properties
alter table public.board_items add column font_size integer not null default 14;
alter table public.board_items add column font_family text not null default 'sans';

-- Shape properties
alter table public.board_items add column stroke_color text not null default '#18181b';
alter table public.board_items add column stroke_width double precision not null default 2;

-- Arrow endpoints as JSONB array of {x, y} points relative to item origin
alter table public.board_items add column points jsonb;
