-- Setup test user with pro role and services - simple inserts only
-- Add pro role to test user  
INSERT INTO user_roles (user_id, role) 
VALUES ('1a54cfa6-3200-4c2f-a502-6a4f745c31c5', 'pro')
ON CONFLICT (user_id, role) DO NOTHING;

-- Simple inserts without ON CONFLICT for pro_services
INSERT INTO pro_services (pro_id, category_id, base_price_cents, hourly_rate_cents, coverage_radius_km, location_lat, location_lng, is_active, response_time_minutes) 
SELECT '1a54cfa6-3200-4c2f-a502-6a4f745c31c5', '7fcb81f7-ecd3-46e5-8b81-f85e5009c4a5', 500000, 300000, 15, 47.0245, 28.8322, true, 30
WHERE NOT EXISTS (SELECT 1 FROM pro_services WHERE pro_id = '1a54cfa6-3200-4c2f-a502-6a4f745c31c5' AND category_id = '7fcb81f7-ecd3-46e5-8b81-f85e5009c4a5');

INSERT INTO pro_services (pro_id, category_id, base_price_cents, hourly_rate_cents, coverage_radius_km, location_lat, location_lng, is_active, response_time_minutes) 
SELECT '1a54cfa6-3200-4c2f-a502-6a4f745c31c5', 'b131ec56-3326-4929-9622-c2a04864f379', 400000, 250000, 20, 47.0245, 28.8322, true, 60
WHERE NOT EXISTS (SELECT 1 FROM pro_services WHERE pro_id = '1a54cfa6-3200-4c2f-a502-6a4f745c31c5' AND category_id = 'b131ec56-3326-4929-9622-c2a04864f379');

INSERT INTO pro_services (pro_id, category_id, base_price_cents, hourly_rate_cents, coverage_radius_km, location_lat, location_lng, is_active, response_time_minutes) 
SELECT '1a54cfa6-3200-4c2f-a502-6a4f745c31c5', '5adfaeb2-2dc1-467d-8115-9efe50aacf19', 300000, 200000, 25, 47.0245, 28.8322, true, 120
WHERE NOT EXISTS (SELECT 1 FROM pro_services WHERE pro_id = '1a54cfa6-3200-4c2f-a502-6a4f745c31c5' AND category_id = '5adfaeb2-2dc1-467d-8115-9efe50aacf19');