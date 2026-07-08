alter table public.ratings add column if not exists photos text[] not null default '{}';
insert into storage.buckets (id, name, public) values ('review-photos', 'review-photos', true) on conflict (id) do nothing;
drop policy if exists "review photos owner upload" on storage.objects;
create policy "review photos owner upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'review-photos' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "review photos owner delete" on storage.objects;
create policy "review photos owner delete" on storage.objects for delete to authenticated
  using (bucket_id = 'review-photos' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "review photos public read" on storage.objects;
create policy "review photos public read" on storage.objects for select using (bucket_id = 'review-photos');
