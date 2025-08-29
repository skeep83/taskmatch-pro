-- Insert missing profile for the user
INSERT INTO public.profiles (id) 
VALUES ('d3117828-1618-4c73-aee1-5968538d95d0')
ON CONFLICT (id) DO NOTHING;

-- Now add the foreign key constraints
ALTER TABLE public.jobs 
ADD CONSTRAINT jobs_pro_id_fkey 
FOREIGN KEY (pro_id) REFERENCES public.profiles(id);

ALTER TABLE public.jobs 
ADD CONSTRAINT jobs_client_id_fkey 
FOREIGN KEY (client_id) REFERENCES public.profiles(id);