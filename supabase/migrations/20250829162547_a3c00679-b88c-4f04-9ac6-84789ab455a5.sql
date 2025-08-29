-- Создаем RLS политики только для pro_rating_stats (если таблица есть)
DO $$
BEGIN
    -- Включаем RLS для pro_rating_stats если не включен
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' AND tablename = 'pro_rating_stats'
    ) THEN
        CREATE TABLE public.pro_rating_stats (
            pro_id uuid NOT NULL PRIMARY KEY,
            avg_score numeric NOT NULL DEFAULT 0,
            rating_count integer NOT NULL DEFAULT 0,
            updated_at timestamp with time zone NOT NULL DEFAULT now()
        );
    END IF;
    
    -- Включаем RLS
    ALTER TABLE public.pro_rating_stats ENABLE ROW LEVEL SECURITY;
    
    -- Создаем политику только если не существует
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'pro_rating_stats' 
        AND policyname = 'pro_rating_stats_public_select'
    ) THEN
        CREATE POLICY "pro_rating_stats_public_select" 
        ON public.pro_rating_stats 
        FOR SELECT 
        USING (true);
    END IF;
END $$;