-- Fix translations table - add missing 'key' and 'value' columns if they don't exist
DO $$ 
BEGIN
    -- Add 'key' column if it doesn't exist (should be alias for translation_key)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'translations' 
        AND column_name = 'key'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.translations 
        ADD COLUMN key TEXT;
        
        -- Copy data from translation_key to key if translation_key exists
        UPDATE public.translations 
        SET key = translation_key 
        WHERE translation_key IS NOT NULL;
    END IF;
    
    -- Add 'value' column if it doesn't exist (should be alias for translation_value)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'translations' 
        AND column_name = 'value'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.translations 
        ADD COLUMN value TEXT;
        
        -- Copy data from translation_value to value if translation_value exists
        UPDATE public.translations 
        SET value = translation_value 
        WHERE translation_value IS NOT NULL;
    END IF;
END $$;