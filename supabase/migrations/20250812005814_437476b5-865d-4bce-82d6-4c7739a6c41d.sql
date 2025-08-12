-- FIX: use pg_policies.policyname for existence checks

-- 1) Enums
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payout_status') THEN
    CREATE TYPE public.payout_status AS ENUM ('pending','approved','rejected','paid');
  END IF;
END $$;

-- 2) pro_profiles
CREATE TABLE IF NOT EXISTS public.pro_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  bio TEXT,
  radius_km INTEGER NOT NULL DEFAULT 10,
  hourly_rate_cents INTEGER,
  fixed_price_cents INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.pro_profiles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'pro_profiles_owner_select') THEN
    CREATE POLICY pro_profiles_owner_select ON public.pro_profiles FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'pro_profiles_owner_upsert') THEN
    CREATE POLICY pro_profiles_owner_upsert ON public.pro_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'pro_profiles_owner_update') THEN
    CREATE POLICY pro_profiles_owner_update ON public.pro_profiles FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;

-- 3) pro_categories
CREATE TABLE IF NOT EXISTS public.pro_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  category_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, category_id)
);
ALTER TABLE public.pro_categories ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'pro_categories_owner_select') THEN
    CREATE POLICY pro_categories_owner_select ON public.pro_categories FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'pro_categories_owner_insert') THEN
    CREATE POLICY pro_categories_owner_insert ON public.pro_categories FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'pro_categories_owner_delete') THEN
    CREATE POLICY pro_categories_owner_delete ON public.pro_categories FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- 4) pro_availability
CREATE TABLE IF NOT EXISTS public.pro_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  weekday SMALLINT NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.pro_availability ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'pro_availability_owner_select') THEN
    CREATE POLICY pro_availability_owner_select ON public.pro_availability FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'pro_availability_owner_insert') THEN
    CREATE POLICY pro_availability_owner_insert ON public.pro_availability FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'pro_availability_owner_update') THEN
    CREATE POLICY pro_availability_owner_update ON public.pro_availability FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'pro_availability_owner_delete') THEN
    CREATE POLICY pro_availability_owner_delete ON public.pro_availability FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- 5) payout_requests
CREATE TABLE IF NOT EXISTS public.payout_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pro_id UUID NOT NULL,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  status public.payout_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'payout_requests_owner_insert') THEN
    CREATE POLICY payout_requests_owner_insert ON public.payout_requests FOR INSERT WITH CHECK (pro_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'payout_requests_owner_select') THEN
    CREATE POLICY payout_requests_owner_select ON public.payout_requests FOR SELECT USING (pro_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'payout_requests_admin_update') THEN
    CREATE POLICY payout_requests_admin_update ON public.payout_requests FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_payout_requests') THEN
    CREATE TRIGGER set_updated_at_payout_requests BEFORE UPDATE ON public.payout_requests FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_pro_profiles') THEN
    CREATE TRIGGER set_updated_at_pro_profiles BEFORE UPDATE ON public.pro_profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- 6) portfolio_items
CREATE TABLE IF NOT EXISTS public.portfolio_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pro_id UUID NOT NULL,
  title TEXT,
  description TEXT,
  image_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.portfolio_items ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'portfolio_items_public_select') THEN
    CREATE POLICY portfolio_items_public_select ON public.portfolio_items FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'portfolio_items_owner_insert') THEN
    CREATE POLICY portfolio_items_owner_insert ON public.portfolio_items FOR INSERT WITH CHECK (pro_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'portfolio_items_owner_update') THEN
    CREATE POLICY portfolio_items_owner_update ON public.portfolio_items FOR UPDATE USING (pro_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'portfolio_items_owner_delete') THEN
    CREATE POLICY portfolio_items_owner_delete ON public.portfolio_items FOR DELETE USING (pro_id = auth.uid());
  END IF;
END $$;

-- 7) Storage bucket and policies
INSERT INTO storage.buckets (id, name, public) VALUES ('portfolio', 'portfolio', true) ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'portfolio_public_read' AND schemaname = 'storage' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "portfolio_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'portfolio');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'portfolio_owner_write' AND schemaname = 'storage' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "portfolio_owner_write" ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'portfolio' AND (auth.uid()::text = (storage.foldername(name))[1]));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'portfolio_owner_update' AND schemaname = 'storage' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "portfolio_owner_update" ON storage.objects FOR UPDATE TO authenticated
      USING (bucket_id = 'portfolio' AND (auth.uid()::text = (storage.foldername(name))[1]))
      WITH CHECK (bucket_id = 'portfolio' AND (auth.uid()::text = (storage.foldername(name))[1]));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'portfolio_owner_delete' AND schemaname = 'storage' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "portfolio_owner_delete" ON storage.objects FOR DELETE TO authenticated
      USING (bucket_id = 'portfolio' AND (auth.uid()::text = (storage.foldername(name))[1]));
  END IF;
END $$;