-- Setup test user with pro role and services
-- Add pro role to test user (user_roles table has unique constraint on user_id, role)
INSERT INTO user_roles (user_id, role) 
VALUES ('1a54cfa6-3200-4c2f-a502-6a4f745c31c5', 'pro');

-- Add pro services for test user (need to check for existing records first)
DO $$
BEGIN
  -- Insert services only if they don't exist
  IF NOT EXISTS (SELECT 1 FROM pro_services WHERE pro_id = '1a54cfa6-3200-4c2f-a502-6a4f745c31c5' AND category_id = '09a86403-fd3d-4897-8c51-e7a46e27d633') THEN
    INSERT INTO pro_services (pro_id, category_id, base_price_cents, hourly_rate_cents, coverage_radius_km, location_lat, location_lng, is_active, response_time_minutes) 
    VALUES ('1a54cfa6-3200-4c2f-a502-6a4f745c31c5', '09a86403-fd3d-4897-8c51-e7a46e27d633', 500000, 300000, 15, 47.0245, 28.8322, true, 30);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pro_services WHERE pro_id = '1a54cfa6-3200-4c2f-a502-6a4f745c31c5' AND category_id = 'e8bf285e-f7d2-4111-8992-e309200a3f41') THEN
    INSERT INTO pro_services (pro_id, category_id, base_price_cents, hourly_rate_cents, coverage_radius_km, location_lat, location_lng, is_active, response_time_minutes) 
    VALUES ('1a54cfa6-3200-4c2f-a502-6a4f745c31c5', 'e8bf285e-f7d2-4111-8992-e309200a3f41', 400000, 250000, 20, 47.0245, 28.8322, true, 60);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pro_services WHERE pro_id = '1a54cfa6-3200-4c2f-a502-6a4f745c31c5' AND category_id = '30ed8063-e973-4cf1-b9d1-cff38037969d') THEN
    INSERT INTO pro_services (pro_id, category_id, base_price_cents, hourly_rate_cents, coverage_radius_km, location_lat, location_lng, is_active, response_time_minutes) 
    VALUES ('1a54cfa6-3200-4c2f-a502-6a4f745c31c5', '30ed8063-e973-4cf1-b9d1-cff38037969d', 300000, 200000, 25, 47.0245, 28.8322, true, 120);
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