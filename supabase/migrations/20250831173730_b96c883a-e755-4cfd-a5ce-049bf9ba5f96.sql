-- Create pro profile for existing user
DO $$
DECLARE
  existing_user_id uuid := 'd3117828-1618-4c73-aee1-5968538d95d0';
  plumbing_cat_id uuid;
BEGIN
  -- Get plumbing category ID
  SELECT id INTO plumbing_cat_id FROM public.categories WHERE key = 'plumbing' LIMIT 1;

  -- Add pro role for existing user
  INSERT INTO public.user_roles (user_id, role) VALUES
    (existing_user_id, 'pro')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Insert pro_profile for existing user
  INSERT INTO public.pro_profiles (user_id, bio, radius_km, hourly_rate_cents, fixed_price_cents) VALUES
    (existing_user_id, 'Опытный специалист с многолетним стажем работы. Качественные услуги по доступным ценам.', 15, 4500, 8000)
  ON CONFLICT (user_id) DO NOTHING;

  -- Add category link if category exists
  IF plumbing_cat_id IS NOT NULL THEN
    INSERT INTO public.pro_categories (user_id, category_id) VALUES
      (existing_user_id, plumbing_cat_id)
    ON CONFLICT (user_id, category_id) DO NOTHING;
  END IF;

  -- Add rating stats
  INSERT INTO public.pro_rating_stats (pro_id, avg_score, rating_count, updated_at) VALUES
    (existing_user_id, 4.8, 15, now())
  ON CONFLICT (pro_id) DO UPDATE SET
    avg_score = EXCLUDED.avg_score,
    rating_count = EXCLUDED.rating_count,
    updated_at = EXCLUDED.updated_at;
END $$;