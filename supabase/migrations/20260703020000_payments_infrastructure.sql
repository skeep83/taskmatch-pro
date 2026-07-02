-- Payment processing infrastructure.
-- IMPORTANT: raw card data is NEVER stored on our side (PCI DSS).
-- Cards live at the provider (Stripe / MAIB / Paynet); we keep only
-- opaque tokens + display metadata (brand, last4). Secret API keys are
-- NOT stored in the database — they go to Supabase Edge Function secrets
-- (`supabase secrets set STRIPE_SECRET_KEY=...`).

-- 1. Public payment configuration (publishable parts only)
INSERT INTO public.platform_settings (key, value, category, description) VALUES
  ('payment_provider',        '"stripe"', 'payments', 'Активный платёжный провайдер: stripe | maib | paynet'),
  ('payment_mode',            '"test"',   'payments', 'Режим: test | live'),
  ('payment_currency',        '"mdl"',    'payments', 'Валюта платежей по умолчанию'),
  ('stripe_publishable_key',  '""',       'payments', 'Stripe publishable key (pk_...), безопасен для фронтенда'),
  ('apple_pay_enabled',       'false',    'payments', 'Показывать Apple Pay в способах оплаты'),
  ('google_pay_enabled',      'false',    'payments', 'Показывать Google Pay в способах оплаты'),
  ('payments_enabled',        'false',    'payments', 'Главный тумблер: платежи включены')
ON CONFLICT (key) DO NOTHING;

-- payments settings are public-readable (publishable key is public by design)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'platform_settings_payments_public_read') THEN
    CREATE POLICY platform_settings_payments_public_read ON public.platform_settings
      FOR SELECT USING (category = 'payments');
  END IF;
END $$;

-- 2. Saved payment methods: tokens only, never card numbers
CREATE TABLE IF NOT EXISTS public.payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'stripe',
  provider_method_id text NOT NULL,      -- opaque token, e.g. Stripe pm_...
  brand text,                            -- visa / mastercard / apple_pay / google_pay
  last4 text CHECK (char_length(last4) <= 4),
  exp_month integer,
  exp_year integer,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_method_id)
);

ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'payment_methods_owner_all') THEN
    CREATE POLICY payment_methods_owner_all ON public.payment_methods
      FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_payment_methods_user ON public.payment_methods(user_id);

-- 3. Review replies (the rated user may answer once, publicly)
ALTER TABLE public.ratings ADD COLUMN IF NOT EXISTS reply text;
ALTER TABLE public.ratings ADD COLUMN IF NOT EXISTS reply_at timestamptz;

CREATE OR REPLACE FUNCTION public.reply_to_rating(_rating_id uuid, _reply text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _reply IS NULL OR length(trim(_reply)) = 0 OR length(_reply) > 1000 THEN
    RAISE EXCEPTION 'Invalid reply';
  END IF;

  UPDATE public.ratings
  SET reply = _reply, reply_at = now()
  WHERE id = _rating_id
    AND to_user_id = auth.uid()
    AND reply IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Rating not found or reply already exists';
  END IF;
END;
$$;
