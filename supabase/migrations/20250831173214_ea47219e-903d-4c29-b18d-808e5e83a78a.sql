-- Add foreign key relationship between pro_profiles and profiles
ALTER TABLE public.pro_profiles 
ADD CONSTRAINT fk_pro_profiles_user_id 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;