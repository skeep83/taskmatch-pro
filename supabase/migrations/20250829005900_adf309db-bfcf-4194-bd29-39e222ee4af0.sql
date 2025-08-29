-- Add foreign key constraint for job_applications.pro_id to profiles.id
ALTER TABLE public.job_applications 
ADD CONSTRAINT job_applications_pro_id_fkey 
FOREIGN KEY (pro_id) REFERENCES public.profiles(id);

-- Also add foreign key for job_applications.job_id to jobs.id if not exists
ALTER TABLE public.job_applications 
ADD CONSTRAINT job_applications_job_id_fkey 
FOREIGN KEY (job_id) REFERENCES public.jobs(id);