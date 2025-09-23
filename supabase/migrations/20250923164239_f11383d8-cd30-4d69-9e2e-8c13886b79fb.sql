-- Создание новой схемы для машины состояний ServiceHub

-- Enum для статусов заявок
CREATE TYPE public.job_status_new AS ENUM (
  'Draft',
  'Published', 
  'Assigned',
  'InProgress',
  'Submitted',
  'Completed',
  'Dispute',
  'Cancelled'
);

-- Enum для типов откликов
CREATE TYPE public.response_type AS ENUM (
  'regular',
  'proposal',
  'bid'
);

-- Обновляем таблицу jobs с новыми полями
ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS status_new public.job_status_new DEFAULT 'Draft',
ADD COLUMN IF NOT EXISTS milestones jsonb DEFAULT '[]',
ADD COLUMN IF NOT EXISTS change_requests jsonb DEFAULT '[]',
ADD COLUMN IF NOT EXISTS acceptance_deadline timestamptz,
ADD COLUMN IF NOT EXISTS auto_accepted boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS dispute_reason text,
ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS media_urls text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS deadline timestamptz;

-- Создаем таблицу откликов (responses)
CREATE TABLE IF NOT EXISTS public.job_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL,
  response_type public.response_type NOT NULL DEFAULT 'regular',
  price_cents integer NOT NULL,
  estimated_hours integer,
  warranty_days integer DEFAULT 30,
  eta_date timestamptz,
  comment text,
  attachments text[] DEFAULT '{}',
  template_used text,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Создаем таблицу споров
CREATE TABLE IF NOT EXISTS public.disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  initiator_id uuid NOT NULL,
  respondent_id uuid NOT NULL,
  reason text NOT NULL,
  evidence_urls text[] DEFAULT '{}',
  admin_notes text,
  resolution text,
  status text DEFAULT 'Open' CHECK (status IN ('Open', 'InReview', 'Resolved', 'Closed')),
  resolved_at timestamptz,
  resolved_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Создаем таблицу шаблонов откликов
CREATE TABLE IF NOT EXISTS public.response_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  category_id uuid,
  price_cents integer,
  warranty_days integer DEFAULT 30,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Создаем таблицу для отслеживания переходов статусов
CREATE TABLE IF NOT EXISTS public.job_status_transitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  from_status text,
  to_status text NOT NULL,
  triggered_by uuid NOT NULL,
  reason text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_job_responses_job_id ON public.job_responses(job_id);
