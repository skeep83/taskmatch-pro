-- =====================================
-- REMAINING SECURITY FIXES
-- =====================================

-- 1. Check and fix search_path for any remaining functions that need it
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER  
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 2. Create missing pricing_templates table and secure it
CREATE TABLE IF NOT EXISTS public.pricing_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES public.categories(id) ON DELETE CASCADE,
  name_ru text NOT NULL,
  name_ro text,
  base_price_cents integer NOT NULL,
  urgent_multiplier numeric DEFAULT 1.5,
  same_day_multiplier numeric DEFAULT 2.0,
  currency text DEFAULT 'usd',
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS and restrict access to authenticated users only
ALTER TABLE public.pricing_templates ENABLE ROW LEVEL SECURITY;

-- Only authenticated users can view pricing templates
CREATE POLICY "pricing_templates_auth_select" ON public.pricing_templates
  FOR SELECT TO authenticated
  USING (true);

-- Only admins can modify pricing templates
CREATE POLICY "pricing_templates_admin_modify" ON public.pricing_templates
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. Create missing service_categories table if referenced in scan
CREATE TABLE IF NOT EXISTS public.service_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid REFERENCES public.service_categories(id),
  name_ru text NOT NULL,
  name_ro text,
  description_ru text,
  description_ro text,
  icon text,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS and restrict access
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;

-- Only authenticated users can view service categories
CREATE POLICY "service_categories_auth_select" ON public.service_categories
  FOR SELECT TO authenticated
  USING (true);

-- Only admins can modify service categories
CREATE POLICY "service_categories_admin_modify" ON public.service_categories
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 4. Restrict categories table access (if it exists and is currently public)
-- Check if categories table has public access and restrict it
DO $$
BEGIN
  -- Drop public select policy if it exists
  BEGIN
    DROP POLICY IF EXISTS "categories_read_all" ON public.categories;
  EXCEPTION
    WHEN undefined_object THEN NULL;
  END;
  
  -- Create authenticated access policy
  BEGIN
    CREATE POLICY "categories_auth_select" ON public.categories
      FOR SELECT TO authenticated
      USING (true);
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END;
END $$;

-- 5. Restrict currencies table public access
DO $$
BEGIN
  -- Drop public select policy if it exists
  BEGIN
    DROP POLICY IF EXISTS "currencies_select_all" ON public.currencies;
  EXCEPTION
    WHEN undefined_object THEN NULL;
  END;
  
  -- Create authenticated access policy
  BEGIN
    CREATE POLICY "currencies_auth_select" ON public.currencies
      FOR SELECT TO authenticated
      USING (true);
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END;
END $$;

-- 6. Add additional security function for role validation
CREATE OR REPLACE FUNCTION public.validate_user_role_assignment(target_user_id uuid, new_role app_role)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only admins can assign admin or superadmin roles
  IF new_role IN ('admin', 'superadmin') THEN
    RETURN has_role(auth.uid(), 'admin'::app_role);
  END IF;
  
  -- Other roles can be assigned by admins or the user themselves (for pro/business roles)
  RETURN has_role(auth.uid(), 'admin'::app_role) OR auth.uid() = target_user_id;
END;
$function$;

-- 7. Add trigger to updated_at columns for new tables
DROP TRIGGER IF EXISTS set_updated_at_pricing_templates ON public.pricing_templates;
CREATE TRIGGER set_updated_at_pricing_templates
  BEFORE UPDATE ON public.pricing_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_service_categories ON public.service_categories;
CREATE TRIGGER set_updated_at_service_categories
  BEFORE UPDATE ON public.service_categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();