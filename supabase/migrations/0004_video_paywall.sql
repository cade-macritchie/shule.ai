-- Free preview video for every major finding; full guide renders and unlocks after payment.
alter table engagements alter column video_policy set default 'major';   -- policy now = which findings get a free preview
alter table videos add column preview_path text;
alter table videos add column preview_vtt_path text;
alter table videos add column stripe_session_id text;
alter table videos add column paid_at timestamptz;
alter table videos drop constraint videos_status_check;
alter table videos add constraint videos_status_check check (status in
  ('queued','storyboard','tts','rendering','checking','preview_ready','paid','ready','failed'));

-- Clients may read frames and PREVIEW files directly; full guides only through the API (which checks payment).
drop policy if exists "client reads own videos" on storage.objects;
create policy "client reads frames and previews" on storage.objects for select using (
  is_member(((storage.foldername(name))[1])::uuid)
  and (bucket_id = 'frames' or (bucket_id = 'videos' and storage.filename(name) like 'preview.%'))
);
