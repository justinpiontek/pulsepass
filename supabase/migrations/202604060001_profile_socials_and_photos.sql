alter table public.profiles
  add column if not exists linkedin_url text,
  add column if not exists instagram_url text,
  add column if not exists facebook_url text,
  add column if not exists x_url text,
  add column if not exists profile_photo_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-photos',
  'profile-photos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Profile photos are publicly readable" on storage.objects;
create policy "Profile photos are publicly readable"
on storage.objects
for select
to public
using (bucket_id = 'profile-photos');
