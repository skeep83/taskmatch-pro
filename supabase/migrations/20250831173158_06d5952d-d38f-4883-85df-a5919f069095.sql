-- Add foreign key relationship between pro_profiles and profiles
ALTER TABLE public.pro_profiles 
ADD CONSTRAINT fk_pro_profiles_user_id 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Ensure we have some test data for categories if none exist
INSERT INTO public.categories (id, key, label_ru, label_ro) VALUES 
  (gen_random_uuid(), 'plumbing', 'Сантехника', 'Instalații sanitare'),
  (gen_random_uuid(), 'electrical', 'Электрика', 'Electricitate'),
  (gen_random_uuid(), 'cleaning', 'Уборка', 'Curățenie')
ON CONFLICT (key) DO NOTHING;

-- Add some test pro_profiles and profiles if needed for testing
DO $$
DECLARE
  test_user_id uuid;
  category_id uuid;
BEGIN
  -- Create a test profile if none exist
  INSERT INTO public.profiles (id, first_name, last_name, full_name, avatar_url, city)
  VALUES (gen_random_uuid(), 'Иван', 'Сидоров', 'Иван Сидоров', null, 'Chisinau')
  ON CONFLICT (id) DO NOTHING
  RETURNING id INTO test_user_id;
  
  -- Get the user id if already exists
  IF test_user_id IS NULL THEN
    SELECT id INTO test_user_id FROM public.profiles LIMIT 1;
  END IF;
  
  -- Get a category
  SELECT id INTO category_id FROM public.categories LIMIT 1;
  
  -- Create pro_profile if we have a user
  IF test_user_id IS NOT NULL THEN
    INSERT INTO public.pro_profiles (user_id, bio, radius_km, hourly_rate_cents)
    VALUES (test_user_id, 'Опытный специалист с 5-летним стажем', 15, 5000)
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Add user role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (test_user_id, 'pro')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END $$;