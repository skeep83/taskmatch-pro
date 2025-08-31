-- Add test categories if they don't exist
INSERT INTO public.categories (id, key, label_ru, label_ro) VALUES 
  ('550e8400-e29b-41d4-a716-446655440001', 'plumbing', 'Сантехника', 'Instalații sanitare'),
  ('550e8400-e29b-41d4-a716-446655440002', 'electrical', 'Электрика', 'Electricitate'),
  ('550e8400-e29b-41d4-a716-446655440003', 'cleaning', 'Уборка', 'Curățenie')
ON CONFLICT (key) DO NOTHING;