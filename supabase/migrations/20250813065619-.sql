-- Admin core tables and RLS (after enum committed)
create table if not exists public.audit_log (
  id bigserial primary key,
  actor_id uuid not null,
  action text not null,
  entity text not null,
  entity_id text not null,
  before jsonb,
  after jsonb,
  created_at timestamptz default now()
);
alter table public.audit_log enable row level security;
DROP POLICY IF EXISTS audit_log_select_admins ON public.audit_log;
CREATE POLICY audit_log_select_admins ON public.audit_log
  FOR SELECT USING (
    has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role) OR has_role(auth.uid(), 'ops'::app_role) OR has_role(auth.uid(), 'tender'::app_role) OR has_role(auth.uid(), 'finance'::app_role) OR has_role(auth.uid(), 'risk'::app_role) OR has_role(auth.uid(), 'content'::app_role) OR has_role(auth.uid(), 'kyc'::app_role) OR has_role(auth.uid(), 'dispute_manager'::app_role) OR has_role(auth.uid(), 'city_manager'::app_role)
  );
DROP POLICY IF EXISTS audit_log_insert_service_admin ON public.audit_log;
CREATE POLICY audit_log_insert_service_admin ON public.audit_log
  FOR INSERT WITH CHECK (
    auth.role() = 'service_role'::text OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)
  );

create table if not exists public.moderation_queue (
  id bigserial primary key,
  entity_type text not null,
  entity_id text not null,
  reason text,
  status text check (status in ('new','in_review','resolved','rejected')) default 'new',
  assigned_to uuid,
  created_at timestamptz default now()
);
alter table public.moderation_queue enable row level security;
DROP POLICY IF EXISTS moderation_select ON public.moderation_queue;
CREATE POLICY moderation_select ON public.moderation_queue
  FOR SELECT USING (
    has_role(auth.uid(), 'content'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)
  );
DROP POLICY IF EXISTS moderation_cud ON public.moderation_queue;
CREATE POLICY moderation_cud ON public.moderation_queue
  FOR ALL USING (
    has_role(auth.uid(), 'content'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)
  ) WITH CHECK (
    has_role(auth.uid(), 'content'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)
  );

create table if not exists public.dispute_cases (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null,
  claimant uuid not null,
  status text check (status in ('open','in_review','resolved','rejected')) default 'open',
  resolution text,
  refund_cents integer default 0,
  penalty_cents integer default 0,
  evidence jsonb,
  assigned_to uuid,
  sla_due_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.dispute_cases enable row level security;
DROP POLICY IF EXISTS dispute_select ON public.dispute_cases;
CREATE POLICY dispute_select ON public.dispute_cases
  FOR SELECT USING (
    has_role(auth.uid(), 'dispute_manager'::app_role) OR has_role(auth.uid(), 'ops'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)
  );
DROP POLICY IF EXISTS dispute_cu ON public.dispute_cases;
CREATE POLICY dispute_cu ON public.dispute_cases
  FOR INSERT WITH CHECK (
    has_role(auth.uid(), 'dispute_manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)
  );
DROP POLICY IF EXISTS dispute_upd ON public.dispute_cases;
CREATE POLICY dispute_upd ON public.dispute_cases
  FOR UPDATE USING (
    has_role(auth.uid(), 'dispute_manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)
  ) WITH CHECK (
    has_role(auth.uid(), 'dispute_manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)
  );
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_dispute_cases_updated_at') THEN
    EXECUTE 'drop trigger set_dispute_cases_updated_at on public.dispute_cases';
  END IF;
END $$;
CREATE TRIGGER set_dispute_cases_updated_at
BEFORE UPDATE ON public.dispute_cases
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

create table if not exists public.payouts (
  id uuid primary key default gen_random_uuid(),
  pro_id uuid not null,
  amount_cents integer not null,
  method text,
  status text check (status in ('pending','approved','rejected','paid')) default 'pending',
  initiated_at timestamptz default now(),
  settled_at timestamptz
);
alter table public.payouts enable row level security;
DROP POLICY IF EXISTS payouts_select ON public.payouts;
CREATE POLICY payouts_select ON public.payouts
  FOR SELECT USING (
    has_role(auth.uid(), 'finance'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)
  );
DROP POLICY IF EXISTS payouts_cu ON public.payouts;
CREATE POLICY payouts_cu ON public.payouts
  FOR INSERT WITH CHECK (
    has_role(auth.uid(), 'finance'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)
  );
DROP POLICY IF EXISTS payouts_upd ON public.payouts;
CREATE POLICY payouts_upd ON public.payouts
  FOR UPDATE USING (
    has_role(auth.uid(), 'finance'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)
  ) WITH CHECK (
    has_role(auth.uid(), 'finance'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)
  );

create table if not exists public.commission_rules (
  id uuid primary key default gen_random_uuid(),
  city text,
  category_id uuid,
  pct numeric not null default 0.1,
  min_fee_cents integer not null default 0,
  night_coef numeric not null default 1.0,
  active boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.commission_rules enable row level security;
DROP POLICY IF EXISTS commission_select ON public.commission_rules;
CREATE POLICY commission_select ON public.commission_rules
  FOR SELECT USING (
    has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role) OR has_role(auth.uid(), 'city_manager'::app_role) OR has_role(auth.uid(), 'finance'::app_role) OR has_role(auth.uid(), 'ops'::app_role)
  );
DROP POLICY IF EXISTS commission_cu ON public.commission_rules;
CREATE POLICY commission_cu ON public.commission_rules
  FOR INSERT WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role) OR has_role(auth.uid(), 'city_manager'::app_role) OR has_role(auth.uid(), 'finance'::app_role)
  );
DROP POLICY IF EXISTS commission_upd ON public.commission_rules;
CREATE POLICY commission_upd ON public.commission_rules
  FOR UPDATE USING (
    has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role) OR has_role(auth.uid(), 'city_manager'::app_role) OR has_role(auth.uid(), 'finance'::app_role)
  ) WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role) OR has_role(auth.uid(), 'city_manager'::app_role) OR has_role(auth.uid(), 'finance'::app_role)
  );
