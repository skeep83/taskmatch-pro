-- Setup test user with pro role and services
-- Add pro role to test user
INSERT INTO user_roles (user_id, role) 
VALUES ('1a54cfa6-3200-4c2f-a502-6a4f745c31c5', 'pro') 
ON CONFLICT (user_id, role) DO NOTHING;

-- Add pro services for test user  
INSERT INTO pro_services (pro_id, category_id, base_price_cents, hourly_rate_cents, coverage_radius_km, location_lat, location_lng, is_active, response_time_minutes) 
VALUES 
  ('1a54cfa6-3200-4c2f-a502-6a4f745c31c5', '09a86403-fd3d-4897-8c51-e7a46e27d633', 500000, 300000, 15, 47.0245, 28.8322, true, 30),
  ('1a54cfa6-3200-4c2f-a502-6a4f745c31c5', 'e8bf285e-f7d2-4111-8992-e309200a3f41', 400000, 250000, 20, 47.0245, 28.8322, true, 60),
  ('1a54cfa6-3200-4c2f-a502-6a4f745c31c5', '30ed8063-e973-4cf1-b9d1-cff38037969d', 300000, 200000, 25, 47.0245, 28.8322, true, 120)
ON CONFLICT (pro_id, category_id) DO NOTHING;

-- Add profile data if missing
INSERT INTO profiles (id, first_name, last_name, city, country, latitude, longitude)
VALUES ('1a54cfa6-3200-4c2f-a502-6a4f745c31c5', 'Тест', 'Специалист', 'Кишинев', 'RO', 47.0245, 28.8322)
ON CONFLICT (id) DO UPDATE SET
  first_name = COALESCE(profiles.first_name, EXCLUDED.first_name),
  last_name = COALESCE(profiles.last_name, EXCLUDED.last_name),
  city = COALESCE(profiles.city, EXCLUDED.city),
  country = COALESCE(profiles.country, EXCLUDED.country),
  latitude = COALESCE(profiles.latitude, EXCLUDED.latitude),
  longitude = COALESCE(profiles.longitude, EXCLUDED.longitude);

-- Create wallet for test user
INSERT INTO wallets (pro_id, balance_cents)
VALUES ('1a54cfa6-3200-4c2f-a502-6a4f745c31c5', 0)
ON CONFLICT (pro_id) DO NOTHING;