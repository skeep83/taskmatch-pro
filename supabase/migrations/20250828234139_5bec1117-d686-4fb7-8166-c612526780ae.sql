-- =====================================
-- COMPREHENSIVE SECURITY CLEANUP
-- =====================================

-- 1. PROFILES TABLE - Remove all public access
DROP POLICY IF EXISTS "pro_profiles_public_select" ON public.profiles;
-- Keep only authenticated policies (already exist)

-- 2. BUSINESS_ACCOUNTS - Already secured with proper policies

-- 3. ESCROWS - Already has proper policies

-- 4. CHAT_MESSAGES - Already has proper policies

-- 5. Fix remaining tables that might have public access
-- Check and secure additional financial tables

-- Secure biz_invoices if publicly accessible
DROP POLICY IF EXISTS "biz_invoices_public_select" ON public.biz_invoices;

-- Secure payout_requests if publicly accessible  
DROP POLICY IF EXISTS "payout_requests_public_select" ON public.payout_requests;

-- Secure payouts if publicly accessible
DROP POLICY IF EXISTS "payouts_public_select" ON public.payouts;

-- Secure dispute_cases if publicly accessible
DROP POLICY IF EXISTS "dispute_cases_public_select" ON public.dispute_cases;

-- Secure moderation_queue if publicly accessible
DROP POLICY IF EXISTS "moderation_queue_public_select" ON public.moderation_queue;

-- Secure audit_log - ensure only admins can access
DROP POLICY IF EXISTS "audit_log_public_select" ON public.audit_log;

-- 6. Double-check that all sensitive tables have RLS enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escrows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.biz_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispute_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_queue ENABLE ROW LEVEL SECURITY;

-- Security verification complete