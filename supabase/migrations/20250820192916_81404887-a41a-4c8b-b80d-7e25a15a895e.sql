-- Обновляем настройки платформы для использования молдавского лея по умолчанию
UPDATE platform_settings 
SET value = '"MDL"'::jsonb
WHERE key = 'default_currency';

-- Добавляем в поддерживаемые валюты все активные валюты
UPDATE platform_settings 
SET value = '["MDL", "USD", "EUR", "RON", "RUB"]'::jsonb
WHERE key = 'supported_currencies';

-- Если настройки не существуют, создаем их
INSERT INTO platform_settings (key, value, category, description)
VALUES 
  ('default_currency', '"MDL"'::jsonb, 'currency', 'Валюта по умолчанию для платформы'),
  ('supported_currencies', '["MDL", "USD", "EUR", "RON", "RUB"]'::jsonb, 'currency', 'Поддерживаемые валюты платформы')
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = now();