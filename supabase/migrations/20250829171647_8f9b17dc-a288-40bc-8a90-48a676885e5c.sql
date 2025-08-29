-- Create notifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('job_match', 'job_update', 'payment', 'message', 'rating', 'system', 'price_proposal', 'job_application')),
  title TEXT NOT NULL,
  title_ro TEXT,
  message TEXT NOT NULL,
  message_ro TEXT,
  data JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_created_at ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_is_read ON public.notifications(user_id, is_read);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON public.notifications  
  FOR UPDATE USING (auth.uid() = user_id);

-- Admin and system can insert notifications
CREATE POLICY "System can insert notifications" ON public.notifications
  FOR INSERT WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR 
    auth.role() = 'service_role'
  );

-- Function to send notifications
CREATE OR REPLACE FUNCTION public.notify_user(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_data JSONB DEFAULT '{}',
  p_title_ro TEXT DEFAULT NULL,
  p_message_ro TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO public.notifications (
    user_id, type, title, message, data, title_ro, message_ro
  ) VALUES (
    p_user_id, p_type, p_title, p_message, p_data, p_title_ro, p_message_ro
  ) RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$;

-- Function to notify about new jobs for pros
CREATE OR REPLACE FUNCTION public.notify_pros_about_new_job()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pro_record RECORD;
  job_category_name TEXT;
  notification_data JSONB;
BEGIN
  -- Only notify for new jobs
  IF NEW.status != 'new' THEN
    RETURN NEW;
  END IF;
  
  -- Get category name
  SELECT label_ru INTO job_category_name
  FROM categories 
  WHERE id = NEW.category_id;
  
  -- Prepare notification data
  notification_data := jsonb_build_object(
    'job_id', NEW.id,
    'job_title', NEW.title,
    'category', job_category_name,
    'budget_min', NEW.budget_min_cents,
    'budget_max', NEW.budget_max_cents,
    'location', NEW.location_address
  );
  
  -- Find nearby pros in the same category
  FOR pro_record IN 
    SELECT DISTINCT ps.pro_id
    FROM pro_services ps
    WHERE ps.category_id = NEW.category_id
      AND ps.is_active = true
      AND (
        NEW.location_lat IS NULL OR NEW.location_lng IS NULL OR
        ps.location_lat IS NULL OR ps.location_lng IS NULL OR
        (
          6371 * acos(
            cos(radians(NEW.location_lat)) * 
            cos(radians(ps.location_lat)) * 
            cos(radians(ps.location_lng) - radians(NEW.location_lng)) + 
            sin(radians(NEW.location_lat)) * 
            sin(radians(ps.location_lat))
          ) <= COALESCE(ps.coverage_radius_km, 25)
        )
      )
  LOOP
    -- Send notification to each pro
    PERFORM public.notify_user(
      pro_record.pro_id,
      'job_match',
      'Новый заказ рядом с вами!',
      format('Новый заказ "%s" в категории %s', NEW.title, job_category_name),
      notification_data,
      'Comandă nouă în apropierea ta!',
      format('Comandă nouă "%s" în categoria %s', NEW.title, job_category_name)
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Function to notify about new job applications
CREATE OR REPLACE FUNCTION public.notify_about_job_application()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  job_record RECORD;
  pro_profile RECORD;
  notification_data JSONB;
BEGIN
  -- Get job details
  SELECT * INTO job_record FROM jobs WHERE id = NEW.job_id;
  
  -- Get pro profile
  SELECT first_name, last_name, full_name 
  INTO pro_profile 
  FROM profiles 
  WHERE id = NEW.pro_id;
  
  -- Prepare notification data
  notification_data := jsonb_build_object(
    'job_id', NEW.job_id,
    'application_id', NEW.id,
    'pro_id', NEW.pro_id,
    'pro_name', COALESCE(pro_profile.full_name, pro_profile.first_name || ' ' || pro_profile.last_name, 'Специалист')
  );
  
  -- Notify job owner about new application
  PERFORM public.notify_user(
    job_record.client_id,
    'job_application',
    'Новый отклик на ваш заказ',
    format('Специалист %s откликнулся на заказ "%s"', 
           COALESCE(pro_profile.full_name, pro_profile.first_name || ' ' || pro_profile.last_name, 'Специалист'),
           job_record.title),
    notification_data,
    'Răspuns nou la comanda ta',
    format('Specialistul %s a răspuns la comanda "%s"',
           COALESCE(pro_profile.full_name, pro_profile.first_name || ' ' || pro_profile.last_name, 'Specialist'),
           job_record.title)
  );
  
  RETURN NEW;
END;
$$;

-- Function to notify about price proposals
CREATE OR REPLACE FUNCTION public.notify_about_price_proposal()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  job_record RECORD;
  pro_profile RECORD;
  notification_data JSONB;
BEGIN
  -- Get job details
  SELECT * INTO job_record FROM jobs WHERE id = NEW.job_id;
  
  -- Get pro profile
  SELECT first_name, last_name, full_name 
  INTO pro_profile 
  FROM profiles 
  WHERE id = NEW.pro_id;
  
  -- Prepare notification data
  notification_data := jsonb_build_object(
    'job_id', NEW.job_id,
    'proposal_id', NEW.id,
    'pro_id', NEW.pro_id,
    'price_cents', NEW.price_cents,
    'pro_name', COALESCE(pro_profile.full_name, pro_profile.first_name || ' ' || pro_profile.last_name, 'Специалист')
  );
  
  -- Notify job owner about price proposal
  PERFORM public.notify_user(
    job_record.client_id,
    'price_proposal',
    'Новое предложение цены',
    format('Специалист %s предложил цену за заказ "%s"', 
           COALESCE(pro_profile.full_name, pro_profile.first_name || ' ' || pro_profile.last_name, 'Специалист'),
           job_record.title),
    notification_data,
    'Ofertă de preț nouă',
    format('Specialistul %s a oferit un preț pentru comanda "%s"',
           COALESCE(pro_profile.full_name, pro_profile.first_name || ' ' || pro_profile.last_name, 'Specialist'),
           job_record.title)
  );
  
  RETURN NEW;
END;
$$;

-- Function to notify about job updates
CREATE OR REPLACE FUNCTION public.notify_about_job_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  notification_data JSONB;
  status_title TEXT;
  status_message TEXT;
  status_title_ro TEXT;
  status_message_ro TEXT;
BEGIN
  -- Only process status changes
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  
  -- Prepare notification data
  notification_data := jsonb_build_object(
    'job_id', NEW.id,
    'old_status', OLD.status,
    'new_status', NEW.status
  );
  
  -- Define messages based on status
  CASE NEW.status
    WHEN 'accepted' THEN
      status_title := 'Заказ принят';
      status_message := format('Ваш заказ "%s" был принят специалистом', NEW.title);
      status_title_ro := 'Comandă acceptată';
      status_message_ro := format('Comanda ta "%s" a fost acceptată de un specialist', NEW.title);
    WHEN 'in_progress' THEN
      status_title := 'Заказ в работе';
      status_message := format('Работа по заказу "%s" началась', NEW.title);
      status_title_ro := 'Comandă în progres';
      status_message_ro := format('Lucrul la comanda "%s" a început', NEW.title);
    WHEN 'done' THEN
      status_title := 'Заказ выполнен';
      status_message := format('Заказ "%s" был выполнен', NEW.title);
      status_title_ro := 'Comandă finalizată';
      status_message_ro := format('Comanda "%s" a fost finalizată', NEW.title);
    WHEN 'cancelled' THEN
      status_title := 'Заказ отменен';
      status_message := format('Заказ "%s" был отменен', NEW.title);
      status_title_ro := 'Comandă anulată';
      status_message_ro := format('Comanda "%s" a fost anulată', NEW.title);
    ELSE
      RETURN NEW; -- No notification for other status changes
  END CASE;
  
  -- Notify client about status change
  PERFORM public.notify_user(
    NEW.client_id,
    'job_update',
    status_title,
    status_message,
    notification_data,
    status_title_ro,
    status_message_ro
  );
  
  -- Also notify the pro if assigned
  IF NEW.pro_id IS NOT NULL AND NEW.pro_id != NEW.client_id THEN
    PERFORM public.notify_user(
      NEW.pro_id,
      'job_update',
      status_title,
      status_message,
      notification_data,
      status_title_ro,
      status_message_ro
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_notify_pros_new_job ON public.jobs;
CREATE TRIGGER trigger_notify_pros_new_job
  AFTER INSERT ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_pros_about_new_job();

DROP TRIGGER IF EXISTS trigger_notify_job_application ON public.job_applications;
CREATE TRIGGER trigger_notify_job_application
  AFTER INSERT ON public.job_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_about_job_application();

DROP TRIGGER IF EXISTS trigger_notify_price_proposal ON public.job_price_proposals;
CREATE TRIGGER trigger_notify_price_proposal
  AFTER INSERT ON public.job_price_proposals
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_about_price_proposal();

DROP TRIGGER IF EXISTS trigger_notify_job_status_change ON public.jobs;
CREATE TRIGGER trigger_notify_job_status_change
  AFTER UPDATE ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_about_job_status_change();

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at_notifications()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notifications_updated_at ON public.notifications;
CREATE TRIGGER trigger_notifications_updated_at
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at_notifications();

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;