-- Создаем RLS политики для pro_rating_stats
ALTER TABLE public.pro_rating_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pro_rating_stats_public_select" 
ON public.pro_rating_stats 
FOR SELECT 
USING (true);

-- Создаем RLS политики для portfolio_items
ALTER TABLE public.portfolio_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "portfolio_items_public_select" 
ON public.portfolio_items 
FOR SELECT 
USING (true);

CREATE POLICY "portfolio_items_owner_insert" 
ON public.portfolio_items 
FOR INSERT 
WITH CHECK (pro_id = auth.uid());

CREATE POLICY "portfolio_items_owner_update" 
ON public.portfolio_items 
FOR UPDATE 
USING (pro_id = auth.uid());

CREATE POLICY "portfolio_items_owner_delete" 
ON public.portfolio_items 
FOR DELETE 
USING (pro_id = auth.uid());