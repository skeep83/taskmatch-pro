-- Add missing electrical category if not exists
INSERT INTO public.categories (id, key, label_ru, label_ro) 
VALUES ('b131ec56-3326-4929-9622-c2a04864f379', 'electrical_work', 'Электрика', 'Electricitate')
ON CONFLICT (key) DO NOTHING;

-- Add foreign key constraint
ALTER TABLE public.jobs 
ADD CONSTRAINT jobs_category_id_fkey 
FOREIGN KEY (category_id) REFERENCES public.categories(id);