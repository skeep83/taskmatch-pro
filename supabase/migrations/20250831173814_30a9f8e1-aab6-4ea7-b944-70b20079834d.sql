-- Add pro profile for existing user
DO $$
DECLARE
  test_user_id uuid := 'd3117828-1618-4c73-aee1-5968538d95d0'; -- existing user
  plumbing_cat_id uuid;
BEGIN
  -- Get category ID
  SELECT id INTO plumbing_cat_id FROM public.categories WHERE key = 'plumbing' LIMIT 1;

  -- Add user role
  INSERT INTO public.user_roles (user_id, role) VALUES
    (test_user_id, 'pro')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Insert pro_profile for existing user
  INSERT INTO public.pro_profiles (user_id, bio, radius_km, hourly_rate_cents, fixed_price_cents) VALUES
    (test_user_id, 'Опытный специалист с многолетним стажем. Качественные услуги по доступным ценам.', 15, 4500, 8000)
  ON CONFLICT (user_id) DO UPDATE SET
    bio = EXCLUDED.bio,
    radius_km = EXCLUDED.radius_km,
    hourly_rate_cents = EXCLUDED.hourly_rate_cents,
    fixed_price_cents = EXCLUDED.fixed_price_cents;

  -- Add category link if category exists
  IF plumbing_cat_id IS NOT NULL THEN
    INSERT INTO public.pro_categories (user_id, category_id) VALUES
      (test_user_id, plumbing_cat_id)
    ON CONFLICT (user_id, category_id) DO NOTHING;
  END IF;

  -- Add rating stats
  INSERT INTO public.pro_rating_stats (pro_id, avg_score, rating_count, updated_at) VALUES
    (test_user_id, 4.8, 15, now())
  ON CONFLICT (pro_id) DO UPDATE SET
    avg_score = EXCLUDED.avg_score,
    rating_count = EXCLUDED.rating_count,
    updated_at = EXCLUDED.updated_at;
END $$;