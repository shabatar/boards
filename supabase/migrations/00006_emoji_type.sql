-- Allow 'emoji' as a board_item type. Emoji items render a single large
-- glyph (or short emoji string) with no padding or background.
alter table public.board_items drop constraint board_items_type_check;
alter table public.board_items add constraint board_items_type_check
  check (type in ('note', 'text', 'rect', 'arrow', 'triangle', 'circle', 'freehand', 'emoji'));
