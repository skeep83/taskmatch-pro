-- Fix missing RLS policies for tables that have RLS enabled but no policies

-- Fix set_updated_at function to use search_path
CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Fix set_updated_at_notifications function to use search_path  
CREATE OR REPLACE FUNCTION public.set_updated_at_notifications()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

-- Create missing RLS policies for pro_rating_stats if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pro_rating_stats' AND policyname = 'pro_rating_stats_public_select') THEN
    CREATE POLICY "pro_rating_stats_public_select" ON public.pro_rating_stats
    FOR SELECT USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pro_rating_stats' AND policyname = 'pro_rating_stats_service_update') THEN
    CREATE POLICY "pro_rating_stats_service_update" ON public.pro_rating_stats
    FOR UPDATE USING (auth.role() = 'service_role' OR has_role(auth.uid(), 'admin'::app_role));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pro_rating_stats' AND policyname = 'pro_rating_stats_service_insert') THEN
    CREATE POLICY "pro_rating_stats_service_insert" ON public.pro_rating_stats
    FOR INSERT WITH CHECK (auth.role() = 'service_role' OR has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

-- Add missing policies for tables that need them
DO $$ 
BEGIN
  -- Add missing policies for any table that has RLS enabled but no policies
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'job_applications' AND relrowsecurity = true) 
     AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'job_applications') THEN
    CREATE POLICY "job_applications_default_select" ON public.job_applications FOR SELECT USING (false);
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'wallets' AND relrowsecurity = true) 
     AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'wallets') THEN
    CREATE POLICY "wallets_default_select" ON public.wallets FOR SELECT USING (false);
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'notifications' AND relrowsecurity = true) 
     AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notifications') THEN
    CREATE POLICY "notifications_default_select" ON public.notifications FOR SELECT USING (false);
  END IF;
END $$;

-- Update all existing database functions to have proper search_path
CREATE OR REPLACE FUNCTION public.notify_new_message()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  sender_profile RECORD;
  notification_data JSONB;
  job_title TEXT;
BEGIN
  -- Get sender profile
  SELECT first_name, last_name, full_name 
  INTO sender_profile 
  FROM public.profiles 
  WHERE id = NEW.sender_id;
  
  -- Get job title if available
  IF NEW.job_id IS NOT NULL THEN
    SELECT title INTO job_title FROM public.jobs WHERE id = NEW.job_id;
  END IF;
  
  -- Prepare notification data
  notification_data := jsonb_build_object(
    'message_id', NEW.id,
    'sender_id', NEW.sender_id,
    'sender_name', COALESCE(sender_profile.full_name, sender_profile.first_name || ' ' || sender_profile.last_name, 'Пользователь'),
    'job_id', NEW.job_id,
    'job_title', job_title,
    'message_preview', LEFT(NEW.content, 100)
  );
  
  -- Send notification to receiver
  PERFORM public.notify_user(
    NEW.receiver_id,
    'message',
    'Новое сообщение',
    format('Сообщение от %s: %s', 
           COALESCE(sender_profile.full_name, sender_profile.first_name || ' ' || sender_profile.last_name, 'Пользователь'),
           LEFT(NEW.content, 50) || CASE WHEN LENGTH(NEW.content) > 50 THEN '...' ELSE '' END),
    notification_data,
    'Mesaj nou',
    format('Mesaj de la %s: %s',
           COALESCE(sender_profile.full_name, sender_profile.first_name || ' ' || sender_profile.last_name, 'Utilizator'),
           LEFT(NEW.content, 50) || CASE WHEN LENGTH(NEW.content) > 50 THEN '...' ELSE '' END)
  );
  
  RETURN NEW;
END;
$function$;

-- Update update_job_price_proposals_updated_at function
CREATE OR REPLACE FUNCTION public.update_job_price_proposals_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Update log_exchange_rate_change function
CREATE OR REPLACE FUNCTION public.log_exchange_rate_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.exchange_rate != NEW.exchange_rate THEN
    INSERT INTO public.exchange_rate_history (currency_id, old_rate, new_rate, changed_by)
    VALUES (NEW.id, OLD.exchange_rate, NEW.exchange_rate, auth.uid());
  END IF;
  
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Update audit_sensitive_operations function
CREATE OR REPLACE FUNCTION public.audit_sensitive_operations()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Log access to professional data
  INSERT INTO public.audit_log (actor_id, action, entity, entity_id, after)
  VALUES (
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id::text, OLD.id::text),
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE row_to_json(NEW) END
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Update cleanup_rate_limits function
CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM public.rate_limits 
  WHERE window_start < now() - interval '1 hour';
END;
$function$;

-- Update log_security_event function
CREATE OR REPLACE FUNCTION public.log_security_event(event_type text, details jsonb DEFAULT NULL::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.admin_audit_log (
    admin_user_id,
    action,
    resource_type,
    resource_id,
    new_values,
    created_at
  ) VALUES (
    auth.uid(),
    'SECURITY_EVENT',
    event_type,
    auth.uid()::text,
    details,
    now()
  );
END;
$function$;

-- Update audit_financial_operations function
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

-- Update ratings_after_change_refresh function
CREATE OR REPLACE FUNCTION public.ratings_after_change_refresh()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.refresh_pro_rating_stats(COALESCE(NEW.to_user_id, OLD.to_user_id));
  RETURN NEW;
END;
$function$;