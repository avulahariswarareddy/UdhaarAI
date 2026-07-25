-- =====================================================================
--  UdhaarAI — Storage bucket + policies
--  Run AFTER schema.sql, in the same SQL Editor.
--  The bucket is PRIVATE. Images are served through short-lived signed
--  URLs only, so a leaked path is useless to an attacker.
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('notebooks', 'notebooks', false, 10485760,
        array['image/jpeg','image/png','image/webp','image/heic'])
on conflict (id) do update
  set public = false,
      file_size_limit = 10485760,
      allowed_mime_types = array['image/jpeg','image/png','image/webp','image/heic'];

-- Files live at notebooks/<user-id>/<filename>. The first path segment
-- must equal the caller's uid — that is what stops user A reading
-- user B's notebook pages.
drop policy if exists "notebooks read own"   on storage.objects;
drop policy if exists "notebooks write own"  on storage.objects;
drop policy if exists "notebooks delete own" on storage.objects;

create policy "notebooks read own" on storage.objects
  for select using (
    bucket_id = 'notebooks' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "notebooks write own" on storage.objects
  for insert with check (
    bucket_id = 'notebooks' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "notebooks delete own" on storage.objects
  for delete using (
    bucket_id = 'notebooks' and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------------------
--  Expense bill images live under bills/<user-id>/ in the same bucket.
--  (Re-run of this file is safe — policies are dropped first.)
drop policy if exists "bills read own"  on storage.objects;
drop policy if exists "bills write own" on storage.objects;
create policy "bills read own" on storage.objects
  for select using (bucket_id = 'notebooks' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "bills write own" on storage.objects
  for insert with check (bucket_id = 'notebooks' and (storage.foldername(name))[1] = auth.uid()::text);
