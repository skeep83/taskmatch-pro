-- Fix approve_pro_upgrade_request function to handle user_roles table correctly
CREATE OR REPLACE FUNCTION public.approve_pro_upgrade_request(_request_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _user_id UUID;
  _current_status TEXT;
  _user_name TEXT;
BEGIN
  -- Check if user has admin role
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN FALSE;
  END IF;
  
  -- Get request details
  SELECT user_id, status INTO _user_id, _current_status
  FROM public.pro_upgrade_requests
  WHERE id = _request_id;
  
  -- Check if request exists and is pending
  IF _user_id IS NULL OR _current_status != 'pending' THEN
    RETURN FALSE;
  END IF;
  
  -- Get user name for notification
  SELECT COALESCE(full_name, first_name || ' ' || last_name, 'Пользователь') 
  INTO _user_name
  FROM public.profiles 
  WHERE id = _user_id;
  
  -- Add pro role (insert only, no conflict handling needed)
  INSERT INTO public.user_roles (user_id, role, upgraded_at)
  VALUES (_user_id, 'pro'::app_role, now());
  
  -- Update request status
  UPDATE public.pro_upgrade_requests 
  SET 
    status = 'approved',
    reviewed_at = now(),
    reviewed_by = auth.uid(),
    updated_at = now()
  WHERE id = _request_id;
  
  -- Send notification to user
  PERFORM public.notify_user(
    _user_id,
    'pro_upgrade_approved',
    'Заявка на статус специалиста одобрена! 🎉',
    'Поздравляем! Ваша заявка на получение статуса специалиста была одобрена. Теперь вы можете принимать заказы и зарабатывать на платформе.',
    jsonb_build_object(
      'request_id', _request_id,
      'approved_by', auth.uid(),
      'approved_at', now()
    ),
    'Cererea pentru statutul de specialist a fost aprobată! 🎉',
    'Felicitări! Cererea dvs. pentru obținerea statutului de specialist a fost aprobată. Acum puteți accepta comenzi și câștiga pe platformă.'
  );
  
  -- Log admin action
  PERFORM public.log_admin_action(
    'approve_pro_upgrade',
    'pro_upgrade_requests',
    _request_id::text,
    NULL,
    jsonb_build_object('user_id', _user_id, 'approved_by', auth.uid())
  );
  
  RETURN TRUE;
END;
$function$;

-- Fix reject_pro_upgrade_request function to include notifications
CREATE OR REPLACE FUNCTION public.reject_pro_upgrade_request(_request_id uuid, _reason text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _user_id UUID;
  _current_status TEXT;
  _user_name TEXT;
BEGIN
  -- Check if user has admin role
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN FALSE;
  END IF;
  
  -- Get request details
  SELECT user_id, status INTO _user_id, _current_status
  FROM public.pro_upgrade_requests
  WHERE id = _request_id;
  
  -- Check if request exists and is pending
  IF _user_id IS NULL OR _current_status != 'pending' THEN
    RETURN FALSE;
  END IF;
  
  -- Get user name for notification
  SELECT COALESCE(full_name, first_name || ' ' || last_name, 'Пользователь') 
  INTO _user_name
  FROM public.profiles 
  WHERE id = _user_id;
  
  -- Update request status
  UPDATE public.pro_upgrade_requests 
  SET 
    status = 'rejected',
    reviewed_at = now(),
    reviewed_by = auth.uid(),
    rejection_reason = _reason,
    updated_at = now()
  WHERE id = _request_id;
  
  -- Send notification to user
  PERFORM public.notify_user(
    _user_id,
    'pro_upgrade_rejected',
    'Заявка на статус специалиста отклонена',
    CASE 
      WHEN _reason IS NOT NULL THEN 
        'Ваша заявка на получение статуса специалиста была отклонена. Причина: ' || _reason || '. Вы можете исправить недостатки и подать заявку повторно.'
      ELSE 
        'Ваша заявка на получение статуса специалиста была отклонена. Вы можете исправить недостатки и подать заявку повторно.'
    END,
    jsonb_build_object(
      'request_id', _request_id,
      'rejected_by', auth.uid(),
      'rejected_at', now(),
      'reason', _reason
    ),
    'Cererea pentru statutul de specialist a fost respinsă',
    CASE 
      WHEN _reason IS NOT NULL THEN 
        'Cererea dvs. pentru obținerea statutului de specialist a fost respinsă. Motivul: ' || _reason || '. Puteți corecta deficiențele și depune din nou cererea.'
      ELSE 
        'Cererea dvs. pentru obținerea statutului de specialist a fost respinsă. Puteți corecta deficiențele și depune din nou cererea.'
    END
  );
  
  -- Log admin action
  PERFORM public.log_admin_action(
    'reject_pro_upgrade',
    'pro_upgrade_requests',
    _request_id::text,
    NULL,
    jsonb_build_object('user_id', _user_id, 'rejected_by', auth.uid(), 'reason', _reason)
  );
  
  RETURN TRUE;
END;
$function$;