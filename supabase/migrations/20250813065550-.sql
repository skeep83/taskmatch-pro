-- Commit enum additions first in a separate transaction
DO $$ BEGIN
  BEGIN
    ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'superadmin';
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'ops';
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'kyc';
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'finance';
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'dispute_manager';
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'content';
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'risk';
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'city_manager';
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'tender';
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;