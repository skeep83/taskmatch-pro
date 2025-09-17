-- Fix function search path for security (addresses WARN 1)
-- Update functions to use explicit schema references and set search_path

-- Fix generate_job_otp function
CREATE OR REPLACE FUNCTION public.generate_job_otp()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  -- Generate 6-digit OTP when job status changes to 'in_progress'
  IF NEW.status = 'in_progress' AND (OLD.status IS NULL OR OLD.status != 'in_progress') THEN
    NEW.otp_code = LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Fix auto_set_job_location function
CREATE OR REPLACE FUNCTION public.auto_set_job_location()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  -- If location is not provided, try to get it from user's profile
  IF NEW.location_lat IS NULL OR NEW.location_lng IS NULL THEN
    SELECT latitude, longitude, city 
    INTO NEW.location_lat, NEW.location_lng, NEW.location_address
    FROM public.profiles 
    WHERE id = NEW.client_id
    AND latitude IS NOT NULL 
    AND longitude IS NOT NULL;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Fix notify_new_message function
CREATE OR REPLACE FUNCTION public.notify_new_message()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
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