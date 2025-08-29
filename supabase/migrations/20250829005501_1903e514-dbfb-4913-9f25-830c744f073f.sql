-- Add foreign key relationship between jobs.pro_id and profiles.id
ALTER TABLE public.jobs 
ADD CONSTRAINT jobs_pro_id_fkey 
FOREIGN KEY (pro_id) REFERENCES public.profiles(id);

-- Also ensure client_id foreign key exists
ALTER TABLE public.jobs 
ADD CONSTRAINT jobs_client_id_fkey 
FOREIGN KEY (client_id) REFERENCES public.profiles(id);