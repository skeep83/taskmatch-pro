-- Create test pro profiles with linked profiles
DO $$
DECLARE
  test_user1_id uuid := 'd3117828-1618-4c73-aee1-5968538d95d0'; -- existing user
  test_user2_id uuid := gen_random_uuid();
  test_user3_id uuid := gen_random_uuid();
  plumbing_cat_id uuid;
  electrical_cat_id uuid;
BEGIN
  -- Get category IDs
  SELECT id INTO plumbing_cat_id FROM public.categories WHERE key = 'plumbing' LIMIT 1;
  SELECT id INTO electrical_cat_id FROM public.categories WHERE key = 'electrical' LIMIT 1;

  -- Insert test profiles (only if they don't exist)
  INSERT INTO public.profiles (id, first_name, last_name, full_name, avatar_url, city, phone) VALUES
    (test_user2_id, 'Александр', 'Петров', 'Александр Петров', null, 'Chisinau', '+373 69 123456'),
    (test_user3_id, 'Мария', 'Иванова', 'Мария Иванова', null, 'Balti', '+373 69 654321')
  ON CONFLICT (id) DO NOTHING;

  -- Add user roles
  INSERT INTO public.user_roles (user_id, role) VALUES
    (test_user1_id, 'pro'),
    (test_user2_id, 'pro'), 
    (test_user3_id, 'pro')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Insert pro_profiles
  INSERT INTO public.pro_profiles (user_id, bio, radius_km, hourly_rate_cents, fixed_price_cents) VALUES
    (test_user1_id, 'Опытный сантехник с 7-летним стажем. Качественные услуги по доступным ценам.', 15, 4500, 8000),
    (test_user2_id, 'Профессиональный электрик. Быстро и качественно выполню любые электромонтажные работы.', 20, 5000, 10000),
    (test_user3_id, 'Клининговая служба. Уборка квартир, офисов, генеральная уборка.', 25, 3000, 6000)
  ON CONFLICT (user_id) DO NOTHING;

  -- Add pro categories links if categories exist
  IF plumbing_cat_id IS NOT NULL THEN
    INSERT INTO public.pro_categories (user_id, category_id) VALUES
      (test_user1_id, plumbing_cat_id)
    ON CONFLICT (user_id, category_id) DO NOTHING;
  END IF;

  IF electrical_cat_id IS NOT NULL THEN
    INSERT INTO public.pro_categories (user_id, category_id) VALUES
      (test_user2_id, electrical_cat_id)
    ON CONFLICT (user_id, category_id) DO NOTHING;
  END IF;

  -- Add some ratings
  INSERT INTO public.pro_rating_stats (pro_id, avg_score, rating_count, updated_at) VALUES
    (test_user1_id, 4.8, 15, now()),
    (test_user2_id, 4.6, 12, now()),
    (test_user3_id, 4.9, 8, now())
  ON CONFLICT (pro_id) DO UPDATE SET
    avg_score = EXCLUDED.avg_score,
    rating_count = EXCLUDED.rating_count,
    updated_at = EXCLUDED.updated_at;
END $$;