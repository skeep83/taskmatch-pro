-- Enable RLS on categories table and add policies
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read categories
CREATE POLICY "categories_public_select" ON public.categories
FOR SELECT USING (true);

-- Only admins can modify categories
CREATE POLICY "categories_admin_modify" ON public.categories
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));