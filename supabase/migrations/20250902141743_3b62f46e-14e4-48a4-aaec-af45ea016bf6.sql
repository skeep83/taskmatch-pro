-- Update approve and reject functions to handle logging properly
CREATE OR REPLACE FUNCTION public.approve_pro_upgrade_request(_request_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _user_id UUID;
  _current_status TEXT;
  _profile_data JSONB;
  _admin_user_id UUID;
BEGIN
  -- Get admin user ID
  _admin_user_id := auth.uid();
  
  -- Check if user has admin role
  IF NOT has_role(_admin_user_id, 'admin'::app_role) THEN
    RETURN FALSE;
  END IF;
  
  -- Get request details
  SELECT user_id, status, profile_data INTO _user_id, _current_status, _profile_data
  FROM public.pro_upgrade_requests
  WHERE id = _request_id;
  
  -- Check if request exists and is pending
  IF _user_id IS NULL OR _current_status != 'pending' THEN
    RETURN FALSE;
  END IF;
  
  -- Add pro role (insert only if not exists)
  INSERT INTO public.user_roles (user_id, role, upgraded_at)
  VALUES (_user_id, 'pro'::app_role, now())
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Update request status
  UPDATE public.pro_upgrade_requests 
  SET 
    status = 'approved',
    reviewed_at = now(),
    reviewed_by = _admin_user_id,
    updated_at = now()
  WHERE id = _request_id;
  
  -- Send notification to user
  PERFORM public.notify_user(
    _user_id,
    'pro_upgrade_approved',
    'Заявка одобрена!',
    'Поздравляем! Ваша заявка на статус специалиста была одобрена. Теперь вы можете принимать заказы.',
    jsonb_build_object('request_id', _request_id, 'approved_by', _admin_user_id),
    'Cererea aprobată!',
    'Felicitări! Cererea dumneavoastră pentru statutul de specialist a fost aprobată. Acum puteți accepta comenzi.'
  );
  
  -- Log admin action only if we have an admin user
  IF _admin_user_id IS NOT NULL THEN
    INSERT INTO public.admin_audit_log (
      admin_user_id,
      action,
      resource_type,
      resource_id,
      new_values
    ) VALUES (
      _admin_user_id,
      'approve_pro_upgrade',
      'pro_upgrade_requests',
      _request_id::text,
      jsonb_build_object('user_id', _user_id, 'approved_by', _admin_user_id)
    );
  END IF;
  
  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_pro_upgrade_request(_request_id uuid, _reason text DEFAULT NULL::text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _user_id UUID;
  _current_status TEXT;
  _profile_data JSONB;
  _admin_user_id UUID;
BEGIN
  -- Get admin user ID
  _admin_user_id := auth.uid();
  
  -- Check if user has admin role
  IF NOT has_role(_admin_user_id, 'admin'::app_role) THEN
    RETURN FALSE;
  END IF;
  
  -- Get request details
  SELECT user_id, status, profile_data INTO _user_id, _current_status, _profile_data
  FROM public.pro_upgrade_requests
  WHERE id = _request_id;
  
  -- Check if request exists and is pending
  IF _user_id IS NULL OR _current_status != 'pending' THEN
    RETURN FALSE;
  END IF;
  
  -- Update request status
  UPDATE public.pro_upgrade_requests 
  SET 
    status = 'rejected',
    reviewed_at = now(),
    reviewed_by = _admin_user_id,
    rejection_reason = _reason,
    updated_at = now()
  WHERE id = _request_id;
  
  -- Send notification to user
  PERFORM public.notify_user(
    _user_id,
    'pro_upgrade_rejected',
    'Заявка отклонена',
    CASE 
      WHEN _reason IS NOT NULL THEN 
        format('Ваша заявка на статус специалиста была отклонена. Причина: %s. Вы можете исправить недостатки и подать заявку повторно.', _reason)
      ELSE 
        'Ваша заявка на статус специалиста была отклонена. Вы можете исправить недостатки и подать заявку повторно.'
    END,
    jsonb_build_object('request_id', _request_id, 'rejected_by', _admin_user_id, 'reason', _reason),
    'Cererea respinsă',
    CASE 
      WHEN _reason IS NOT NULL THEN 
        format('Cererea dumneavoastră pentru statutul de specialist a fost respinsă. Motivul: %s. Puteți corecta deficiențele și să reaplikați.', _reason)
      ELSE 
        'Cererea dumneavoastră pentru statutul de specialist a fost respinsă. Puteți corecta deficiențele și să reaplikați.'
    END
  );
  
  -- Log admin action only if we have an admin user
  IF _admin_user_id IS NOT NULL THEN
    INSERT INTO public.admin_audit_log (
      admin_user_id,
      action,
      resource_type,
      resource_id,
      new_values
    ) VALUES (
      _admin_user_id,
      'reject_pro_upgrade',
      'pro_upgrade_requests',
      _request_id::text,
      jsonb_build_object('user_id', _user_id, 'rejected_by', _admin_user_id, 'reason', _reason)
    );
  END IF;
  
  RETURN TRUE;
END;
$$;