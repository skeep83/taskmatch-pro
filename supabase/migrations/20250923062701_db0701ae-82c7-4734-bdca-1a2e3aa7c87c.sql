-- Создаем таблицу pro_categories для связи специалистов с категориями услуг
CREATE TABLE IF NOT EXISTS public.pro_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, category_id)
);

-- Включаем RLS
ALTER TABLE public.pro_categories ENABLE ROW LEVEL SECURITY;

-- Создаем политики RLS
CREATE POLICY "Specialists can manage their own categories"
ON public.pro_categories
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public can view pro categories"
ON public.pro_categories
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage all pro categories"
ON public.pro_categories
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Создаем индексы для производительности
CREATE INDEX IF NOT EXISTS idx_pro_categories_user_id ON public.pro_categories(user_id);
CREATE INDEX IF NOT EXISTS idx_pro_categories_category_id ON public.pro_categories(category_id);