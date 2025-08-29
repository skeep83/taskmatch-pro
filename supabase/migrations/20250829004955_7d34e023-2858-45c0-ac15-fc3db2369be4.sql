-- Create categories with proper UUIDs
INSERT INTO public.categories (id, key, label_ru, label_ro) VALUES
('b131ec56-3326-4929-9622-c2a04864f379', 'electrical', 'Электрика', 'Electricitate'),
('a1b2c3d4-5678-9012-3456-789012345678', 'plumbing', 'Сантехника', 'Instalații sanitare'),
('b2c3d4e5-6789-0123-4567-890123456789', 'renovation', 'Ремонт', 'Renovare'),
('c3d4e5f6-7890-1234-5678-901234567890', 'cleaning', 'Уборка', 'Curățenie'),
('d4e5f6a7-8901-2345-6789-012345678901', 'transport', 'Транспорт', 'Transport')
ON CONFLICT (id) DO UPDATE SET 
  label_ru = EXCLUDED.label_ru,
  label_ro = EXCLUDED.label_ro;

-- Now add the foreign key constraint
ALTER TABLE public.jobs 
ADD CONSTRAINT jobs_category_id_fkey 
FOREIGN KEY (category_id) REFERENCES public.categories(id);