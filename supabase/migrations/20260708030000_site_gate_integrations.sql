-- Coming-soon gate + integrations public read (mirrors live)
drop policy if exists "platform_settings_site_public_read" on public.platform_settings;
create policy "platform_settings_site_public_read" on public.platform_settings
  for select using (category = 'site');
insert into platform_settings (category, key, value) values ('site', 'coming_soon_enabled', 'true'::jsonb) on conflict (key) do nothing;
-- default tester password: servicehub2026 (change in admin panel)
insert into platform_settings (category, key, value) values ('site', 'site_password_hash', to_jsonb('5df26673d4b94d62f67c620289b6480f80e9044d1b0a49c8e19f7d7a217006db'::text)) on conflict (key) do nothing;
