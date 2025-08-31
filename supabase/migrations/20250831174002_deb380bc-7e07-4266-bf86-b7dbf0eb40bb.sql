-- Add test pro profile for existing user
INSERT INTO public.pro_profiles (user_id, bio, radius_km, hourly_rate_cents, fixed_price_cents) VALUES
  ('d3117828-1618-4c73-aee1-5968538d95d0', 'Опытный специалист с многолетним стажем. Качественные услуги по доступным ценам.', 15, 4500, 8000)
ON CONFLICT (user_id) DO UPDATE SET
  bio = EXCLUDED.bio;

-- Add user role
INSERT INTO public.user_roles (user_id, role) VALUES
  ('d3117828-1618-4c73-aee1-5968538d95d0', 'pro')
ON CONFLICT (user_id, role) DO NOTHING;

-- Add rating stats
INSERT INTO public.pro_rating_stats (pro_id, avg_score, rating_count, updated_at) VALUES
  ('d3117828-1618-4c73-aee1-5968538d95d0', 4.8, 15, now())
ON CONFLICT (pro_id) DO UPDATE SET
  avg_score = EXCLUDED.avg_score,
  rating_count = EXCLUDED.rating_count;