alter table public.profiles
  add column if not exists linkedin_url text,
  add column if not exists instagram_url text,
  add column if not exists facebook_url text,
  add column if not exists x_url text,
  add column if not exists profile_photo_path text;

create table if not exists public.cards (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.profiles(id) on delete cascade,
  email text not null,
  full_name text,
  company_name text,
  job_title text,
  phone text,
  website text,
  bio text,
  linkedin_url text,
  instagram_url text,
  facebook_url text,
  x_url text,
  profile_photo_path text,
  slug text not null unique,
  contact_published boolean not null default false,
  contact_headline text,
  wallet_apple_url text,
  wallet_google_url text,
  is_primary boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists cards_account_id_idx on public.cards(account_id);
create unique index if not exists cards_primary_account_idx on public.cards(account_id) where is_primary = true;

drop trigger if exists cards_updated_at on public.cards;
create trigger cards_updated_at
before update on public.cards
for each row execute procedure public.handle_updated_at();

insert into public.cards (
  account_id,
  email,
  full_name,
  company_name,
  job_title,
  phone,
  website,
  bio,
  linkedin_url,
  instagram_url,
  facebook_url,
  x_url,
  profile_photo_path,
  slug,
  contact_published,
  contact_headline,
  wallet_apple_url,
  wallet_google_url,
  is_primary
)
select
  p.id,
  p.email,
  p.full_name,
  p.company_name,
  p.job_title,
  p.phone,
  p.website,
  p.bio,
  p.linkedin_url,
  p.instagram_url,
  p.facebook_url,
  p.x_url,
  p.profile_photo_path,
  p.slug,
  p.contact_published,
  p.contact_headline,
  p.wallet_apple_url,
  p.wallet_google_url,
  true
from public.profiles p
where not exists (
  select 1
  from public.cards c
  where c.account_id = p.id
    and c.is_primary = true
);

alter table public.events add column if not exists card_id uuid references public.cards(id) on delete cascade;
create index if not exists events_card_id_idx on public.events(card_id);

update public.events e
set card_id = c.id
from public.cards c
where e.card_id is null
  and c.account_id = e.owner_id
  and c.is_primary = true;

alter table public.events alter column card_id set not null;
alter table public.events drop constraint if exists events_owner_id_slug_key;
alter table public.events drop constraint if exists events_card_id_slug_key;
alter table public.events add constraint events_card_id_slug_key unique (card_id, slug);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_slug text;
begin
  base_slug := coalesce(
    nullif(new.raw_user_meta_data ->> 'slug', ''),
    'member-' || substring(replace(new.id::text, '-', '') from 1 for 8)
  );

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
    base_slug
  )
  on conflict (id) do nothing;

  insert into public.cards (
    account_id,
    email,
    full_name,
    company_name,
    slug,
    is_primary
  )
  select
    new.id,
    new.email,
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'company_name', ''),
    base_slug,
    true
  where not exists (
    select 1
    from public.cards
    where account_id = new.id
      and is_primary = true
  );

  return new;
end;
$$;

alter table public.cards enable row level security;

drop policy if exists "cards_select_published_or_own" on public.cards;
create policy "cards_select_published_or_own"
on public.cards
for select
using (contact_published = true or account_id = auth.uid());

drop policy if exists "cards_insert_own" on public.cards;
create policy "cards_insert_own"
on public.cards
for insert
with check (account_id = auth.uid());

drop policy if exists "cards_update_own" on public.cards;
create policy "cards_update_own"
on public.cards
for update
using (account_id = auth.uid());

drop policy if exists "cards_delete_own" on public.cards;
create policy "cards_delete_own"
on public.cards
for delete
using (account_id = auth.uid());
