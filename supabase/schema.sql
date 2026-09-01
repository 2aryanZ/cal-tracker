-- ==============================================================================
-- CAL TRACKER DATABASE SCHEMA (Supabase PostgreSQL)
-- ==============================================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. USER PROFILES TABLE
create table if not exists public.user_profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  full_name text,
  age integer default 25,
  gender text default 'male',
  height_cm numeric default 175,
  weight_kg numeric default 70,
  activity_level text default 'moderate',
  goal text default 'maintain',
  target_weight_kg numeric default 70,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. MACRO TARGETS TABLE
create table if not exists public.macro_targets (
  user_id uuid references auth.users on delete cascade primary key,
  calories integer default 2200,
  protein integer default 150,
  carbs integer default 220,
  fats integer default 65,
  water_ml integer default 2000,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. FOOD ENTRIES TABLE
create table if not exists public.food_entries (
  id text primary key,
  user_id uuid references auth.users on delete cascade,
  name text not null,
  meal_type text not null,
  calories integer not null default 0,
  protein numeric not null default 0,
  carbs numeric not null default 0,
  fats numeric not null default 0,
  portion_size text default '1 serving',
  image_uri text,
  date_str text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. WEIGHT LOGS TABLE
create table if not exists public.weight_logs (
  id text primary key,
  user_id uuid references auth.users on delete cascade,
  weight numeric not null,
  date_str text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. DAILY WATER LOGS TABLE
create table if not exists public.water_logs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade,
  date_str text not null,
  water_ml integer not null default 0,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint unique_user_water_date unique (user_id, date_str)
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

alter table public.user_profiles enable row level security;
alter table public.macro_targets enable row level security;
alter table public.food_entries enable row level security;
alter table public.weight_logs enable row level security;
alter table public.water_logs enable row level security;

-- Profiles: Users can view and update their own profile
create policy "Users can view own profile"
  on public.user_profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.user_profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.user_profiles for insert
  with check (auth.uid() = id);

-- Macro Targets: Users can manage their targets
create policy "Users can view own targets"
  on public.macro_targets for select
  using (auth.uid() = user_id);

create policy "Users can manage own targets"
  on public.macro_targets for all
  using (auth.uid() = user_id);

-- Food Entries: Users can manage their own food entries
create policy "Users can view own food entries"
  on public.food_entries for select
  using (auth.uid() = user_id);

create policy "Users can insert own food entries"
  on public.food_entries for insert
  with check (auth.uid() = user_id);

create policy "Users can update own food entries"
  on public.food_entries for update
  using (auth.uid() = user_id);

create policy "Users can delete own food entries"
  on public.food_entries for delete
  using (auth.uid() = user_id);

-- Weight Logs: Users can manage their own weight logs
create policy "Users can manage own weight logs"
  on public.weight_logs for all
  using (auth.uid() = user_id);

-- Water Logs: Users can manage their own water logs
create policy "Users can manage own water logs"
  on public.water_logs for all
  using (auth.uid() = user_id);
