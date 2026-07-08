-- Escrow fee/tax breakdown + full dispute flow (mirrors live migration escrow_fees_and_disputes)
alter table public.escrows add column if not exists fee_cents integer not null default 0;
alter table public.escrows add column if not exists tax_cents integer not null default 0;
insert into platform_settings (category, key, value) values ('payments', 'platform_fee_percent', '10'::jsonb) on conflict (key) do nothing;
insert into platform_settings (category, key, value) values ('payments', 'tax_percent', '0'::jsonb) on conflict (key) do nothing;
-- release_escrow pays base amount (total - fee - tax), blocked while disputed;
-- open_dispute / add_dispute_evidence / resolve_dispute manage the dispute lifecycle.
-- See the applied migration in Supabase for full function bodies (kept in sync).
