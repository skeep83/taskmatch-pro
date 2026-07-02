DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'jobs' AND column_name = 'location_precision'
  ) THEN
    ALTER TABLE public.jobs ADD COLUMN location_precision TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'jobs' AND column_name = 'location_source'
  ) THEN
    ALTER TABLE public.jobs ADD COLUMN location_source TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'jobs' AND column_name = 'location_public_label'
  ) THEN
    ALTER TABLE public.jobs ADD COLUMN location_public_label TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'pro_services' AND column_name = 'service_mode'
  ) THEN
    ALTER TABLE public.pro_services ADD COLUMN service_mode TEXT DEFAULT 'onsite';
  END IF;
END $$;

DO $$
BEGIN
  ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_location_precision_check;
  ALTER TABLE public.jobs ADD CONSTRAINT jobs_location_precision_check CHECK (location_precision IN ('exact','street','district','city') OR location_precision IS NULL);

  ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_location_source_check;
  ALTER TABLE public.jobs ADD CONSTRAINT jobs_location_source_check CHECK (location_source IN ('device_gps','address_geocode','manual_pin','profile_default') OR location_source IS NULL);

  ALTER TABLE public.pro_services DROP CONSTRAINT IF EXISTS pro_services_service_mode_check;
  ALTER TABLE public.pro_services ADD CONSTRAINT pro_services_service_mode_check CHECK (service_mode IN ('onsite','remote','both') OR service_mode IS NULL);
END $$;