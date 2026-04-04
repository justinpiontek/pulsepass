create extension if not exists pgcrypto;

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  company_name text,
  job_title text,
  phone text,
  website text,
  bio text,
  slug text not null unique,
  contact_published boolean not null default false,
  contact_headline text,
  wallet_apple_url text,
  wallet_google_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  slug text not null,
  title text not null,
  summary text,
  location text,
  starts_at timestamptz,
  ends_at timestamptz,
  timezone text default 'America/Chicago',
  rsvp_enabled boolean not null default true,
  capacity integer,
  published boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (owner_id, slug)
);

create table if not exists public.rsvps (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  guest_name text not null,
  guest_email text not null,
  guest_count integer not null default 1,
  status text not null default 'going',
  created_at timestamptz not null default timezone('utc', now()),
  unique (event_id, guest_email)
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  plan text not null default 'starter',
  status text not null default 'inactive',
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  admin_profile_id uuid not null references public.profiles(id) on delete cascade,
  seat_count integer not null default 0,
  brand_color text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member',
  department text,
  created_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, profile_id)
);

create table if not exists public.enterprise_leads (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  work_email text not null,
  company_name text not null,
  employee_count integer,
  notes text,
  status text not null default 'new',
  created_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
before update on public.profiles
for each row execute procedure public.handle_updated_at();

drop trigger if exists events_updated_at on public.events;
create trigger events_updated_at
before update on public.events
for each row execute procedure public.handle_updated_at();

drop trigger if exists subscriptions_updated_at on public.subscriptions;
create trigger subscriptions_updated_at
before update on public.subscriptions
for each row execute procedure public.handle_updated_at();

drop trigger if exists organizations_updated_at on public.organizations;
create trigger organizations_updated_at
before update on public.organizations
for each row execute procedure public.handle_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    email,
    full_name,
    company_name,
    slug
  )
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'company_name', ''),
    coalesce(
      nullif(new.raw_user_meta_data ->> 'slug', ''),
      'member-' || substring(replace(new.id::text, '-', '') from 1 for 8)
    )
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.rsvps enable row level security;
alter table public.subscriptions enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.enterprise_leads enable row level security;

create policy "profiles_select_published_or_own"
on public.profiles
for select
using (contact_published = true or auth.uid() = id);

create policy "profiles_update_own"
on public.profiles
for update
using (auth.uid() = id);

create policy "profiles_insert_own"
on public.profiles
for insert
with check (auth.uid() = id);

create policy "events_select_published_or_own"
on public.events
for select
using (published = true or owner_id = auth.uid());

create policy "events_insert_own"
on public.events
for insert
with check (owner_id = auth.uid());

create policy "events_update_own"
on public.events
for update
using (owner_id = auth.uid());

create policy "events_delete_own"
on public.events
for delete
using (owner_id = auth.uid());

create policy "rsvps_select_event_owner"
on public.rsvps
for select
using (
  exists (
    select 1
    from public.events
    where public.events.id = public.rsvps.event_id
      and public.events.owner_id = auth.uid()
  )
);

create policy "subscriptions_select_own"
on public.subscriptions
for select
using (profile_id = auth.uid());

create policy "organizations_select_admin"
on public.organizations
for select
using (admin_profile_id = auth.uid());

create policy "organizations_insert_admin"
on public.organizations
for insert
with check (admin_profile_id = auth.uid());

create policy "organizations_update_admin"
on public.organizations
for update
using (admin_profile_id = auth.uid());

create policy "organization_members_select_owner_or_member"
on public.organization_members
for select
using (
  profile_id = auth.uid()
  or exists (
    select 1
    from public.organizations
    where public.organizations.id = public.organization_members.organization_id
      and public.organizations.admin_profile_id = auth.uid()
  )
);

create policy "organization_members_manage_admin"
on public.organization_members
for all
using (
  exists (
    select 1
    from public.organizations
    where public.organizations.id = public.organization_members.organization_id
      and public.organizations.admin_profile_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.organizations
    where public.organizations.id = public.organization_members.organization_id
      and public.organizations.admin_profile_id = auth.uid()
  )
);
