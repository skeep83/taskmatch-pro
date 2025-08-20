-- Add Moldovan Leu to currencies
INSERT INTO public.currencies (code, name_en, name_ru, name_ro, symbol, exchange_rate, is_base, is_active, decimal_places) 
VALUES ('MDL', 'Moldovan Leu', 'Молдавский лей', 'Leu moldovenesc', 'L', 18.5, false, true, 2);