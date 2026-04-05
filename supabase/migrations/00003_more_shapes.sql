-- Add triangle, circle, freehand item types
alter table public.board_items drop constraint board_items_type_check;
alter table public.board_items add constraint board_items_type_check
  check (type in ('note', 'text', 'rect', 'arrow', 'triangle', 'circle', 'freehand'));
