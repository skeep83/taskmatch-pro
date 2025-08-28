-- =====================================
-- FINAL SECURITY FIXES - SIMPLIFIED
-- =====================================

-- 1. PROFILES TABLE - Restrict access to personal data
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

-- Admins can see all profiles
CREATE POLICY "profiles_admin_all" ON public.profiles
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. WALLETS TABLE - Restrict financial data access
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

-- Users can only see their own wallet
CREATE POLICY "wallets_own_select" ON public.wallets
  FOR SELECT TO authenticated
  USING (pro_id = auth.uid());

-- Users can update their own wallet 
CREATE POLICY "wallets_system_update" ON public.wallets
  FOR UPDATE TO authenticated
  USING (pro_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- Only system/admin can insert wallets
CREATE POLICY "wallets_system_insert" ON public.wallets
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR pro_id = auth.uid());

-- Admins can see all wallets
CREATE POLICY "wallets_admin_all" ON public.wallets
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. TRANSACTIONS TABLE - Restrict financial transaction access
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own transactions
CREATE POLICY "transactions_own_select" ON public.transactions
  FOR SELECT TO authenticated
  USING (
    pro_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM jobs j 
      WHERE j.id = job_id 
      AND (j.client_id = auth.uid() OR j.pro_id = auth.uid())
    )
  );

-- Only system/admin can create transactions
CREATE POLICY "transactions_system_insert" ON public.transactions
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admins can see all transactions
CREATE POLICY "transactions_admin_all" ON public.transactions
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 4. ADMIN_SESSIONS TABLE - Critical security fix
DROP POLICY IF EXISTS "admin_sessions_own_sessions" ON public.admin_sessions;

-- Users can only see their own sessions
CREATE POLICY "admin_sessions_own_only" ON public.admin_sessions
  FOR ALL TO authenticated
  USING (user_id = auth.uid());

-- 5. Add audit logging for financial operations
CREATE OR REPLACE FUNCTION public.audit_financial_operations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Log all financial operations (only if user is authenticated)
  IF auth.uid() IS NOT NULL THEN
    INSERT INTO public.audit_log (actor_id, action, entity, entity_id, before, after)
    VALUES (
      auth.uid(),
      TG_OP,
      TG_TABLE_NAME,
      COALESCE(NEW.id::text, OLD.id::text),
      CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
      CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE row_to_json(NEW) END
    );
  END IF;
  
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

-- 6. Add performance indexes
CREATE INDEX IF NOT EXISTS idx_wallets_pro_id ON public.wallets(pro_id);
CREATE INDEX IF NOT EXISTS idx_transactions_pro_id ON public.transactions(pro_id);
CREATE INDEX IF NOT EXISTS idx_transactions_job_id ON public.transactions(job_id);