alter table public.items
add column if not exists cover_image_id uuid references public.item_files (id) on delete set null;

create index if not exists items_cover_image_id_idx on public.items (cover_image_id);
