-- Enable UUID extension for unique identifiers
create extension if not exists "uuid-ossp";

-- 1. Admin Users Table (tracks which users are admins)
create table if not exists public.admin_users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text default 'admin',
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

-- 2. Categories Table
create table if not exists public.categories (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

-- 3. Menu Items Table (single global menu)
create table if not exists public.menu_items (
  id uuid primary key default uuid_generate_v4(),
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  description text default 'classic description',
  price numeric not null,
  image_url text,
  available boolean default true,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.admin_users enable row level security;
alter table public.categories enable row level security;
alter table public.menu_items enable row level security;

-- Create a function to check if current user is admin
create or replace function public.is_admin()
returns boolean as $$
begin
  return exists(
    select 1 from public.admin_users 
    where id = auth.uid()
  );
end;
$$ language plpgsql security definer;

-- Admin Users: Admins can view and manage admin users
do $$
begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='admin_users') then
    execute 'drop policy if exists "Admins can view admin users" on public.admin_users';
    execute 'drop policy if exists "Admins can insert admin users" on public.admin_users';
    execute 'drop policy if exists "Admins can update admin users" on public.admin_users';
    execute 'drop policy if exists "Admins can delete admin users" on public.admin_users';
  end if;
end;
$$;

create policy "Admins can view admin users" on public.admin_users for select using ( public.is_admin() );
create policy "Admins can insert admin users" on public.admin_users for insert with check ( public.is_admin() );
create policy "Admins can update admin users" on public.admin_users for update using ( public.is_admin() );
create policy "Admins can delete admin users" on public.admin_users for delete using ( public.is_admin() );

-- Categories: Public read, Admin CRUD only
do $$
begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='categories') then
    execute 'drop policy if exists "Categories are viewable by everyone" on public.categories';
    execute 'drop policy if exists "Admins can insert categories" on public.categories';
    execute 'drop policy if exists "Admins can update categories" on public.categories';
    execute 'drop policy if exists "Admins can delete categories" on public.categories';
  end if;
end;
$$;

create policy "Categories are viewable by everyone" on public.categories for select using ( true );
create policy "Admins can insert categories" on public.categories for insert with check ( public.is_admin() );
create policy "Admins can update categories" on public.categories for update using ( public.is_admin() );
create policy "Admins can delete categories" on public.categories for delete using ( public.is_admin() );

-- Menu Items: Public read, Admin CRUD only
do $$
begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='menu_items') then
    execute 'drop policy if exists "Menu items are viewable by everyone" on public.menu_items';
    execute 'drop policy if exists "Admins can insert menu items" on public.menu_items';
    execute 'drop policy if exists "Admins can update menu items" on public.menu_items';
    execute 'drop policy if exists "Admins can delete menu items" on public.menu_items';
  end if;
end;
$$;

create policy "Menu items are viewable by everyone" on public.menu_items for select using ( true );
create policy "Admins can insert menu items" on public.menu_items for insert with check ( public.is_admin() );
create policy "Admins can update menu items" on public.menu_items for update using ( public.is_admin() );
create policy "Admins can delete menu items" on public.menu_items for delete using ( public.is_admin() );

-- Grant execute permission on is_admin function to all users
grant execute on function public.is_admin() to anon, authenticated, public;