CREATE INDEX IF NOT EXISTS idx_job_responses_provider ON public.job_responses(provider_id);
CREATE INDEX IF NOT EXISTS idx_job_responses_status ON public.job_responses(status);
CREATE INDEX IF NOT EXISTS idx_disputes_job_id ON public.disputes(job_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON public.disputes(status);
CREATE INDEX IF NOT EXISTS idx_jobs_status_new ON public.jobs(status_new);
CREATE INDEX IF NOT EXISTS idx_jobs_tags ON public.jobs USING gin(tags);

-- RLS политики для job_responses
ALTER TABLE public.job_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "job_responses_insert_provider" ON public.job_responses
FOR INSERT WITH CHECK (provider_id = auth.uid());

CREATE POLICY "job_responses_select_involved_or_admin" ON public.job_responses
FOR SELECT USING (
  provider_id = auth.uid() OR 
  EXISTS(SELECT 1 FROM public.jobs j WHERE j.id = job_id AND j.client_id = auth.uid()) OR
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "job_responses_update_provider_or_admin" ON public.job_responses
FOR UPDATE USING (
  provider_id = auth.uid() OR 
  has_role(auth.uid(), 'admin'::app_role)
);

-- RLS политики для disputes
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "disputes_insert_involved" ON public.disputes
FOR INSERT WITH CHECK (
  initiator_id = auth.uid() AND 
  EXISTS(SELECT 1 FROM public.jobs j WHERE j.id = job_id AND (j.client_id = auth.uid() OR j.pro_id = auth.uid()))
);

CREATE POLICY "disputes_select_involved_or_admin" ON public.disputes
FOR SELECT USING (
  initiator_id = auth.uid() OR 
  respondent_id = auth.uid() OR
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "disputes_update_admin" ON public.disputes
FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS политики для response_templates
ALTER TABLE public.response_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "response_templates_owner" ON public.response_templates
FOR ALL USING (provider_id = auth.uid());

-- RLS политики для job_status_transitions
ALTER TABLE public.job_status_transitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "job_status_transitions_select_involved_or_admin" ON public.job_status_transitions
FOR SELECT USING (
  triggered_by = auth.uid() OR
  EXISTS(SELECT 1 FROM public.jobs j WHERE j.id = job_id AND (j.client_id = auth.uid() OR j.pro_id = auth.uid())) OR
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "job_status_transitions_insert_involved" ON public.job_status_transitions
FOR INSERT WITH CHECK (
  triggered_by = auth.uid() AND
  EXISTS(SELECT 1 FROM public.jobs j WHERE j.id = job_id AND (j.client_id = auth.uid() OR j.pro_id = auth.uid()))
);

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггеры для updated_at
CREATE TRIGGER job_responses_updated_at 
  BEFORE UPDATE ON public.job_responses 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER disputes_updated_at 
  BEFORE UPDATE ON public.disputes 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER response_templates_updated_at 
  BEFORE UPDATE ON public.response_templates 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Функция для управления переходами статусов
CREATE OR REPLACE FUNCTION public.transition_job_status(
  _job_id uuid,
  _new_status public.job_status_new,
  _reason text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _current_status public.job_status_new;
  _user_id uuid;
  _client_id uuid;
  _pro_id uuid;
  _can_transition boolean := false;
BEGIN
  _user_id := auth.uid();
  
  -- Получаем текущий статус и участников
  SELECT status_new, client_id, pro_id 
  INTO _current_status, _client_id, _pro_id
  FROM public.jobs 
  WHERE id = _job_id;
  
  -- Проверяем права на переход
  CASE _new_status
    WHEN 'Published' THEN
      _can_transition := (_current_status = 'Draft' AND _user_id = _client_id);
    WHEN 'Assigned' THEN
      _can_transition := (_current_status = 'Published' AND _user_id = _client_id);
    WHEN 'InProgress' THEN
      _can_transition := (_current_status = 'Assigned' AND _user_id = _pro_id);
    WHEN 'Submitted' THEN
      _can_transition := (_current_status = 'InProgress' AND _user_id = _pro_id);
    WHEN 'Completed' THEN
      _can_transition := (_current_status = 'Submitted' AND (_user_id = _client_id OR _reason = 'auto_accept'));
    WHEN 'Dispute' THEN
      _can_transition := (_user_id = _client_id OR _user_id = _pro_id);
    WHEN 'Cancelled' THEN
      _can_transition := (_user_id = _client_id OR has_role(_user_id, 'admin'::app_role));
    ELSE
      _can_transition := false;
  END CASE;
  
  IF NOT _can_transition THEN
    RETURN false;
  END IF;
  
  -- Выполняем переход
  UPDATE public.jobs 
  SET status_new = _new_status,
      updated_at = now(),
      acceptance_deadline = CASE 
        WHEN _new_status = 'Submitted' THEN now() + interval '72 hours'
        ELSE acceptance_deadline
      END,
      auto_accepted = CASE 
        WHEN _reason = 'auto_accept' THEN true
        ELSE auto_accepted
      END
  WHERE id = _job_id;
  
  -- Записываем переход в историю
  INSERT INTO public.job_status_transitions (job_id, from_status, to_status, triggered_by, reason)
  VALUES (_job_id, _current_status::text, _new_status::text, _user_id, _reason);
  
  -- Дополнительные действия при переходах
  IF _new_status = 'Assigned' THEN
    -- Отклоняем все остальные отклики
    UPDATE public.job_responses 
    SET status = 'declined', updated_at = now()
    WHERE job_id = _job_id AND provider_id != _pro_id AND status = 'pending';
  END IF;
  
  RETURN true;
END;
$$;