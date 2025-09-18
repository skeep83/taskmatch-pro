-- Setup test user with pro role and services using correct categories
-- Add pro role to test user
INSERT INTO user_roles (user_id, role) 
VALUES ('1a54cfa6-3200-4c2f-a502-6a4f745c31c5', 'pro')
ON CONFLICT (user_id, role) DO NOTHING;

-- Add pro services for test user using service_categories IDs
DO $$
BEGIN
  -- Сантехника
  IF NOT EXISTS (SELECT 1 FROM pro_services WHERE pro_id = '1a54cfa6-3200-4c2f-a502-6a4f745c31c5' AND category_id = '7fcb81f7-ecd3-46e5-8b81-f85e5009c4a5') THEN
    INSERT INTO pro_services (pro_id, category_id, base_price_cents, hourly_rate_cents, coverage_radius_km, location_lat, location_lng, is_active, response_time_minutes) 
    VALUES ('1a54cfa6-3200-4c2f-a502-6a4f745c31c5', '7fcb81f7-ecd3-46e5-8b81-f85e5009c4a5', 500000, 300000, 15, 47.0245, 28.8322, true, 30);
  END IF;
  
  -- Электрика
  IF NOT EXISTS (SELECT 1 FROM pro_services WHERE pro_id = '1a54cfa6-3200-4c2f-a502-6a4f745c31c5' AND category_id = 'b131ec56-3326-4929-9622-c2a04864f379') THEN
    INSERT INTO pro_services (pro_id, category_id, base_price_cents, hourly_rate_cents, coverage_radius_km, location_lat, location_lng, is_active, response_time_minutes) 
    VALUES ('1a54cfa6-3200-4c2f-a502-6a4f745c31c5', 'b131ec56-3326-4929-9622-c2a04864f379', 400000, 250000, 20, 47.0245, 28.8322, true, 60);
  END IF;
  
  -- Уборка
  IF NOT EXISTS (SELECT 1 FROM pro_services WHERE pro_id = '1a54cfa6-3200-4c2f-a502-6a4f745c31c5' AND category_id = '5adfaeb2-2dc1-467d-8115-9efe50aacf19') THEN
    INSERT INTO pro_services (pro_id, category_id, base_price_cents, hourly_rate_cents, coverage_radius_km, location_lat, location_lng, is_active, response_time_minutes) 
    VALUES ('1a54cfa6-3200-4c2f-a502-6a4f745c31c5', '5adfaeb2-2dc1-467d-8115-9efe50aacf19', 300000, 200000, 25, 47.0245, 28.8322, true, 120);
  END IF;
END $$;

-- Update profile data
UPDATE profiles SET
  first_name = COALESCE(first_name, 'Тест'),
  last_name = COALESCE(last_name, 'Специалист'),
  city = COALESCE(city, 'Кишинев'),
  country = COALESCE(country, 'RO'),
  latitude = COALESCE(latitude, 47.0245),
  longitude = COALESCE(longitude, 28.8322)
WHERE id = '1a54cfa6-3200-4c2f-a502-6a4f745c31c5';

-- Create wallet for test user if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM wallets WHERE pro_id = '1a54cfa6-3200-4c2f-a502-6a4f745c31c5') THEN
    INSERT INTO wallets (pro_id, balance_cents) VALUES ('1a54cfa6-3200-4c2f-a502-6a4f745c31c5', 0);
  END IF;
END $$;