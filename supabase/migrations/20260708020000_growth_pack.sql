-- Escrow flow, verified badge, job alerts, referral program, telegram linking
-- (mirrors migration applied to live DB: growth_pack_escrow_alerts_referrals_telegram + integrations_settings)
alter type escrow_status add value if not exists 'pending';

create or replace function public.release_escrow(_job_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare e escrows%rowtype; j jobs%rowtype;
begin
  select * into j from jobs where id = _job_id;
  if not found then return jsonb_build_object('error','job_not_found'); end if;
  if j.client_id <> auth.uid() then return jsonb_build_object('error','not_job_client'); end if;
  select * into e from escrows where job_id = _job_id and status = 'held' for update;
  if not found then return jsonb_build_object('error','no_held_escrow'); end if;
  update escrows set status = 'released', updated_at = now() where id = e.id;
  insert into wallets (pro_id, balance_cents) values (e.pro_id, e.amount_cents)
  on conflict (pro_id) do update set balance_cents = wallets.balance_cents + excluded.balance_cents, updated_at = now();
  insert into notifications (user_id, type, title, title_ro, message, message_ro, data)
  values (e.pro_id, 'escrow_released', 'Оплата зачислена', 'Plata a fost creditată',
    'Клиент принял работу — средства зачислены на ваш баланс.',
    'Clientul a acceptat lucrarea — fondurile au fost creditate în contul dvs.',
    jsonb_build_object('job_id', _job_id, 'amount_cents', e.amount_cents));
  return jsonb_build_object('success', true, 'amount_cents', e.amount_cents);
end $$;
grant execute on function public.release_escrow(uuid) to authenticated;

alter table public.escrows enable row level security;
drop policy if exists "escrow participants read" on public.escrows;
create policy "escrow participants read" on public.escrows for select using (auth.uid() = client_id or auth.uid() = pro_id);
alter table public.wallets enable row level security;
drop policy if exists "wallet owner read" on public.wallets;
create policy "wallet owner read" on public.wallets for select using (auth.uid() = pro_id);

create or replace view public.verified_users as select distinct user_id from kyc_documents where status = 'approved';
grant select on public.verified_users to anon, authenticated;

create table if not exists public.job_alerts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  category_ids uuid[] not null default '{}',
  city text, min_budget_cents integer, enabled boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.job_alerts enable row level security;
drop policy if exists "job alerts owner" on public.job_alerts;
create policy "job alerts owner" on public.job_alerts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.notify_job_alert_subscribers()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into notifications (user_id, type, title, title_ro, message, message_ro, data)
  select a.user_id, 'job_alert', 'Новый заказ по вашей подписке', 'Comandă nouă conform abonamentului dvs.',
    new.title, new.title, jsonb_build_object('job_id', new.id, 'category_id', new.category_id)
  from job_alerts a
  where a.enabled and a.user_id <> new.client_id
    and (cardinality(a.category_ids) = 0 or new.category_id = any(a.category_ids))
    and (a.city is null or a.city = '' or coalesce(new.location_address,'') ilike '%' || a.city || '%')
    and (a.min_budget_cents is null or coalesce(new.budget_max_cents, new.budget_min_cents, 0) >= a.min_budget_cents);
  return new;
end $$;
drop trigger if exists trg_job_alerts on public.jobs;
create trigger trg_job_alerts after insert on public.jobs for each row execute function public.notify_job_alert_subscribers();

create table if not exists public.referral_codes (
  user_id uuid primary key references auth.users(id) on delete cascade,
  code text unique not null, created_at timestamptz not null default now()
);
alter table public.referral_codes enable row level security;
drop policy if exists "referral code owner read" on public.referral_codes;
create policy "referral code owner read" on public.referral_codes for select using (auth.uid() = user_id);

create or replace function public.get_or_create_referral_code()
returns text language plpgsql security definer set search_path = public as $$
declare c text;
begin
  select code into c from referral_codes where user_id = auth.uid();
  if found then return c; end if;
  loop
    c := upper(substr(md5(gen_random_uuid()::text), 1, 8));
    begin
      insert into referral_codes (user_id, code) values (auth.uid(), c);
      return c;
    exception when unique_violation then null;
    end;
  end loop;
end $$;
grant execute on function public.get_or_create_referral_code() to authenticated;

create or replace function public.apply_referral_code(_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare ref_user uuid;
begin
  select user_id into ref_user from referral_codes where code = upper(trim(_code));
  if not found then return jsonb_build_object('error','invalid_code'); end if;
  if ref_user = auth.uid() then return jsonb_build_object('error','self_referral'); end if;
  if exists (select 1 from referrals where referred_id = auth.uid()) then return jsonb_build_object('error','already_referred'); end if;
  insert into referrals (referrer_id, referred_id, status, bonus_cents) values (ref_user, auth.uid(), 'pending', 0);
  insert into notifications (user_id, type, title, title_ro, message, message_ro, data)
  values (ref_user, 'referral', 'По вашей ссылке зарегистрировался новый пользователь', 'Un utilizator nou s-a înregistrat prin linkul dvs.',
    'Бонус будет начислен после первого выполненного заказа.', 'Bonusul va fi acordat după prima comandă finalizată.',
    jsonb_build_object('referred_id', auth.uid()));
  return jsonb_build_object('success', true);
end $$;
grant execute on function public.apply_referral_code(text) to authenticated;

alter table public.referrals enable row level security;
drop policy if exists "referrals participant read" on public.referrals;
create policy "referrals participant read" on public.referrals for select using (auth.uid() = referrer_id or auth.uid() = referred_id);

create table if not exists public.user_telegram (
  user_id uuid primary key references auth.users(id) on delete cascade,
  chat_id text not null, username text, linked_at timestamptz not null default now()
);
alter table public.user_telegram enable row level security;
drop policy if exists "telegram owner" on public.user_telegram;
create policy "telegram owner" on public.user_telegram for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.telegram_link_tokens (
  token text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.telegram_link_tokens enable row level security;

create or replace function public.create_telegram_link_token()
returns text language plpgsql security definer set search_path = public as $$
declare tkn text := replace(gen_random_uuid()::text, '-', '');
begin
  delete from telegram_link_tokens where user_id = auth.uid() or created_at < now() - interval '1 hour';
  insert into telegram_link_tokens (token, user_id) values (tkn, auth.uid());
  return tkn;
end $$;
grant execute on function public.create_telegram_link_token() to authenticated;

insert into platform_settings (category, key, value) values ('telegram', 'telegram_bot_username', '""'::jsonb) on conflict (key) do nothing;

-- Integrations (public browser keys)
drop policy if exists "platform_settings_integrations_public_read" on public.platform_settings;
create policy "platform_settings_integrations_public_read" on public.platform_settings
  for select using (category in ('integrations','telegram'));
