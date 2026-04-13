alter table public.cards
  add column if not exists brand_color text,
  add column if not exists company_logo_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'company-logos',
  'company-logos',
  true,
  4194304,
  array['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Company logos are publicly readable" on storage.objects;
create policy "Company logos are publicly readable"
on storage.objects
for select
to public
using (bucket_id = 'company-logos');
