-- Make sure the specific category exists
INSERT INTO public.categories (id, key, label_ru, label_ro) VALUES
('b131ec56-3326-4929-9622-c2a04864f379', 'electrical_new', 'Электрика', 'Electricitate')
ON CONFLICT (key) DO UPDATE SET 
  id = 'b131ec56-3326-4929-9622-c2a04864f379',
  label_ru = EXCLUDED.label_ru,
  label_ro = EXCLUDED.label_ro;

-- Try adding foreign key constraint
ALTER TABLE public.jobs 
ADD CONSTRAINT jobs_category_id_fkey 
FOREIGN KEY (category_id) REFERENCES public.categories(id);