DROP POLICY IF EXISTS commission_del ON public.commission_rules;
CREATE POLICY commission_del ON public.commission_rules
  FOR DELETE USING (
    has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)
  );

create table if not exists public.tender_rubrics (
  id uuid primary key default gen_random_uuid(),
  tender_id uuid not null,
  criterion text not null,
  weight numeric not null default 1.0,
  created_at timestamptz default now()
);
alter table public.tender_rubrics enable row level security;
DROP POLICY IF EXISTS tr_select ON public.tender_rubrics;
CREATE POLICY tr_select ON public.tender_rubrics
  FOR SELECT USING (
    has_role(auth.uid(), 'tender'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role) OR has_role(auth.uid(), 'ops'::app_role)
  );
DROP POLICY IF EXISTS tr_cu ON public.tender_rubrics;
CREATE POLICY tr_cu ON public.tender_rubrics
  FOR INSERT WITH CHECK (
    has_role(auth.uid(), 'tender'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)
  );
DROP POLICY IF EXISTS tr_upd ON public.tender_rubrics;
CREATE POLICY tr_upd ON public.tender_rubrics
  FOR UPDATE USING (
    has_role(auth.uid(), 'tender'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)
  ) WITH CHECK (
    has_role(auth.uid(), 'tender'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)
  );

create table if not exists public.tender_evaluations (
  id uuid primary key default gen_random_uuid(),
  rubric_id uuid not null,
  bid_id uuid not null,
  judge_id uuid not null,
  score numeric not null,
  note text,
  created_at timestamptz default now()
);
alter table public.tender_evaluations enable row level security;
DROP POLICY IF EXISTS te_select ON public.tender_evaluations;
CREATE POLICY te_select ON public.tender_evaluations
  FOR SELECT USING (
    has_role(auth.uid(), 'tender'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role) OR has_role(auth.uid(), 'ops'::app_role)
  );
DROP POLICY IF EXISTS te_cu ON public.tender_evaluations;
CREATE POLICY te_cu ON public.tender_evaluations
  FOR INSERT WITH CHECK (
    has_role(auth.uid(), 'tender'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)
  );
DROP POLICY IF EXISTS te_upd ON public.tender_evaluations;
CREATE POLICY te_upd ON public.tender_evaluations
  FOR UPDATE USING (
    has_role(auth.uid(), 'tender'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)
  ) WITH CHECK (
    has_role(auth.uid(), 'tender'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)
  );