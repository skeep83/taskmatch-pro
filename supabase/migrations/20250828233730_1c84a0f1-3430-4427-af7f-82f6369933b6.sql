-- =====================================
-- FINAL SECURITY FIXES - CORRECTED STRUCTURE
-- =====================================

-- 1. PROFILES TABLE - Restrict access to personal data (uses 'id' as user reference)
DROP POLICY IF EXISTS "profiles_public_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_read_all" ON public.profiles;

-- Users can only see their own profile
CREATE POLICY "profiles_own_select" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

-- Users can update their own profile  
CREATE POLICY "profiles_own_update" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid());

-- Users can insert their own profile
CREATE POLICY "profiles_own_insert" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- Admins can see all profiles
CREATE POLICY "profiles_admin_all" ON public.profiles
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. WALLETS TABLE - Restrict financial data access (uses 'pro_id' as user reference)
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

-- Users can only see their own wallet
CREATE POLICY "wallets_own_select" ON public.wallets
  FOR SELECT TO authenticated
  USING (pro_id = auth.uid());

-- Users can update their own wallet (for balance changes via system)
CREATE POLICY "wallets_system_update" ON public.wallets
  FOR UPDATE TO authenticated
  USING (pro_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- Only system/admin can insert wallets
CREATE POLICY "wallets_system_insert" ON public.wallets
  FOR INSERT TO authenticated
  WITH CHECK (pro_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- Admins can see all wallets
CREATE POLICY "wallets_admin_all" ON public.wallets
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. TRANSACTIONS TABLE - Restrict financial transaction access (uses 'pro_id' as user reference)
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own transactions
CREATE POLICY "transactions_own_select" ON public.transactions
  FOR SELECT TO authenticated
  USING (pro_id = auth.uid());

-- Only system/admin can create transactions
CREATE POLICY "transactions_system_insert" ON public.transactions
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admins can see all transactions
CREATE POLICY "transactions_admin_all" ON public.transactions
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 4. ADMIN_SESSIONS TABLE - Critical security fix
-- Users can only see their own sessions
CREATE POLICY "admin_sessions_own_only" ON public.admin_sessions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Users can only update their own sessions
CREATE POLICY "admin_sessions_own_update" ON public.admin_sessions
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- Users can only insert their own sessions
CREATE POLICY "admin_sessions_own_insert" ON public.admin_sessions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can only delete their own sessions
CREATE POLICY "admin_sessions_own_delete" ON public.admin_sessions
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- 5. Create missing ratings table and secure it
CREATE TABLE IF NOT EXISTS public.ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id uuid REFERENCES public.jobs(id) ON DELETE CASCADE,
  score integer CHECK (score >= 1 AND score <= 5),
  comment text,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(from_user_id, to_user_id, job_id)
);

ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

-- Users can see ratings for themselves and ratings they gave
CREATE POLICY "ratings_participant_select" ON public.ratings
  FOR SELECT TO authenticated
  USING (from_user_id = auth.uid() OR to_user_id = auth.uid());

-- Users can only create ratings for jobs they participated in
CREATE POLICY "ratings_participant_insert" ON public.ratings
  FOR INSERT TO authenticated
  WITH CHECK (
    from_user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM jobs j 
      WHERE j.id = job_id 
      AND (j.client_id = auth.uid() OR j.pro_id = auth.uid())
    )
  );

-- Admins can see all ratings
CREATE POLICY "ratings_admin_all" ON public.ratings
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 6. Add audit logging for financial operations
CREATE OR REPLACE FUNCTION public.audit_financial_operations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Log all financial operations
  INSERT INTO public.audit_log (actor_id, action, entity, entity_id, before, after)
  VALUES (
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id::text, OLD.id::text),
    CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE row_to_json(NEW) END
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Add financial audit triggers
DROP TRIGGER IF EXISTS audit_wallets ON public.wallets;
CREATE TRIGGER audit_wallets
  AFTER INSERT OR UPDATE OR DELETE ON public.wallets
  FOR EACH ROW EXECUTE FUNCTION public.audit_financial_operations();

DROP TRIGGER IF EXISTS audit_transactions ON public.transactions;
CREATE TRIGGER audit_transactions
  AFTER INSERT OR UPDATE OR DELETE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.audit_financial_operations();

-- 7. Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(id);
CREATE INDEX IF NOT EXISTS idx_wallets_pro_id ON public.wallets(pro_id);
CREATE INDEX IF NOT EXISTS idx_transactions_pro_id ON public.transactions(pro_id);

-- 8. Log security policy changes
SELECT public.log_security_event('RLS_POLICIES_UPDATED', '{"action": "restricted_public_access", "tables": ["profiles", "wallets", "transactions", "admin_sessions", "ratings"]}'::jsonb);