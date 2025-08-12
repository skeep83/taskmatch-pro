-- FULL SCHEMA SETUP (create tables -> enable RLS -> policies) 
-- ENUMS
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'job_status') THEN
    CREATE TYPE public.job_status AS ENUM ('new','accepted','in_progress','done','disputed','canceled');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tender_status') THEN
    CREATE TYPE public.tender_status AS ENUM ('open','closed','awarded','canceled');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'chat_status') THEN
    CREATE TYPE public.chat_status AS ENUM ('active','closed');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'escrow_status') THEN
    CREATE TYPE public.escrow_status AS ENUM ('held','released','refunded');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'txn_direction') THEN
    CREATE TYPE public.txn_direction AS ENUM ('credit','debit');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'kyc_status') THEN
    CREATE TYPE public.kyc_status AS ENUM ('pending','approved','rejected');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'referral_status') THEN
    CREATE TYPE public.referral_status AS ENUM ('pending','granted','revoked');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'biz_role') THEN
    CREATE TYPE public.biz_role AS ENUM ('owner','manager','member');
  END IF;
END $$;

-- TABLES
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  label_ru text,
  label_ro text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pricing_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL,
  title_ru text,
  title_ro text,
  price_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'usd',
  urgent_multiplier numeric(6,3) DEFAULT 1.0,
  same_day_fee_cents integer DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  category_id uuid NOT NULL,
  title text,
  description text,
  budget_min_cents integer,
  budget_max_cents integer,
  scheduled_at timestamptz,
  status public.job_status NOT NULL DEFAULT 'new',
  pro_id uuid,
  start_confirmed boolean NOT NULL DEFAULT false,
  end_confirmed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.job_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL,
  file_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tenders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  category_id uuid NOT NULL,
  title text,
  description text,
  window_from timestamptz,
  window_to timestamptz,
  budget_hint_cents integer,
  status public.tender_status NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id uuid NOT NULL,
  pro_id uuid NOT NULL,
  price_cents integer NOT NULL,
  eta_slot text,
  warranty_days integer,
  note text,
  is_final boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid,
  tender_id uuid,
  client_id uuid NOT NULL,
  professional_id uuid NOT NULL,
  status public.chat_status NOT NULL DEFAULT 'active',
  last_message_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  message_type text NOT NULL DEFAULT 'text',
  content text,
  file_url text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.wallets (
  pro_id uuid PRIMARY KEY,
  balance_cents bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject text NOT NULL,
  subject_id uuid,
  pro_id uuid,
  job_id uuid,
  amount_cents integer NOT NULL,
  direction public.txn_direction NOT NULL,
  meta jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.escrows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL UNIQUE,
  client_id uuid NOT NULL,
  pro_id uuid,
  amount_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'usd',
  status public.escrow_status NOT NULL DEFAULT 'held',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.kyc_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  doc_type text NOT NULL,
  file_url text NOT NULL,
  status public.kyc_status NOT NULL DEFAULT 'pending',
  reviewer_id uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL,
  from_user_id uuid NOT NULL,
  to_user_id uuid NOT NULL,
  score integer NOT NULL,
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tier text,
  active boolean NOT NULL DEFAULT false,
  renews_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL,
  referred_id uuid UNIQUE,
  bonus_cents integer DEFAULT 0,
  status public.referral_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.business_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  company_name text NOT NULL,
  idno text,
  legal_address text,
  vat_number text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.business_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role public.biz_role NOT NULL DEFAULT 'member',
  limits jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_jobs_client ON public.jobs(client_id);
CREATE INDEX IF NOT EXISTS idx_jobs_pro ON public.jobs(pro_id);
CREATE INDEX IF NOT EXISTS idx_tenders_client ON public.tenders(client_id);
CREATE INDEX IF NOT EXISTS idx_bids_tender ON public.bids(tender_id);
CREATE INDEX IF NOT EXISTS idx_bids_pro ON public.bids(pro_id);
CREATE INDEX IF NOT EXISTS idx_chats_parties ON public.chats(client_id, professional_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_chat ON public.chat_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_wallets_pro ON public.wallets(pro_id);
CREATE INDEX IF NOT EXISTS idx_escrows_job ON public.escrows(job_id);
CREATE INDEX IF NOT EXISTS idx_kyc_user ON public.kyc_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_ratings_to_user ON public.ratings(to_user_id);
CREATE INDEX IF NOT EXISTS idx_business_members_user ON public.business_members(user_id);

-- TRIGGERS updated_at
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_categories_updated_at') THEN
    CREATE TRIGGER trg_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_pricing_templates_updated_at') THEN
    CREATE TRIGGER trg_pricing_templates_updated_at BEFORE UPDATE ON public.pricing_templates FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_jobs_updated_at') THEN
    CREATE TRIGGER trg_jobs_updated_at BEFORE UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_tenders_updated_at') THEN
    CREATE TRIGGER trg_tenders_updated_at BEFORE UPDATE ON public.tenders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_wallets_updated_at') THEN
    CREATE TRIGGER trg_wallets_updated_at BEFORE UPDATE ON public.wallets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_escrows_updated_at') THEN
    CREATE TRIGGER trg_escrows_updated_at BEFORE UPDATE ON public.escrows FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_subscriptions_updated_at') THEN
    CREATE TRIGGER trg_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_business_accounts_updated_at') THEN
    CREATE TRIGGER trg_business_accounts_updated_at BEFORE UPDATE ON public.business_accounts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- ENABLE RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escrows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kyc_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_members ENABLE ROW LEVEL SECURITY;

-- POLICIES (using pg_policies.policyname)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='categories_read_all') THEN
    CREATE POLICY categories_read_all ON public.categories FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='categories_admin_ins') THEN
    CREATE POLICY categories_admin_ins ON public.categories FOR INSERT WITH CHECK (public.has_role(auth.uid(),'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='categories_admin_upd') THEN
    CREATE POLICY categories_admin_upd ON public.categories FOR UPDATE USING (public.has_role(auth.uid(),'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='categories_admin_del') THEN
    CREATE POLICY categories_admin_del ON public.categories FOR DELETE USING (public.has_role(auth.uid(),'admin'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='pricing_read_all') THEN
    CREATE POLICY pricing_read_all ON public.pricing_templates FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='pricing_admin_ins') THEN
    CREATE POLICY pricing_admin_ins ON public.pricing_templates FOR INSERT WITH CHECK (public.has_role(auth.uid(),'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='pricing_admin_upd') THEN
    CREATE POLICY pricing_admin_upd ON public.pricing_templates FOR UPDATE USING (public.has_role(auth.uid(),'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='pricing_admin_del') THEN
    CREATE POLICY pricing_admin_del ON public.pricing_templates FOR DELETE USING (public.has_role(auth.uid(),'admin'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='jobs_select_own_or_assigned_or_admin') THEN
    CREATE POLICY jobs_select_own_or_assigned_or_admin ON public.jobs FOR SELECT USING (
      client_id = auth.uid() OR pro_id = auth.uid() OR public.has_role(auth.uid(),'admin')
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='jobs_insert_client_only') THEN
    CREATE POLICY jobs_insert_client_only ON public.jobs FOR INSERT WITH CHECK (client_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='jobs_update_own_or_assigned_or_admin') THEN
    CREATE POLICY jobs_update_own_or_assigned_or_admin ON public.jobs FOR UPDATE USING (
      client_id = auth.uid() OR pro_id = auth.uid() OR public.has_role(auth.uid(),'admin')
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='job_photos_select_by_job_access') THEN
    CREATE POLICY job_photos_select_by_job_access ON public.job_photos FOR SELECT USING (
      EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_id AND (j.client_id = auth.uid() OR j.pro_id = auth.uid() OR public.has_role(auth.uid(),'admin')))
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='job_photos_insert_by_owner') THEN
    CREATE POLICY job_photos_insert_by_owner ON public.job_photos FOR INSERT WITH CHECK (
      EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_id AND (j.client_id = auth.uid() OR j.pro_id = auth.uid()))
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='tenders_select_open_or_owner_or_admin') THEN
    CREATE POLICY tenders_select_open_or_owner_or_admin ON public.tenders FOR SELECT USING (
      status = 'open' OR client_id = auth.uid() OR public.has_role(auth.uid(),'admin')
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='tenders_insert_owner') THEN
    CREATE POLICY tenders_insert_owner ON public.tenders FOR INSERT WITH CHECK (client_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='tenders_update_owner_or_admin') THEN
    CREATE POLICY tenders_update_owner_or_admin ON public.tenders FOR UPDATE USING (
      client_id = auth.uid() OR public.has_role(auth.uid(),'admin')
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='bids_select_pro_or_tender_owner_or_admin') THEN
    CREATE POLICY bids_select_pro_or_tender_owner_or_admin ON public.bids FOR SELECT USING (
      pro_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR EXISTS (
        SELECT 1 FROM public.tenders t WHERE t.id = tender_id AND t.client_id = auth.uid()
      )
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='bids_insert_pro_only') THEN
    CREATE POLICY bids_insert_pro_only ON public.bids FOR INSERT WITH CHECK (pro_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='bids_update_pro_or_admin') THEN
    CREATE POLICY bids_update_pro_or_admin ON public.bids FOR UPDATE USING (pro_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='chats_select_participants_or_admin') THEN
    CREATE POLICY chats_select_participants_or_admin ON public.chats FOR SELECT USING (
      client_id = auth.uid() OR professional_id = auth.uid() OR public.has_role(auth.uid(),'admin')
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='chats_insert_participants_only') THEN
    CREATE POLICY chats_insert_participants_only ON public.chats FOR INSERT WITH CHECK (
      client_id = auth.uid() OR professional_id = auth.uid()
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='chats_update_participants_or_admin') THEN
    CREATE POLICY chats_update_participants_or_admin ON public.chats FOR UPDATE USING (
      client_id = auth.uid() OR professional_id = auth.uid() OR public.has_role(auth.uid(),'admin')
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='chat_messages_select_participants_or_admin') THEN
    CREATE POLICY chat_messages_select_participants_or_admin ON public.chat_messages FOR SELECT USING (
      EXISTS (SELECT 1 FROM public.chats c WHERE c.id = chat_id AND (c.client_id = auth.uid() OR c.professional_id = auth.uid() OR public.has_role(auth.uid(),'admin')))
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='chat_messages_insert_sender_participant') THEN
    CREATE POLICY chat_messages_insert_sender_participant ON public.chat_messages FOR INSERT WITH CHECK (
      sender_id = auth.uid() AND EXISTS (SELECT 1 FROM public.chats c WHERE c.id = chat_id AND (c.client_id = auth.uid() OR c.professional_id = auth.uid()))
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='wallets_select_own_or_admin') THEN
    CREATE POLICY wallets_select_own_or_admin ON public.wallets FOR SELECT USING (pro_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='wallets_insert_admin') THEN
    CREATE POLICY wallets_insert_admin ON public.wallets FOR INSERT WITH CHECK (public.has_role(auth.uid(),'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='wallets_update_admin') THEN
    CREATE POLICY wallets_update_admin ON public.wallets FOR UPDATE USING (public.has_role(auth.uid(),'admin'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='transactions_select_own_or_admin') THEN
    CREATE POLICY transactions_select_own_or_admin ON public.transactions FOR SELECT USING (pro_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='transactions_insert_admin') THEN
    CREATE POLICY transactions_insert_admin ON public.transactions FOR INSERT WITH CHECK (public.has_role(auth.uid(),'admin'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='escrows_select_parties_or_admin') THEN
    CREATE POLICY escrows_select_parties_or_admin ON public.escrows FOR SELECT USING (
      client_id = auth.uid() OR pro_id = auth.uid() OR public.has_role(auth.uid(),'admin')
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='escrows_insert_admin') THEN
    CREATE POLICY escrows_insert_admin ON public.escrows FOR INSERT WITH CHECK (public.has_role(auth.uid(),'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='escrows_update_admin') THEN
    CREATE POLICY escrows_update_admin ON public.escrows FOR UPDATE USING (public.has_role(auth.uid(),'admin'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='kyc_select_own_or_admin') THEN
    CREATE POLICY kyc_select_own_or_admin ON public.kyc_documents FOR SELECT USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='kyc_insert_own') THEN
    CREATE POLICY kyc_insert_own ON public.kyc_documents FOR INSERT WITH CHECK (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='kyc_update_admin') THEN
    CREATE POLICY kyc_update_admin ON public.kyc_documents FOR UPDATE USING (public.has_role(auth.uid(),'admin'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='ratings_select_involved_or_admin') THEN
    CREATE POLICY ratings_select_involved_or_admin ON public.ratings FOR SELECT USING (
      from_user_id = auth.uid() OR to_user_id = auth.uid() OR public.has_role(auth.uid(),'admin')
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='ratings_insert_from_user') THEN
    CREATE POLICY ratings_insert_from_user ON public.ratings FOR INSERT WITH CHECK (from_user_id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='subscriptions_select_own_or_admin') THEN
    CREATE POLICY subscriptions_select_own_or_admin ON public.subscriptions FOR SELECT USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='subscriptions_upsert_any_trusted') THEN
    CREATE POLICY subscriptions_upsert_any_trusted ON public.subscriptions FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='subscriptions_update_trusted') THEN
    CREATE POLICY subscriptions_update_trusted ON public.subscriptions FOR UPDATE USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='referrals_select_referrer_or_referred_or_admin') THEN
    CREATE POLICY referrals_select_referrer_or_referred_or_admin ON public.referrals FOR SELECT USING (
      referrer_id = auth.uid() OR referred_id = auth.uid() OR public.has_role(auth.uid(),'admin')
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='referrals_insert_referrer') THEN
    CREATE POLICY referrals_insert_referrer ON public.referrals FOR INSERT WITH CHECK (referrer_id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='biz_accounts_select_owner_or_member_or_admin') THEN
    CREATE POLICY biz_accounts_select_owner_or_member_or_admin ON public.business_accounts FOR SELECT USING (
      owner_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.business_members bm WHERE bm.business_id = id AND bm.user_id = auth.uid()
      ) OR public.has_role(auth.uid(),'admin')
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='biz_accounts_insert_owner_only') THEN
    CREATE POLICY biz_accounts_insert_owner_only ON public.business_accounts FOR INSERT WITH CHECK (owner_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='biz_accounts_update_owner_or_admin') THEN
    CREATE POLICY biz_accounts_update_owner_or_admin ON public.business_accounts FOR UPDATE USING (owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='biz_members_select_self_or_admin') THEN
    CREATE POLICY biz_members_select_self_or_admin ON public.business_members FOR SELECT USING (
      user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR EXISTS (
        SELECT 1 FROM public.business_accounts ba WHERE ba.id = business_id AND ba.owner_id = auth.uid()
      )
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='biz_members_insert_owner_only') THEN
    CREATE POLICY biz_members_insert_owner_only ON public.business_members FOR INSERT WITH CHECK (
      EXISTS (SELECT 1 FROM public.business_accounts ba WHERE ba.id = business_id AND ba.owner_id = auth.uid())
    );
  END IF;
END $$;

-- STORAGE buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('kyc','kyc', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('evidence','evidence', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('chat','chat', false) ON CONFLICT (id) DO NOTHING;

-- STORAGE policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='storage_kyc_read_own_or_admin') THEN
    CREATE POLICY storage_kyc_read_own_or_admin ON storage.objects FOR SELECT USING (
      (bucket_id = 'kyc') AND (
        public.has_role(auth.uid(),'admin') OR auth.uid()::text = (storage.foldername(name))[1]
      )
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='storage_kyc_write_own') THEN
    CREATE POLICY storage_kyc_write_own ON storage.objects FOR INSERT WITH CHECK (
      (bucket_id = 'kyc') AND auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='storage_evidence_read') THEN
    CREATE POLICY storage_evidence_read ON storage.objects FOR SELECT USING (
      bucket_id = 'evidence' AND (
        public.has_role(auth.uid(),'admin') OR EXISTS (
          SELECT 1 FROM public.jobs j WHERE j.id::text = (storage.foldername(name))[1] AND (j.client_id = auth.uid() OR j.pro_id = auth.uid())
        )
      )
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='storage_evidence_write') THEN
    CREATE POLICY storage_evidence_write ON storage.objects FOR INSERT WITH CHECK (
      bucket_id = 'evidence' AND EXISTS (
        SELECT 1 FROM public.jobs j WHERE j.id::text = (storage.foldername(name))[1] AND (j.client_id = auth.uid() OR j.pro_id = auth.uid())
      )
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='storage_chat_read') THEN
    CREATE POLICY storage_chat_read ON storage.objects FOR SELECT USING (
      bucket_id = 'chat' AND (
        public.has_role(auth.uid(),'admin') OR EXISTS (
          SELECT 1 FROM public.chats c WHERE c.id::text = (storage.foldername(name))[1] AND (c.client_id = auth.uid() OR c.professional_id = auth.uid())
        )
      )
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='storage_chat_write') THEN
    CREATE POLICY storage_chat_write ON storage.objects FOR INSERT WITH CHECK (
      bucket_id = 'chat' AND EXISTS (
        SELECT 1 FROM public.chats c WHERE c.id::text = (storage.foldername(name))[1] AND (c.client_id = auth.uid() OR c.professional_id = auth.uid())
      )
    );
  END IF;
END $$;