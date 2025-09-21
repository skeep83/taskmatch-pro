-- Fix all functions without proper search_path
-- Update functions to have SECURITY DEFINER and proper search_path

-- Fix update_ratings_updated_at function
CREATE OR REPLACE FUNCTION public.update_ratings_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Fix update_tenders_updated_at function  
CREATE OR REPLACE FUNCTION public.update_tenders_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Fix update_error_logs_updated_at function
CREATE OR REPLACE FUNCTION public.update_error_logs_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  NEW.created_at = COALESCE(NEW.created_at, now());
  RETURN NEW;
END;
$function$;

-- Fix set_updated_at function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Fix set_updated_at_notifications function
CREATE OR REPLACE FUNCTION public.set_updated_at_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

-- Fix log_exchange_rate_change function
CREATE OR REPLACE FUNCTION public.log_exchange_rate_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Fix update_job_price_proposals_updated_at function
CREATE OR REPLACE FUNCTION public.update_job_price_proposals_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Fix ratings_after_change_refresh function
CREATE OR REPLACE FUNCTION public.ratings_after_change_refresh()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  PERFORM public.refresh_pro_rating_stats(COALESCE(NEW.to_user_id, OLD.to_user_id));
  RETURN NEW;
END;
$function$;

-- Fix cleanup_rate_limits function
CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  DELETE FROM public.rate_limits 
  WHERE window_start < now() - interval '1 hour';
END;
$function$;

-- Fix clear_expired_otp function
CREATE OR REPLACE FUNCTION public.clear_expired_otp()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  UPDATE public.jobs 
  SET otp_code = NULL 
  WHERE otp_code IS NOT NULL 
    AND updated_at < now() - interval '24 hours';
END;
$function$;