-- Schema version: current as of 2026-05-02. Run this only on a fresh database.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.items (
  tsid uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  category text not null,
  condition text not null,
  buy_price numeric(12, 2) not null check (buy_price >= 0),
  sell_price numeric(12, 2) check (sell_price is null or sell_price >= 0),
  buy_platform text,
  sell_platform text,
  status text not null default 'holding' check (status in ('holding', 'listed', 'sold', 'keeper')),
  bought_at timestamptz not null,
  sold_at timestamptz,
  notes text,
  bundle_id uuid references public.items (tsid) on delete set null,
  is_bundle_parent boolean default false,
  created_at timestamptz not null default now()
);

alter table public.items enable row level security;

create index if not exists items_user_id_idx on public.items (user_id);
create index if not exists items_bundle_id_idx on public.items (bundle_id);
-- Ensure bundle children belong to the same user as their parent
create or replace function public.check_bundle_user_match()
returns trigger as $$
begin
  if new.bundle_id is not null then
    if not exists (
      select 1 from public.items
      where tsid = new.bundle_id
      and user_id = new.user_id
    ) then
      raise exception 'Bundle parent must belong to the same user';
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists enforce_bundle_user_match on public.items;
create trigger enforce_bundle_user_match
  before insert or update on public.items
  for each row execute function public.check_bundle_user_match();

drop policy if exists "Users can select their own items" on public.items;
create policy "Users can select their own items"
on public.items
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their own items" on public.items;
create policy "Users can insert their own items"
on public.items
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own items" on public.items;
create policy "Users can update their own items"
on public.items
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own items" on public.items;
create policy "Users can delete their own items"
on public.items
for delete
to authenticated
using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.items to authenticated;

create table if not exists public.item_files (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items (tsid) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  file_path text not null,
  file_type text not null,
  original_name text,
  mime_type text,
  size_bytes integer,
  created_at timestamptz not null default now()
);

alter table public.item_files enable row level security;

create index if not exists item_files_item_id_idx on public.item_files (item_id);
create index if not exists item_files_user_id_idx on public.item_files (user_id);

alter table public.items
add column if not exists cover_image_id uuid references public.item_files (id) on delete set null;

create index if not exists items_cover_image_id_idx on public.items (cover_image_id);

drop policy if exists "Users can select their own files" on public.item_files;
create policy "Users can select their own files"
on public.item_files
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their own files" on public.item_files;
create policy "Users can insert their own files"
on public.item_files
for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.items as i
    where i.tsid = public.item_files.item_id
      and i.user_id = public.item_files.user_id
  )
);

drop policy if exists "Users can delete their own files" on public.item_files;
create policy "Users can delete their own files"
on public.item_files
for delete
to authenticated
using ((select auth.uid()) = user_id);

grant select, insert, delete on public.item_files to authenticated;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text,
  avatar_url text,
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
on public.profiles
for insert
to authenticated
with check ((select auth.uid()) = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

-- Grant table privileges (RLS policies alone are not sufficient)
grant select, insert, update on public.profiles to authenticated;

insert into storage.buckets (id, name, public)
values ('item-files', 'item-files', false)
on conflict (id) do update
set public = false;

drop policy if exists "Users can select their own item file objects" on storage.objects;
create policy "Users can select their own item file objects"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'item-files'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists "Users can upload their own item file objects" on storage.objects;
create policy "Users can upload their own item file objects"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'item-files'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists "Users can delete their own item file objects" on storage.objects;
create policy "Users can delete their own item file objects"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'item-files'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update
set public = true;

drop policy if exists "Avatar upload policy" on storage.objects;
create policy "Avatar upload policy"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and name like (select auth.uid()::text) || '/%'
);

drop policy if exists "Avatar update policy" on storage.objects;
create policy "Avatar update policy"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'avatars'
  and name like (select auth.uid()::text) || '/%'
)
with check (
  bucket_id = 'avatars'
  and name like (select auth.uid()::text) || '/%'
);

drop policy if exists "Avatar public read policy" on storage.objects;
create policy "Avatar public read policy"
on storage.objects
for select
to public
using (bucket_id = 'avatars');
